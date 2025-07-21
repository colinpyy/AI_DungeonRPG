const { app, BrowserWindow, ipcMain, net } = require('electron');
const path = require('path');
const fs = require('fs');
// 1. 使用 app.isPackaged，这是最可靠的判断方式
const isPackaged = app.isPackaged;
const isDev = !app.isPackaged;

const envPath = isPackaged
  ? path.join(process.resourcesPath, '.env')
  : path.join(__dirname, '.env');

console.log(`[INFO] Attempting to load .env file from: ${envPath}`);

// 3. 检查文件是否存在，并加载
if (fs.existsSync(envPath)) {
  require('dotenv').config({ path: envPath });
  console.log('[SUCCESS] .env file loaded successfully.');
} else {
  console.error(`[FATAL] .env file not found at the expected path: ${envPath}`);
}

const API_URL = process.env.API_URL;
const API_KEY = process.env.API_KEY;
const API_MODEL = process.env.API_MODEL || 'gemini-2.5-flash-preview-05-20'; // 提供默认值
const API_TEMP = parseFloat(process.env.API_TEMP) || 1.1; // 温度通常是浮点数
const API_TOPP = parseFloat(process.env.API_TOPP) || 0.99; // top_p 也是浮点数
const API_PRESENCE = parseFloat(process.env.API_PRESENCE) || 0;
const API_JSON_SCHEMA = process.env.API_JSON_SCHEMA === 'true'

if (!API_URL || !API_KEY || !API_MODEL || !API_TEMP || !API_TOPP) {
  console.error("错误：请确保在项目根目录的 .env 文件中正确配置了 API_URL、API_KEY、API_MODEL、API_TEMP、API_TOPP 。");
}

const savePath = path.join(app.getPath('userData'), 'saves');

// Ensure the save directory exists
if (!fs.existsSync(savePath)) {
  fs.mkdirSync(savePath, { recursive: true });
}

const MAX_SAVE_SLOTS = 6;
const SAVE_KEY_PREFIX = 'rpg_save_slot_';

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1491,
    height: 1029,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    resizable: true,
    show: false,
  });

  mainWindow.menuBarVisible = false
  mainWindow.setAspectRatio(71 / 49) // ✅ 锁定宽高比

  // 2. 监听 'ready-to-show' 事件
  mainWindow.once('ready-to-show', () => {
    // 3. 在这里进行初始缩放
    const [width] = mainWindow.getContentSize();
    const zoomFactor = width / 1491; // 1491 是你的设计宽度
    if (zoomFactor > 0.1 && Number.isFinite(zoomFactor)) {
      mainWindow.webContents.setZoomFactor(zoomFactor);
    }

    // 4. 一切就绪后，再显示窗口
    mainWindow.show();
  });

  mainWindow.on("resize", () => {
    // 处理运行时的缩放
    const [width] = mainWindow.getContentSize();
    const zoomFactor = width / 1491;
    if (zoomFactor > 0.1 && Number.isFinite(zoomFactor)) {
      mainWindow.webContents.setZoomFactor(zoomFactor);
    }
  })

  mainWindow.loadFile(path.join(__dirname, 'app/index.html'));


  // 打开开发者工具
  // mainWindow.webContents.openDevTools();
}

function getExtraResourcePath(relativePath) {
  // 如果是开发环境，则路径相对于项目根目录
  if (isDev) {
    return path.join(app.getAppPath(), relativePath);
  }

  // { "from": "app/data", "to": "data" }
  if (relativePath.startsWith('app/data')) {
    const newRelativePath = path.join('data', relativePath.substring('app/data/'.length));
    return path.join(process.resourcesPath, newRelativePath);
  }

  // { "from": ".env", "to": ".env" }
  if (relativePath === '.env') {
    return path.join(process.resourcesPath, '.env');
  }

  return path.join(app.getAppPath(), relativePath);
}

// 处理从渲染进程发来的文件读取请求
ipcMain.handle('read-file', (event, relativePath) => {
  // 使用新的辅助函数获取正确路径
  const absolutePath = getExtraResourcePath(relativePath);
  try {
    const data = fs.readFileSync(absolutePath, 'utf8');
    return data;
  } catch (error) {
    console.error(`[Error] Failed to read file: ${absolutePath}`, error);
    return null;
  }
});

// 处理获取资源文件绝对路径的请求
ipcMain.handle('get-asset-path', (event, relativePath) => {
  // 使用新的辅助函数获取正确路径
  const absolutePath = getExtraResourcePath(relativePath);
  return absolutePath;
});

// --- 新增：处理 API 请求 ---
ipcMain.handle('make-api-request', async (event, { options }, attempt) => {
  const url = API_URL;
  const token = API_KEY;

  // 1. 解析从渲染进程传来的 body 字符串
  const originalBody = JSON.parse(options.body);

  let patchedMessages = originalBody.messages;

  // 如果是 gemini 模型，则将 role 为 system 的改为 user
  if (/gemini/i.test(API_MODEL) && Array.isArray(originalBody.messages)) {
    patchedMessages = originalBody.messages.map(msg => {
      if (msg.role === 'system') {
        return { ...msg, role: 'user' };
      }
      return msg;
    });
  }

  // 如果是结构化输出且是第一次尝试，则打开json_schame
  if (attempt != 0 || !API_JSON_SCHEMA) {
    delete originalBody.response_format
  }

  // 2. 创建包含 .env 配置的新 body 对象
  const finalBody = {
    ...originalBody,
    messages: patchedMessages,
    model: API_MODEL,
    temperature: API_TEMP,
    top_p: API_TOPP,
    presence_penalty: API_PRESENCE,
  };

  // 3. 构建最终的请求选项
  const requestOptions = {
    method: options.method, // 'POST'
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json' // 确保 Content-Type 是 application/json
    },
    // 将合并后的对象转换回 JSON 字符串
    body: JSON.stringify(finalBody)
  };

  try {
    const request = net.request({
      method: requestOptions.method,
      url: url
    });

    // 设置请求头
    for (const header in requestOptions.headers) {
      request.setHeader(header, requestOptions.headers[header]);
    }

    // 发送请求体
    if (requestOptions.body) {
      request.write(requestOptions.body);
    }

    const response = await new Promise((resolve, reject) => {
      request.on('response', (response) => {
        let body = '';
        response.on('data', (chunk) => {
          body += chunk.toString();
        });
        response.on('end', () => {
          resolve({
            statusCode: response.statusCode,
            headers: response.headers,
            body: body,
          });
        });
        response.on('error', (error) => {
          reject(error);
        });
      });
      request.on('error', (error) => {
        reject(error);
      });
      request.end();
    });

    if (response.statusCode >= 200 && response.statusCode < 300) {
      return JSON.parse(response.body); // 假设返回的是 JSON
    } else {
      throw new Error(`HTTP error! Status: ${response.statusCode} Body: ${response.body}`);
    }

  } catch (error) {
    console.error('API request failed in main process:', error);
    // 将错误信息传递回渲染进程
    throw error;
  }
});

app.whenReady().then(() => {

  ipcMain.handle('get-save-files', async () => {
    const filesData = [];
    for (let i = -1; i < MAX_SAVE_SLOTS; i++) {
      const filePath = path.join(savePath, `${SAVE_KEY_PREFIX}${i}.json`);
      try {
        if (fs.existsSync(filePath)) {
          const fileContent = fs.readFileSync(filePath, 'utf-8');
          const data = JSON.parse(fileContent);
          // We only need metadata for the list, not the whole save file
          filesData.push({
            playername: data.playername,
            character: { name: data.character?.name, id: data.character.id },
            enemystatus: { degenerate: data.enemy.degenerate, bound: data.enemy.bound, cloth_wet: data.enemy.cloth_wet, cloth_break: data.enemy.cloth_break, HP: data.enemy.HP, monsters_defeat: data.enemy.monsters_defeat, climax_times: data.enemy.climax_times },
            timestamp: data.timestamp
          });
        } else {
          filesData.push(null); // Represents an empty slot
        }
      } catch (error) {
        console.error(`Error reading save slot ${i}:`, error);
        filesData.push(null); // Treat corrupted file as empty
      }
    }
    return filesData;
  });

  // Handler to save game data to a specific slot
  ipcMain.handle('save-game', async (event, slotIndex, gameData) => {
    const filePath = path.join(savePath, `${SAVE_KEY_PREFIX}${slotIndex}.json`);
    try {
      const dataStr = JSON.stringify(gameData, null, 2); // Pretty print JSON
      fs.writeFileSync(filePath, dataStr);
      return { success: true };
    } catch (error) {
      console.error(`Error saving game to slot ${slotIndex}:`, error);
      return { success: false, error: error.message };
    }
  });

  // Handler to load game data from a specific slot
  ipcMain.handle('load-game', async (event, slotIndex) => {
    const filePath = path.join(savePath, `${SAVE_KEY_PREFIX}${slotIndex}.json`);
    try {
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const gameData = JSON.parse(fileContent);
      return { success: true, data: gameData };
    } catch (error) {
      console.error(`Error loading game from slot ${slotIndex}:`, error);
      return { success: false, error: error.message };
    }
  });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});