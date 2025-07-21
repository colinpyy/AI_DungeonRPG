import * as ultis from './ultis.js'

let characters = {};
let character = {};
let selectedCharacter = null;
let enemy = {};
let fulllog = [];
const chatlog_org = [
  {
    "role": "assistant",
    "content": "{\"summary\":\"前情提要：在古老的阿莱瑟大陆上，圣光教会的势力遍布各个王国。这是一个魔法与信仰并存的世界，黑暗生物潜伏在深山密林中，而光明的使者们则肩负著守护平民的神圣使命。\\n圣修道女薇薇安完成了一项艰难的救援任务。三天前，村庄里一个名叫托米的七岁男孩在玩耍时误入了村庄北部的古老洞窟——那里曾是远古文明的遗迹，如今却成为了各种魔物的栖息地。村民们恐惧不已，却无人敢深入那危险的地下迷宫。\\n作为教会派遣到边境村庄的圣修道女，薇薇安义不容辞地接下了这个任务。她独自一人，手持圣光法杖，踏入了阴森的洞窟深处。经过两天一夜的搜寻和战斗，她终于在洞窟最深处找到了躲在角落里瑟瑟发抖的小托米。\\n使用了仅有的一枚传送水晶，薇薇安将孩子安全送回了村庄。然而，水晶的能量只够传送一个人，她只能选择让孩子先回去。现在，她必须独自面对回程的危险——那些被她之前的圣光魔法惊动的洞窟守护者们正在苏醒，而她的魔力也在之前的战斗中消耗了大半。\\n洞窟深处传来了低沉的咆哮声，薇薇安握紧了手中的法杖，银白色的修女袍在微弱的圣光中闪烁著圣洁的光芒。她必须在天黑之前离开这里，否则夜晚降临时，更恐怖的黑暗生物会从深渊中爬出...\"}"
  }
];
let chatlog = [];
let tmpenemylog = "薇薇安还未发现身边的异常。"
let tmpdamage = 0
const defaultAction = [
  {
    "name": "攻击",
    "description": "使用触手或肢体鞭打猎物造成了<span style=\"color: yellow;\">15</span>点<span style=\"color: red;\">HP</span>的伤害，具体打哪请在输入框中描述",
    "full_desc": "直接攻击薇薇安的身体造成了15点HP的伤害。",
    "effects": [
      {
        "side": "enemy",
        "source": "HP",
        "value": -15
      }
    ]
  },
  {
    "name": "观望",
    "description": "观望猎物现在的情景，具体请在输入框中描述",
    "full_desc": "停下观看着薇薇安现在的情景。",
    "effects": []
  }
];
let waitingEnemy = false;
let playername = "奥特莱斯";
let breakLimit = [];

// app/renderer.js

/*
 * 将一个相对路径或相对路径数组转换为Electron可以使用的绝对文件路径。
 * @param {string|string[]} paths - 单个路径字符串或路径字符串数组。
 * @returns {Promise<string|string[]|any>} - 转换后的绝对路径或路径数组，或原始输入。
 */
async function resolveAssetPaths(paths) {
  // 如果输入是空的或不是有效类型，直接返回
  if (!paths) {
    return paths;
  }

  // 检查输入是否为数组
  if (Array.isArray(paths)) {
    return Promise.all(paths.map(path => resolveAssetPaths(path)));
  }

  // 检查输入是否为字符串
  if (typeof paths === 'string') {
    const absolutePath = await window.electronAPI.getAssetPath(paths.startsWith('app/') ? paths : `app/${paths}`);
    return 'file://' + absolutePath;
  }

  return paths;
}
function backMainMenu() {
  document.getElementById("startMenu").style.display = "flex"
  document.getElementById("main-container").style.display = "none"
  document.getElementById("player-name-input").style.display = "none"
  document.getElementById("game-header").style.display = "none"
}

// 初始化角色系统
async function initCharacterSystem() {
  // 加载角色列表
  await loadCharacterList();
  document.getElementById("enemy-img2").style.display = 'none';
  document.getElementById("main-log2").innerHTML = ""
  tmpenemylog = "薇薇安还未发现身边的异常。"
  // 显示角色选择弹窗
  document.getElementById("startMenu").style.display = "none"
  document.getElementById("main-container").style.display = "block"
  document.getElementById("player-name-input").style.display = "block"
  document.getElementById("game-header").style.display = "block"
  showCharacterSelect();
}

async function initLoadCharacterSystem() {
  // 加载角色列表
  await loadCharacterList();
  openLoadModal();
}

// 加载角色列表
async function loadCharacterList() {
  try {
    // const response_enemy = await fetch('data/enemy.json');
    // enemy = await response_enemy.json();
    const enemyJson = await window.electronAPI.readFile('app/data/enemy.json');
    enemy = JSON.parse(enemyJson);
    replaceUserWildcard(enemy)

    // const response_character = await fetch('data/characters.json');
    // const characterList = await response_character.json();
    const characterListJson = await window.electronAPI.readFile('app/data/characters.json');
    const characterList = JSON.parse(characterListJson);

    // 加载每个角色的详细数据
    for (const charId of characterList) {
      // const charResponse = await fetch(`data/characters/${charId}.json`);
      // characters[charId] = await charResponse.json();
      const charJson = await window.electronAPI.readFile(`app/data/characters/${charId}.json`);
      characters[charId] = JSON.parse(charJson);
    }
    replaceUserWildcard(characters)
    for (const charId in characters) {
      const char = characters[charId];

      char.avatar = await resolveAssetPaths(char.avatar);
      char.bound_image = await resolveAssetPaths(char.bound_image);

      if (char.skills) {
        for (const skill of char.skills) {
          skill.image = await resolveAssetPaths(skill.image);
          skill.climax_image = await resolveAssetPaths(skill.climax_image);
        }
      }
    }
  } catch (error) {
    console.error('加载角色数据失败:', error);
  }
}

async function loadBreakLimit() {
  try {
    // const response_break = await fetch('data/break.json');
    // breakLimit = await response_break.json();
    const breakJson = await window.electronAPI.readFile('app/data/break.json');
    breakLimit = JSON.parse(breakJson);
    replaceUserWildcard(breakLimit)
  } catch (error) {
    console.error('加载破限数据失败:', error);
  }
}

// 显示角色选择弹窗
function showCharacterSelect() {
  const modal = document.getElementById('character-select-modal');
  const characterList = document.getElementById('character-list');

  // 清空现有列表
  characterList.innerHTML = '';

  // 添加角色卡片
  for (const [charId, charData] of Object.entries(characters)) {
    const isDefeated = enemy.monsters_defeat.includes(charId);

    const charCard = document.createElement('div');
    charCard.className = 'character-card';
    if (isDefeated) charCard.classList.add('defeated');
    charCard.dataset.charId = charId;
    charCard.innerHTML = `
      <img src="${charData.avatar}" alt="${charData.name}" class="character-avatar">
      <div class="character-name">${charData.name}</div>
      <div class="character-description">${charData.description || '暂无描述'}</div>
    `;

    // 仅为未战败角色添加点击事件
    if (!isDefeated) {
      charCard.addEventListener('click', () => selectCharacter(charId));
    }

    characterList.appendChild(charCard);
  }

  // 确认选择按钮
  document.getElementById('confirm-selection').addEventListener('click', confirmCharacterSelection);

  // 显示弹窗
  modal.style.display = 'block';
}


// 选择角色
function selectCharacter(charId) {
  // 移除之前的选择
  document.querySelectorAll('.character-card').forEach(card => {
    card.classList.remove('selected');
  });

  // 标记新选择
  document.querySelector(`.character-card[data-char-id="${charId}"]`).classList.add('selected');
  selectedCharacter = charId;
}

// 确认角色选择
function confirmCharacterSelection() {
  if (!selectedCharacter) {
    alert('请选择一个角色');
    return;
  }
  const inputElement = document.getElementById('player-name');
  if (inputElement.value === '') {
    alert('请输入角色名');
    return;
  }
  playername = inputElement.value
  const modal = document.getElementById('character-select-modal');
  modal.style.display = 'none';

  character = characters[selectedCharacter]
  // 初始化游戏使用选择的角色
  initGameWithCharacter();
}

//更新图片
async function updateCharacterImg() {
  document.getElementById("player-img").src = character.avatar
  if (enemy["bound"] > 0) {
    if (character?.bound_desc) {
      document.getElementById("enemy-img").src = character.bound_image + character.bound_image_number[Math.floor(Math.random() * character.bound_image_number.length)]
    } else {
      console.log("角色状态未清空！")
    }
  } else if (enemy["cloth_wet"]) {
    document.getElementById("enemy-img").src = await resolveAssetPaths("data/img/wet.png")
  } else if (enemy["cloth_break"]) {
    document.getElementById("enemy-img").src = await resolveAssetPaths("data/img/break.png")
  } else {
    let stageImgPath = "";
    switch (Math.floor(enemy["degenerate"] / 20)) {
      case 0:
        stageImgPath = "app/data/img/stage1.png"
        break;
      case 1:
        stageImgPath = "app/data/img/stage2.png"
        break;
      case 2:
        stageImgPath = "app/data/img/stage3.png"
        break;
      case 3:
        stageImgPath = "app/data/img/stage4.png"
        break;
      case 4:
        stageImgPath = "app/data/img/stage5.png"
        break;
      default:
        stageImgPath = "app/data/img/stage5.png"
    }
    document.getElementById("enemy-img").src = await resolveAssetPaths(stageImgPath);
  }
}

//初始化属性
function initGameWithCharacter() {
  loadBreakLimit();
  character["HP"] = character["maxHP"]
  if (enemy.monsters_defeat.length == 0) {
    enemy["HP"] = enemy["maxHP"]
    enemy["MP"] = enemy["maxMP"] - 120
    enemy["degenerate"] = 0
    enemy["climax_value"] = 0
    enemy["climax_times"] = 0
    let warppedmessage = playername + "在地牢深处远程召唤了魔物" + character.name + "。"
    const newmessage = document.createElement("p")
    newmessage.className = "playerlog"
    newmessage.innerHTML = warppedmessage
    document.getElementById("main-log2").appendChild(newmessage)
    document.getElementById("main-log").scrollTop = document.getElementById("main-log").scrollHeight
  } else {
    tmpenemylog = tmpenemylog + "终于战胜了敌人，薇薇安终于得到了喘息的机会，她点燃了篝火一边休息一边平复心情，" + (enemy.HP > enemy.maxHP - 50 ? '回满了HP值，' : '恢复了50点HP值，') + (enemy.MP > enemy.maxHP - 50 ? `回满了MP值，` : '恢复了50点HP值，') + "并降低了70点的高潮值和10点的堕落值。"
    enemy["HP"] = enemy["HP"] + 50 > enemy["maxHP"] ? enemy["maxHP"] : enemy["HP"] + 50
    enemy["MP"] = enemy["MP"] + 50 > enemy["maxMP"] ? enemy["maxMP"] : enemy["MP"] + 50
    enemy["degenerate"] = enemy["degenerate"] - 10 < 0 ? 0 : enemy["degenerate"] - 10
    enemy["climax_value"] = enemy["climax_value"] - 70 < 0 ? 0 : enemy["climax_value"] - 70
  }
  if (enemy.cloth_wet) {
    tmpenemylog = tmpenemylog + "她擦干身上的粘液换上了新的衣物，解除了湿润状态。"
  }
  if (enemy.cloth_break) {
    tmpenemylog = tmpenemylog + "她脱下破损的衣物换上了新的衣服，解除了破衣状态。"
  }
  if (enemy.pregnant) {
    tmpenemylog = tmpenemylog + "但薇薇安感觉刚才魔物在她腹中产下的卵让她的小腹明显隆起起来，可她对此无能为力。"
  }
  enemy["bound"] = 0
  enemy["cloth_break"] = false
  enemy["cloth_wet"] = false
  tmpenemylog = tmpenemylog + "这时" + playername + "从地牢深处远程召唤了魔物" + character.name + "潜伏在薇薇安身边。"
  console.log(tmpenemylog)
  updateCharacterImg()
  updateskills()
  updateStatusBox()
}

//更新技能卡
function updateskills() {
  const playerActions = document.getElementById("player-actions");

  // Clear existing content
  while (playerActions.firstChild) {
    playerActions.removeChild(playerActions.firstChild);
  }

  const cardall = character["skills"].length + 1
  let cardindex = 0

  // Process character skills
  character["skills"].forEach((item, index) => {
    const card = document.createElement("div");
    card.className = (item?.require == "not_bound" && enemy.bound > 0) ||
      (item?.require == "bounded" && enemy.bound <= 0) || (item?.require == "not_bound2" && enemy.bound < 0) || (item?.require == "almost_climax" && enemy.climax_value < 80) ? ((item.hasOwnProperty("sub_name")) ? "action-stack unusable" :
        "action-card unusable") : (item.hasOwnProperty("sub_name")) ? "action-stack" : "action-card";

    if (card.className === "action-card") {
      card.onclick = () => playerAction(index);
    }

    const angle = (Math.PI * 0.02 / cardall * cardindex - 0.01 * Math.PI) * 180
    const transY = (1 - Math.cos(Math.PI * 0.02 / cardall * cardindex - 0.01 * Math.PI)) * 50000
    cardindex += 1

    if (item.hasOwnProperty("sub_name")) {
      for (let i = item.sub_name.length - 1; i >= 0; i--) {
        const transX = (item.sub_name.length - 1) * 167 * (i / (item.sub_name.length - 1) - 0.5)
        const anglestack = (Math.PI * 0.01 / (item.sub_name.length - 1) * i - 0.005 * Math.PI) * 180
        const stackcard = document.createElement("div");
        stackcard.className = "stack-card";
        if (stackcard.className === "stack-card") {
          stackcard.onclick = () => playerAction(index, i);
        }
        stackcard.style.setProperty('--stack-rotation', `${angle}deg`);
        stackcard.style.setProperty('--stack-hover-rotation', `${anglestack}deg`);
        stackcard.style.setProperty('--stack-hover-x', `${transX}px`);
        stackcard.style.setProperty('--stack-hover-y', `-150px`);
        stackcard.style.setProperty('--stack-y', `${transY + i * 10}px`);

        const header = document.createElement("div");
        header.className = "card-header";
        header.textContent = item.sub_name[i];

        const content = document.createElement("div");
        content.className = "card-content";
        content.innerHTML = item.sub_description[i];

        stackcard.appendChild(header);
        stackcard.appendChild(content);
        card.appendChild(stackcard)
      }
      const stackcard = document.createElement("div");
      stackcard.className = "stack-card";
      stackcard.style.setProperty('--stack-rotation', `${angle}deg`);
      stackcard.style.setProperty('--stack-hover-rotation', `0deg`);
      stackcard.style.setProperty('--stack-hover-x', `0px`);
      stackcard.style.setProperty('--stack-hover-y', `0px`);
      stackcard.style.setProperty('--stack-y', `${transY}px`);

      const header = document.createElement("div");
      header.className = "card-header";
      header.textContent = item.name;

      const content = document.createElement("div");
      content.className = "card-content";
      content.innerHTML = item.description;

      stackcard.appendChild(header);
      stackcard.appendChild(content);
      card.appendChild(stackcard)
      playerActions.appendChild(card);
    } else {
      card.style.setProperty('--card-rotation', `${angle}deg`);
      card.style.setProperty('--card-y', `${transY}px`);

      const header = document.createElement("div");
      header.className = "card-header";
      header.textContent = item.name;

      const content = document.createElement("div");
      content.className = "card-content";
      content.innerHTML = item.description;

      card.appendChild(header);
      card.appendChild(content);
      playerActions.appendChild(card);
    }
  });

  // Process default actions
  defaultAction.forEach((item, index) => {
    const card = document.createElement("div");
    card.className = "action-card";
    card.onclick = () => playerAction(100 + index);

    const angle = `${(Math.PI * 0.02 / cardall * cardindex - 0.01 * Math.PI) * 180}deg`
    card.style.setProperty('--card-rotation', angle);
    const transY = `${(1 - Math.cos(Math.PI * 0.02 / cardall * cardindex - 0.01 * Math.PI)) * 50000}px`
    card.style.setProperty('--card-y', transY);
    cardindex += 1

    const header = document.createElement("div");
    header.className = "card-header";
    header.textContent = item.name;

    const content = document.createElement("div");
    content.className = "card-content";
    content.innerHTML = item.description;

    card.appendChild(header);
    card.appendChild(content);
    playerActions.appendChild(card);
  });
}

//更新状态栏
function updateStatusBox() {
  const activeStatus = Object.entries(ultis.statusToChinese)
    .filter(([key]) => {
      const value = enemy[key];
      return value === true || value >= 1;
    })
    .map(([_, name]) => {
      if (name == "束缚" && character.id == "succubus") {
        return "魅惑"
      }
      return name
    });
  document.getElementById("enemy-health-text").innerText = enemy["HP"].toString() + "/" + enemy["maxHP"].toString()
  document.getElementById("player-health-text").innerText = character["HP"].toString() + "/" + character["maxHP"].toString()
  document.getElementById("enemy-log").innerHTML = `<table>
            <tr>
              <td>❤️ 当前血量：</td>
              <td>${enemy.HP}/${enemy.maxHP}</td>
              <td>🖤 当前阶段：</td>
              <td>${Math.floor(enemy.degenerate / 20 + 1) == 6 ? "最终阶段" : ("第" + ultis.numToChinese[String(Math.floor(enemy.degenerate / 20 + 1))] + "阶段")}</td>
            </tr>
            <tr>
              <td>📚 当前法力值：</td>
              <td>${enemy.MP}/${enemy.maxMP}</td>
              <td>👹 击败数：</td>
              <td>${enemy.monsters_defeat.length}</td>
            </tr>
            <tr>
              <td>💫 当前状态：</td>
              <td>${activeStatus.length > 0 ? activeStatus.join('、') : '无'}</td>
              <td>💕 当前高潮度：</td>
              <td>${enemy.climax_value}/${enemy.maxclimax_value}</td>
            </tr>
            <tr>
              <td>👿 当前堕落值：</td>
              <td>${enemy.degenerate}/${enemy.maxdegenerate}</td>
              <td>💦 高潮次数：</td>
              <td>${enemy.climax_times}</td>
            </tr>
          </table>`
}

const MAX_SAVE_SLOTS = 6;

function openSaveModal() {
  const modal = document.getElementById('save-game-modal');
  const slotList = document.getElementById('save-slot-list');
  populateSlotList(slotList, 'save');
  modal.style.display = 'block';
}

function openLoadModal() {
  const modal = document.getElementById('load-game-modal');
  const slotList = document.getElementById('load-slot-list');
  populateSlotList(slotList, 'load');
  modal.style.display = 'block';
}

function closeModal(modalId) {
  document.getElementById(modalId).style.display = 'none';
}

async function populateSlotList(listElement, mode) {
  listElement.innerHTML = '<div class="spinner"></div>'; // Show a loading spinner

  try {
    // Call the function exposed in preload.js
    const savedSlots = await window.electronAPI.getSaveFiles();
    listElement.innerHTML = ''; // Clear spinner

    for (let i = -1; i < MAX_SAVE_SLOTS; i++) {
      const savedData = savedSlots[i + 1];
      const slotCard = document.createElement('div');
      slotCard.classList.add('save-slot-card');

      if (savedData) {
        let stageImgPath = "";
        if (savedData.enemystatus.cloth_wet) {
          stageImgPath = "data/img/wet.png"
        } else if (savedData.enemystatus.cloth_break) {
          stageImgPath = "data/img/break.png"
        } else {
          switch (Math.floor(savedData.enemystatus.degenerate / 20)) {
            case 0:
              stageImgPath = "app/data/img/stage1.png"
              break;
            case 1:
              stageImgPath = "app/data/img/stage2.png"
              break;
            case 2:
              stageImgPath = "app/data/img/stage3.png"
              break;
            case 3:
              stageImgPath = "app/data/img/stage4.png"
              break;
            case 4:
              stageImgPath = "app/data/img/stage5.png"
              break;
            default:
              stageImgPath = "app/data/img/stage5.png"
          }
        }
        const avatarSrc = await resolveAssetPaths(stageImgPath);
        // Slot has data
        slotCard.innerHTML = `
          <img src="${avatarSrc}" alt="Avatar" class="slot-avatar">
          ` +
          (i == -1 ? `
<span style="position: absolute; top: 20px; right: 20px; padding: 5px;">
AutoSave
</span>
`: "")
          + `
          <div class="slot-info">
            <div class="slot-player-name">${savedData.playername || '未知玩家'}</div>
            <div class="slot-character-name">角色: ${savedData.character?.name || '未知'}</div>
            <div class="slot-timestamp">${savedData.timestamp || '未知时间'}</div>
            <div class="slot-statebox">
              <table style="width:100%">
                <tr>
                  <td style="width:30%">✨薇薇安状态✨</td>
                </tr>
                <tr>
                  <td style="width:30%">❤️ 当前血量：${savedData.enemystatus.HP}</td>
                  <td>👹 击败数：${savedData.enemystatus.monsters_defeat.length}</td>
                </tr>
                <tr>
                  <td>👿 当前堕落值：${savedData.enemystatus.degenerate}</td>
                  <td>💦 高潮次数：${savedData.enemystatus.climax_times}</td>
                </tr>
              </table>
            </div>
          </div>
        `;
        slotCard.onclick = (mode === 'save') ? ((i == -1) ? null : () => saveGameToSlot(i)) : () => loadGameFromSlot(i);
      } else {
        // Slot is empty
        slotCard.classList.add('empty-slot');
        if (mode === 'load' && i < 0) {
          slotCard.classList.add('load-mode'); // Makes it unclickable via CSS
        }
        if (i >= 0) {
          slotCard.innerHTML = `<div class="slot-info">[ 空槽位 ${i + 1} ]</div>`;
        } else {
          slotCard.innerHTML = `<div class="slot-info">[ AutoSave槽位 ]</div>`;
        }
        if (mode === 'save' && i >= 0) {
          slotCard.onclick = () => saveGameToSlot(i);
        }
      }
      listElement.appendChild(slotCard);
    }
  } catch (error) {
    console.error('Failed to populate save slots:', error);
    listElement.innerHTML = '<p style="color: red;">无法加载存档列表。</p>';
  }
}

async function saveGameToSlot(slotIndex) {
  // Confirmation for overwriting
  const savedSlots = await window.electronAPI.getSaveFiles();
  if (savedSlots[slotIndex + 1]) {
    if (!confirm(`存档槽位 ${slotIndex + 1} 已有数据，确定要覆盖吗？`)) {
      return;
    }
  }

  // Collect game data
  const gameData = {
    playername: playername,
    tmpenemylog: tmpenemylog,
    fulllog: fulllog,
    enemy: enemy,
    character: character,
    timestamp: new Date().toLocaleString('zh-CN'),
  };

  try {
    const result = await window.electronAPI.saveGame(slotIndex, gameData);
    if (result.success) {
      alert(`游戏已成功保存到槽位 ${slotIndex + 1}！`);
      closeModal('save-game-modal');
    } else {
      throw new Error(result.error);
    }
  } catch (error) {
    console.error("保存失败:", error);
    alert(`保存失败: ${error.message}`);
  }
}

async function autosaveGameToSlot() {
  const gameData = {
    playername: playername,
    tmpenemylog: tmpenemylog,
    fulllog: fulllog,
    enemy: enemy,
    character: character,
    timestamp: new Date().toLocaleString('zh-CN'),
  };
  const result = await window.electronAPI.saveGame(-1, gameData);
}

async function loadGameFromSlot(slotIndex) {
  if (slotIndex >= 0) {
    if (!confirm(`确定要从槽位 ${slotIndex + 1} 加载游戏吗？当前进度将不会被保存。`)) {
      return;
    }
  }

  try {
    const result = await window.electronAPI.loadGame(slotIndex);
    if (!result.success) {
      throw new Error(result.error);
    }

    const loadedData = result.data;

    // Restore game state
    tmpenemylog = loadedData.tmpenemylog;
    playername = loadedData.playername;
    fulllog = loadedData.fulllog;
    enemy = loadedData.enemy;
    character = loadedData.character;

    console.log("游戏数据已从文件加载:", loadedData);
    alert(`游戏数据已成功加载！`);

    // Close modals and show game screen
    closeModal('load-game-modal');
    document.getElementById("startMenu").style.display = "none";
    document.getElementById("main-container").style.display = "block";
    document.getElementById("main-log2").innerHTML = '';

    // --- Call your UI update functions (same as before) ---
    await loadBreakLimit();
    updateCharacterImg();
    updateskills();
    updateStatusBox();
    loadchatlog();

    document.getElementById("enemy-img2").style.display = 'none';
    let warppedmessage = tmpenemylog.replace(/"([^"]+)"/g, '<span style="color: orange;">"$1"</span>').replace(/“([^“”]+)”/g, '<span style="color: orange;">“$1”</span>').replace(/薇薇安/g, "<span style=\"color: yellow;\">$&</span>").replace(/\d+/g, "<span style=\"color: yellow;\">$&</span>").replace(/法力/g, "点<span style=\"color: blue;\">$&</span>").replace(/HP/g, "<span style=\"color: red;\">HP</span>").replace(/堕落[值度]/g, "<span style=\"color: purple;\">$&</span>").replace(/高潮[值度]/g, "<span style=\"color: deeppink;\">$&</span>").replace(/束缚|妊娠|魅惑/g, "<span style=\"color: white;\">$&</span>").replace(/\n+/g, "<br>").replace(/\*\*\*([^\n]{1,100}?)\*\*\*/g, '<span style="font-weight: bold; font-style: italic;">$1</span>').replace(/\*\*([^\n]{1,100}?)\*\*/g, '<span style="font-weight: bold;">$1</span>').replace(/\*(?!\*)([^\n]{1,100}?)\*/g, '<span style="font-style: italic;">$1</span>');
    const newmessage = document.createElement("p");
    newmessage.className = "playerlog";
    newmessage.innerHTML = warppedmessage;
    document.getElementById("main-log2").appendChild(newmessage);
    document.getElementById("main-log").scrollTop = document.getElementById("main-log").scrollHeight;

  } catch (error) {
    console.error("加载存档时出错:", error);
    alert(`加载失败: ${error.message}`);
  }
}


// // 保存（下载）游戏数据为 JSON 文件
// function saveData() {
//   const gameData = {
//     playername: playername,
//     tmpenemylog: tmpenemylog,
//     fulllog: fulllog,
//     enemy: enemy,
//     character: character
//   };
//   const dataStr = JSON.stringify(gameData, null, 2)  // 格式化JSON更方便查看
//   const blob = new Blob([dataStr], { type: "application/json" })
//   const url = URL.createObjectURL(blob)

//   const a = document.createElement("a")
//   a.href = url;
//   a.download = "game_save.json"
//   a.click();

//   URL.revokeObjectURL(url);  // 清理URL对象
// }

// // 加载（上传）游戏数据
// function loadData() {
//   const fileInput = document.getElementById("fileInput");

//   fileInput.onchange = (event) => {
//     const file = event.target.files[0]
//     if (!file) return;

//     const reader = new FileReader()
//     reader.onload = (e) => {
//       try {
//         const loadedData = JSON.parse(e.target.result);
//         tmpenemylog = loadedData.tmpenemylog;
//         playername = loadedData.playername;
//         fulllog = loadedData.fulllog;
//         enemy = loadedData.enemy;
//         character = loadedData.character;  // 替换当前游戏数据
//         console.log("Game data loaded:");
//         alert("游戏数据已成功加载！");
//         updateCharacterImg()
//         updateskills()
//         updateStatusBox()
//         loadchatlog()
//         document.getElementById("startMenu").style.display = "none"
//         document.getElementById("main-container").style.display = "block"
//         document.getElementById("enemy-img2").style.display = 'none'
//         let warppedmessage = tmpenemylog.replace(/"([^"]+)"/g, '<span style="color: orange;">"$1"</span>').replace(/“([^“”]+)”/g, '<span style="color: orange;">“$1”</span>').replace(/薇薇安/g, "<span style=\"color: yellow;\">$&</span>").replace(/\d+/g, "<span style=\"color: yellow;\">$&</span>").replace(/法力/g, "点<span style=\"color: blue;\">$&</span>").replace(/HP/g, "<span style=\"color: red;\">HP</span>").replace(/堕落[值度]/g, "<span style=\"color: purple;\">$&</span>").replace(/高潮[值度]/g, "<span style=\"color: deeppink;\">$&</span>").replace(/束缚|妊娠|魅惑/g, "<span style=\"color: white;\">$&</span>").replace(/\n+/g, "<br>");
//         const newmessage = document.createElement("p")
//         newmessage.className = "playerlog"
//         newmessage.innerHTML = warppedmessage
//         document.getElementById("main-log2").appendChild(newmessage)
//         document.getElementById("main-log").scrollTop = document.getElementById("main-log").scrollHeight
//       } catch (err) {
//         alert("加载失败：JSON 文件格式错误");
//       }
//     };
//     reader.readAsText(file);
//   };
//   fileInput.click(); // 触发隐藏的文件选择器
// }

function loadchatlog() {
  chatlog = [...chatlog_org]
  document.getElementById("main-log2").innerHTML = "";
  fulllog.forEach((log) => {
    if (log.name == "player") {
      pushplayerlog(log.message.content)
    } else {
      pushenemylog(log.message)
    }
  })
}

function pushplayerlog() {
  let warppedmessage
  if (arguments.length === 1) {
    chatlog.push({ "role": "user", "content": arguments[0] })
    warppedmessage = arguments[0].replace(/"([^"]+)"/g, '<span style="color: orange;">"$1"</span>').replace(/“([^“”]+)”/g, '<span style="color: orange;">“$1”</span>').replace(/薇薇安/g, "<span style=\"color: yellow;\">$&</span>").replace(/\d+/g, "<span style=\"color: yellow;\">$&</span>").replace(/法力/g, "<span style=\"color: blue;\">$&</span>").replace(/HP/g, "<span style=\"color: red;\">HP</span>").replace(/堕落[值度]/g, "<span style=\"color: purple;\">$&</span>").replace(/高潮[值度]/g, "<span style=\"color: deeppink;\">$&</span>").replace(/束缚|妊娠|魅惑/g, "<span style=\"color: white;\">$&</span>").replace(/\n+/g, "<br>").replace(/\*\*\*([^\n]{1,100}?)\*\*\*/g, '<span style="font-weight: bold; font-style: italic;">$1</span>').replace(/\*\*([^\n]{1,100}?)\*\*/g, '<span style="font-weight: bold;">$1</span>').replace(/\*(?!\*)([^\n]{1,100}?)\*/g, '<span style="font-style: italic;">$1</span>');
  } else {
    chatlog.push({ "role": "user", "content": arguments[0] + "\n" + arguments[1] })
    warppedmessage = arguments[1].replace(/"([^"]+)"/g, '<span style="color: orange;">"$1"</span>').replace(/“([^“”]+)”/g, '<span style="color: orange;">“$1”</span>').replace(/薇薇安/g, "<span style=\"color: yellow;\">$&</span>").replace(/\d+/g, "<span style=\"color: yellow;\">$&</span>").replace(/法力/g, "点<span style=\"color: blue;\">$&</span>").replace(/HP/g, "<span style=\"color: red;\">HP</span>").replace(/堕落[值度]/g, "<span style=\"color: purple;\">$&</span>").replace(/高潮[值度]/g, "<span style=\"color: deeppink;\">$&</span>").replace(/束缚|妊娠|魅惑/g, "<span style=\"color: white;\">$&</span>").replace(/\n+/g, "<br>").replace(/\*\*\*([^\n]{1,100}?)\*\*\*/g, '<span style="font-weight: bold; font-style: italic;">$1</span>').replace(/\*\*([^\n]{1,100}?)\*\*/g, '<span style="font-weight: bold;">$1</span>').replace(/\*(?!\*)([^\n]{1,100}?)\*/g, '<span style="font-style: italic;">$1</span>');
  }
  const newmessage = document.createElement("p")
  newmessage.className = "playerlog"
  newmessage.innerHTML = warppedmessage
  document.getElementById("main-log2").appendChild(newmessage)
  document.getElementById("main-log").scrollTop = document.getElementById("main-log").scrollHeight
}

function pushenemylog(enemymessage) {
  let { think, roleplay, roast, skill, ...partenemylog } = enemymessage
  let strpartenemylog = JSON.stringify(partenemylog)
  chatlog.push({ "role": "assistant", "content": strpartenemylog })
  let warppedmessage = enemymessage.roleplay.replace(/"([^"]+)"/g, '<span style="color: orange;">"$1"</span>').replace(/“([^“”]+)”/g, '<span style="color: orange;">“$1”</span>').replace(/薇薇安/g, "<span style=\"color: yellow;\">$&</span>").replace(/\d+/g, "<span style=\"color: yellow;\">$&</span>").replace(/法力/g, "点<span style=\"color: blue;\">$&</span>").replace(/HP/g, "<span style=\"color: red;\">HP</span>").replace(/堕落[值度]/g, "<span style=\"color: purple;\">$&</span>").replace(/高潮[值度]/g, "<span style=\"color: deeppink;\">$&</span>").replace(/束缚|妊娠|魅惑/g, "<span style=\"color: white;\">$&</span>").replace(/\n+/g, "<br>").replace(/\*\*\*([^\n]{1,100}?)\*\*\*/g, '<span style="font-weight: bold; font-style: italic;">$1</span>').replace(/\*\*([^\n]{1,100}?)\*\*/g, '<span style="font-weight: bold;">$1</span>').replace(/\*(?!\*)([^\n]{1,100}?)\*/g, '<span style="font-style: italic;">$1</span>');
  const newmessage = document.createElement("p")
  newmessage.className = "enemylog"
  newmessage.innerHTML = warppedmessage
  newmessage.dataset.tooltip = "💕戏剧之主Alastor💕：" + enemymessage.roast
  document.getElementById("main-log2").appendChild(newmessage)
  document.getElementById("main-log").scrollTop = document.getElementById("main-log").scrollHeight
}

async function playerAction(skillId, subskillId = -1) {
  if (waitingEnemy) return
  waitingEnemy = true;
  await autosaveGameToSlot()
  document.getElementById("overlay").style.display = "flex"
  let selectedskill = skillId < 100 ? character.skills[skillId] : defaultAction[skillId - 100];
  let subskillflag = selectedskill.hasOwnProperty("sub_name")
  let infotext = "\n" + playername + "远程通过精神指示" + character.name.replace(/\(.*\)/g, "") + (subskillflag ? selectedskill.full_desc[subskillId] : selectedskill.full_desc);
  const inputElement = document.getElementById("strategyPrompt");
  const inputtext = inputElement.value;
  inputElement.value = "";
  selectedskill.effects.forEach(effect => {
    if (effect.side === "enemy") {
      const key = effect.source;
      //如果存在对应名称的值且值为数字
      if (enemy.hasOwnProperty(key) && typeof enemy[key] === 'number' && key == "HP" && enemy.invincible != 0) {
        enemy["invincible"] -= 1
        infotext = infotext + "薇薇安通过信仰屏障抵御了这次攻击的HP伤害。"
      } else if (enemy.hasOwnProperty(key) && typeof enemy[key] === 'number') {
        const newValue = effect.value + enemy[key]
        enemy[key] = newValue < 0 ? 0 : newValue
        if (ultis.maxName.hasOwnProperty(key)) enemy[key] = enemy[key] < enemy[ultis.maxName[key]] ? enemy[key] : enemy[ultis.maxName[key]]
        if (enemy[key] == "HP" && effect.value < 0) tmpdamage += effect.value
        if (tmpdamage >= 50) enemy.cloth_break = true
      } else {
        // 如果属性不存在或者不是数字，直接赋值
        enemy[key] = effect.value
      }
    } else if (effect.side === "player") {
      const key = effect.source;
      //如果存在对应名称的值且值为数字
      if (character.hasOwnProperty(key) && typeof character[key] === 'number') {
        const newValue = effect.value + character[key]
        character[key] = newValue < 0 ? 0 : newValue
        if (ultis.maxName.hasOwnProperty(key)) character[key] = character[key] < character[ultis.maxName[key]] ? character[key] : character[ultis.maxName[key]]
      } else {
        // 如果属性不存在或者不是数字，直接赋值
        character[key] = effect.value
      }
    }
  })
  let climaxflag = 0;
  if (enemy.climax_value >= 100) {
    infotext = infotext + "薇薇安高潮值积攒到了100，到达了高潮！增加了15点堕落值。"
    if (enemy.pregnant) {
      infotext = infotext + "于此同时她腹中的卵也孵化了出来，在她潮吹的同时，一只触手怪幼体从她的小穴中钻了出来，将她的高潮推向了更高点。"
      const tentacle_index = enemy.monsters_defeat.indexOf("tentacle")
      if (tentacle_index !== -1) {
        enemy.monsters_defeat.splice(tentacle_index, 1)
        infotext = infotext + "原本已被击败的触手怪回到了地牢。"
      }
    }
    if (character.id == "ghost") {
      infotext = infotext + "幽灵之手吸收了薇薇安的快感能量恢复了15点HP值"
      character.HP += 15
    }
    enemy.pregnant = false
    enemy.climax_times += 1
    enemy.degenerate += 15
    if (enemy.degenerate > enemy.maxdegenerate) enemy.degenerate = 100
    climaxflag = 1
  }
  updateskills()
  const enemyskillimg = document.getElementById("enemy-img2")
  if (climaxflag == 1 && character.id == "facehugger") {
    enemyskillimg.src = resolveAssetPaths("data/img/" + character["id"] + "/climax/" + Math.floor(Math.random() * 4).toString() + ".png")
    enemyskillimg.style.display = ''
  } else if (climaxflag == 1 && character.id == "succubus" && Array.isArray(character.skills[skillId]?.image)) {
    enemyskillimg.src = character.skills[skillId].climax_image[subskillId] + character.skills[skillId].climax_image_number[subskillId][Math.floor(Math.random() * character.skills[skillId].climax_image_number[subskillId].length)]
    enemyskillimg.style.display = ''
  } else if (Array.isArray(character.skills[skillId]?.image)) {
    enemyskillimg.src = character.skills[skillId].image[subskillId] + character.skills[skillId].image_number[subskillId][Math.floor(Math.random() * character.skills[skillId].image_number[subskillId].length)]
    enemyskillimg.style.display = ''
  } else if (character.skills[skillId]?.image) {
    enemyskillimg.src = character.skills[skillId].image + character.skills[skillId].image_number[Math.floor(Math.random() * character.skills[skillId].image_number.length)]
    enemyskillimg.style.display = ''
  } else {
    enemyskillimg.style.display = 'none'
  }
  updateCharacterImg()
  updateStatusBox()
  let currentlog1 = tmpenemylog
  let currentlog2 = inputtext + infotext
  await enemyTurn(currentlog1, currentlog2)
  waitingEnemy = false;
  document.getElementById("overlay").style.display = "none"
}

async function enemyTurn(currentlog1, currentlog2) {
  const fullchatlog = chatlogpretreat(currentlog1, currentlog2)
  let endingflag = 0;
  endingflag = (enemy.degenerate == 100) ? 7 : 0
  if (enemy.monsters_defeat.length >= 4) endingflag = enemy.degenerate < 20 ? 1 : enemy.degenerate < 40 ? 2 : enemy.degenerate < 60 ? 3 : enemy.degenerate < 80 ? 4 : enemy.degenerate < 100 ? 5 : 6
  if (enemy.HP <= 0) endingflag = 8
  let skilllistflag = ((enemy.climax_value >= 100 || endingflag != 0) ? 3 : (enemy.degenerate > 80 ? (enemy.bound > 0 ? 2 : (enemy.MP < 10 ? 1 : 0)) : (enemy.bound > 0 ? 6 : (enemy.MP < 10 ? 5 : 4))))
  const fullchatlogjson = {
    "messages": fullchatlog,
    "model": "gemini-2.5-flash-preview-05-20",
    "response_format": {
      "type": "json_schema",
      "json_schema": {
        "name": "rpg",
        "strict": true,
        "schema": {
          "type": "object",
          "properties": {
            "think": {
              "type": "string"
            },
            "roleplay": {
              "type": "string"
            },
            "skill": {
              "type": "string",
              "enum": ultis.skilllist[skilllistflag]
            },
            "summary": {
              "type": "string"
            },
            "roast": {
              "type": "string"
            }
          },
          "required": ["think", "roleplay", "skill", "summary", "roast"],
          "additionalProperties": false
        }
      }
    },
    "temperature": 1.1,
    "max_tokens": 8192,
    "stream": false,
    "presence_penalty": 0,
    "top_p": 0.99
  }
  let aireturn;
  try {
    aireturn = await retryableFunction((attempt) => getAIResponse(fullchatlogjson, attempt), 3, 1000)
  } catch (e) {
    const newmessage = document.createElement("p")
    newmessage.className = "playerlog"
    newmessage.innerHTML = "<span style=\"color: orange;\">api请求失败或解析失败3次，请保存存档重新加载后再次尝试</span>"
    document.getElementById("main-log2").appendChild(newmessage)
    document.getElementById("main-log").scrollTop = document.getElementById("main-log").scrollHeight
    console.error(e)
    return
  }
  tmpenemylog = ""
  const skillId = enemy.skills.findIndex(item => item.name === aireturn.skill)
  let climaxflag = enemy.climax_value >= 100
  if (climaxflag) {
    enemy.climax_value = 0
  }
  if (enemy.bound > 0) {
    enemy.bound -= 1
    if (enemy.bound > 0) {
      if (character.id == "succubus") {
        tmpenemylog = tmpenemylog + "薇薇安受到魅惑无法行动，魅惑给她带来了15点的快感值。"
      }
      else {
        tmpenemylog = tmpenemylog + "薇薇安受到束缚无法行动，持续的束缚给她带来了15点的快感值。"
      }
      if (character.id == "spider") {
        if (enemy.bound == 6) {
          tmpenemylog = tmpenemylog + `当前束缚层数到达${enemy.bound}层，薇薇安彻底失去逃离的机会沦为蛛矶的食物。`
          enemy.HP = 0
        } else {
          tmpenemylog = tmpenemylog + `当前束缚层数${enemy.bound}层，叠满6层时将彻底成为蛛矶的食物。`
        }
      }
    } else {
      if (character.id == "succubus") {
        tmpenemylog = tmpenemylog + "薇薇安再次受到魅惑状态给她带来了15点的快感值后状态终于自己解除了。"
      }
      else {
        tmpenemylog = tmpenemylog + "薇薇安再次受到束缚状态给她带来了15点的快感值后束缚终于自己解除了。"
      }
    }
    const newValue = 15 + enemy.climax_value
    enemy.climax_value = newValue < 0 ? 0 : newValue
    enemy.climax_value = newValue > enemy.maxclimax_value ? enemy.maxclimax_value : newValue
  } else if (enemy.bound < 0) {
    enemy.bound = 0
  }
  if (skillId != -1) {
    enemy.skills[skillId].effects.forEach(effect => {
      if (effect.side === "enemy") {
        const key = effect.source;
        //如果存在对应名称的值且值为数字
        if (enemy.hasOwnProperty(key) && typeof enemy[key] === 'number' && key == "HP" && enemy.invincible != 0 && effect.value < 0) {
          enemy.invincible -= 1
        } else if (enemy.hasOwnProperty(key) && typeof enemy[key] === 'number') {
          const newValue = effect.value + enemy[key]
          enemy[key] = newValue < 0 ? 0 : newValue
          if (ultis.maxName.hasOwnProperty(key)) enemy[key] = enemy[key] < enemy[ultis.maxName[key]] ? enemy[key] : enemy[ultis.maxName[key]]
        } else {
          // 如果属性不存在或者不是数字，直接赋值
          enemy[key] = effect.value
        }
      } else if (effect.side === "player") {
        const key = effect.source;
        //如果存在对应名称的值且值为数字
        if (character.hasOwnProperty(key) && typeof character[key] === 'number') {
          const newValue = effect.value + character[key]
          character[key] = newValue < 0 ? 0 : newValue
          if (ultis.maxName.hasOwnProperty(key)) character[key] = character[key] < character[ultis.maxName[key]] ? character[key] : character[ultis.maxName[key]]
        } else {
          // 如果属性不存在或者不是数字，直接赋值
          character[key] = effect.value
        }
      }
    })
  } else if (aireturn.skill == "挣扎") {
    if (character.id == "facehugger") {
      if (Math.random() * 100 > 70) {
        tmpenemylog = tmpenemylog + "薇薇安终于挣脱了" + character.name + "的束缚，如果不抓紧趁机将其击败，它可能马上又抱上来。"
        enemy["bound"] = -1
      } else {
        tmpenemylog = tmpenemylog + "薇薇安尝试挣脱" + character.name + "的束缚，但失败了。"
      }
    } else if (character.id == "spider") {
      if (Math.random() * 100 > 60) {
        tmpenemylog = tmpenemylog + "薇薇安终于挣脱了" + character.name + "的束缚。"
        enemy["bound"] = -1
      } else {
        tmpenemylog = tmpenemylog + "薇薇安尝试挣脱" + character.name + "的束缚，但失败了。"
      }
    } else if (character.id == "succubus") {
      if (Math.random() * 100 > 60) {
        tmpenemylog = tmpenemylog + "薇薇安终于挣脱了" + character.name + "的魅惑。"
        enemy["bound"] = -1
      } else {
        tmpenemylog = tmpenemylog + "薇薇安尝试挣脱" + character.name + "的魅惑，但失败了。"
      }
    } else {
      if (Math.random() * 100 > 40) {
        tmpenemylog = tmpenemylog + "薇薇安挣脱了" + character.name + "的束缚。"
        enemy["bound"] = -1
      } else {
        tmpenemylog = tmpenemylog + "薇薇安尝试挣脱" + character.name + "的束缚，但失败了。"
      }
    }
  }
  updateskills()
  pushenemylog(aireturn)
  roundendupdate(currentlog1 + "\n" + currentlog2, aireturn, skillId, climaxflag)
}

function roundendupdate(currentlog, aireturn, skillId, climaxflag) {
  updatefulllog(currentlog, aireturn, skillId, climaxflag)
  if (character.HP <= 0) {
    tmpenemylog = tmpenemylog + "薇薇安击败了" + character.name + "。"
    document.getElementById("player-name-input").style.display = "none"
    document.getElementById("game-header").style.display = "none"
    enemy.monsters_defeat.push(character.id)
    showCharacterSelect()
  }
  let warppedmessage = tmpenemylog.replace(/"([^"]+)"/g, '<span style="color: orange;">"$1"</span>').replace(/“([^“”]+)”/g, '<span style="color: orange;">“$1”</span>').replace(/薇薇安/g, "<span style=\"color: yellow;\">$&</span>").replace(/\d+/g, "<span style=\"color: yellow;\">$&</span>").replace(/法力/g, "点<span style=\"color: blue;\">$&</span>").replace(/HP/g, "<span style=\"color: red;\">HP</span>").replace(/堕落[值度]/g, "<span style=\"color: purple;\">$&</span>").replace(/高潮[值度]/g, "<span style=\"color: deeppink;\">$&</span>").replace(/束缚|妊娠|魅惑/g, "<span style=\"color: white;\">$&</span>").replace(/\n+/g, "<br>").replace(/\*\*\*([^\n]{1,100}?)\*\*\*/g, '<span style="font-weight: bold; font-style: italic;">$1</span>').replace(/\*\*([^\n]{1,100}?)\*\*/g, '<span style="font-weight: bold;">$1</span>').replace(/\*(?!\*)([^\n]{1,100}?)\*/g, '<span style="font-style: italic;">$1</span>');
  const newmessage = document.createElement("p")
  newmessage.className = "playerlog"
  newmessage.innerHTML = warppedmessage
  document.getElementById("main-log2").appendChild(newmessage)
  document.getElementById("main-log").scrollTop = document.getElementById("main-log").scrollHeight
  let endingflag = 0;
  endingflag = (enemy.degenerate >= 100) ? 7 : 0
  if (enemy.monsters_defeat.length >= 4) endingflag = enemy.degenerate < 20 ? 1 : enemy.degenerate < 40 ? 2 : enemy.degenerate < 60 ? 3 : enemy.degenerate < 80 ? 4 : enemy.degenerate < 100 ? 5 : 6
  if (enemy.HP <= 0) endingflag = 8
  if (endingflag > 0) {
    const newmessage = document.createElement("p")
    newmessage.className = "playerlog"
    newmessage.innerHTML = `<span style="color: orange;">🎉当前已达成结局` + ultis.numToChinese[endingflag.toString()] + ultis.endingnames[endingflag.toString()] + "🎉,建议保存存档后重新开始游戏</span>"
    document.getElementById("main-log2").appendChild(newmessage)
    document.getElementById("main-log").scrollTop = document.getElementById("main-log").scrollHeight
  }
  updateStatusBox()
}

function updatefulllog(currentlog, aireturn, skillId, climaxflag) {
  fulllog.push({ "name": "player", "message": { "role": "user", "content": currentlog } })
  fulllog.push({ "name": "enemy", "message": aireturn })
  if (skillId != -1) {
    tmpenemylog = tmpenemylog + "薇薇安使用" + enemy.skills[skillId].name + "，" + enemy.skills[skillId].full_desc
  } else if (aireturn.skill == "挣扎") {
    //tmpenemylog = tmpenemylog + "薇薇安挣脱了对方的束缚。"
  } else if (climaxflag) {
    tmpenemylog = tmpenemylog + "薇薇安沉浸在快感的余韵中错过了使用技能的机会。"
  } else {
    tmpenemylog = tmpenemylog + "薇薇安放弃了使用技能的机会。"
  }
}

function chatlogpretreat(currentlog1, currentlog2) {
  pushplayerlog(currentlog1, currentlog2)
  const lorebookadded = ultis.insertLorebood(chatlog, character, enemy, playername)
  const fullchatlog = [...breakLimit];
  const input_index = fullchatlog.findIndex(obj => obj.role === "input");
  fullchatlog.splice(input_index, 1, ...lorebookadded)
  return fullchatlog
}

async function getAIResponse(data, attempt) {
  console.log(data)
  // const url = 'http://localhost:3000/v1/chat/completions';
  // const token = 'TBdjXCB85U'; // 不建议明文暴露
  // const response = await fetch(url, {
  //   method: 'POST',
  //   headers: {
  //     'accept': '*/*',
  //     'accept-encoding': 'gzip, deflate, br',
  //     'authorization': `Bearer ${token}`,
  //     'content-type': 'application/json',
  //     'user-agent': 'node-fetch',
  //     'connection': 'close'
  //   },
  //   body: JSON.stringify(data)
  // });

  // if (!response.ok) {
  //   throw new Error(`HTTP error! Status: ${response.status}`);
  // }
  // const result = await response.json()

  // 准备 fetch 的 options，注意这里不需要 token 了！
  const options = {
    method: 'POST',
    headers: {
      'accept': '*/*',
      'accept-encoding': 'gzip, deflate, br',
      'content-type': 'application/json',
      'user-agent': 'node-fetch',
      'connection': 'close'
    },
    body: JSON.stringify(data)
  };

  try {
    // 通过 preload 脚本调用主进程的 API 请求功能
    const result = await window.electronAPI.makeApiRequest(options, attempt);
    // const result = {
    //   "id": "chatcmpl-1749653519",
    //   "object": "chat.completion",
    //   "created": 1749653519,
    //   "model": "gemini-2.5-flash-preview-05-20",
    //   "choices": [
    //     {
    //       "index": 0,
    //       "finish_reason": "STOP",
    //       "message": {
    //         "role": "assistant",
    //         "content": "```json\n{\n \"think\": \"\n# Adventure Thinking Chain\n\n- Compliance with '阶段语料' Style Guidelines: [Confirmed] Will use \\\"纯洁阶段（0-20点）语料\\\" for dialogue and reaction framing, emphasizing resistance and calling to God.  \n- Sexual Content Ratio: ≥30%. The focus is on the impact of the aphrodisiac slime and corroding clothes, detailing tactile sensations, visual changes, and Vivian's internal struggle and repulsion.  \n- Description Focus Allocation: ~40% Physiological detailing (slime on skin, clothes corroding, tremors), ~30% Psychological description (shame, disgust, firm resolve), ~20% Environmental/Visual impact (blue slime, dissolving habit), ~10% Dialogue.  \n\nStep 3: Roleplay Content Generation Framework  \n[Content Structure Planning]  \n- Opening Scenario Setup: Lan Rui's sudden appearance and attack with slime.  \n- Core Plot Development: Vivian's immediate physical and psychological reaction to the slime and the corroding habit. Her internal struggle to maintain purity.  \n- Key Character Interactions: Lan Rui's playful/predatory presence vs. Vivian's resistant, pious response.  \n- Text Content Proportion: Strict adherence to described ratios.  \"\n,\n \"roleplay\": \"洞窟深处的阴影如同活物般蠕动，空气中弥漫着压抑的湿冷，远处传来低沉的滴答声，回荡在寂静中。薇薇安金色的发丝拂过颈侧，她下意识地握紧手中的法杖，警惕地扫视着四周，那些被惊动的魔物仿佛随时都会从岩缝中显形。\n\n她屏住呼吸，正要向前迈步，一道模糊的蓝色身影毫无预兆地从侧面猛扑而至。那身影动作轻盈，如同深海中的幽灵，未及看清全貌，一股温热的、甜腻的液体便劈头盖脸地泼洒而来。薇薇安的呼吸凝固在喉咙里，柔软的白色修女袍瞬间被粘稠的粉色液体覆盖。\n\n`<!-- 薇薇安的反应将通过生理过程和心理时间的扭曲来描绘，同时用语言的潜台词和对信仰的坚持来体现她内心的挣扎和对亵渎的厌恶。外部世界的变化——衣物被腐蚀，暗示了她纯洁边界的动摇。 -->`\n湿热的黏腻感瞬间包裹全身，让她猛地僵硬。那液体带着一种近乎蛊惑的甜香，不同于花朵或果实的清甜，而是一种令人不安的、与体温相似的、黏腻的甜。白色的布料迅速浸透，颜色变得深沉，随即，细微的嘶啦声传入耳膜——那是柔软的棉质布料正在被不明液体腐蚀的响动。薇薇安下意识地睁大了湛蓝的眼睛，目光落在那片开始变得透明的、如同被酸液侵蚀过的布料上。修女袍下，最靠近肌肤的白色内衣也未能幸免，在粉色的液体中逐渐瓦解，娇小的身躯几乎要透过薄弱的遮蔽展露出来。\n\n粉色粘液顺着发丝滴落，沿着她的面颊滑下，在肌肤上留下一道微热的轨迹。这种被不明液体侵犯的感觉，让她身体的每一寸肌肤都感到酥麻且隐约刺痛。她想将这附着其上的污秽甩脱，但身体却像是被某种无形的力量束缚，只能在原地微微颤抖。一种从心底涌出的羞耻和厌恶，让她感到一阵恶心，心跳猛地提速，快得让胸膛隐隐作痛。喉间紧绷，发出短促而急促的呼吸。\n\n半透明的蓝色史莱姆在不远处扭动着，核心躯体凝结出少女的甜美轮廓。她歪着头，深蓝色的瞳孔泛着幽光，嘴角带有一抹玩味的弧度，看着修女因侵蚀而变化的衣物，眼中是捕食者满足的愉悦。\n\n“不……住手！不要碰我！神啊，请保护您的仆人！这是亵渎，是罪恶！我宁死也不会向邪恶屈服！”薇薇安挣扎着，纤细的手指紧紧地握住胸前的银色十字架，指节的力度大得要将指甲陷入掌心。她的声音带着一种压抑的颤抖，却依然维持着圣职者固有的庄重，仿佛要将所有感官体验都强行压制住，只任由虔诚的祈祷从唇齿间溢出。她用尽全身的力气，试图将这种异样的、令她作呕的感觉从身体中驱逐出去，然而那黏腻的液体如同附骨之疽，不退反进。\n\n她感受到这股甜腻的热浪正试图渗透她的身体，动摇她信仰的根基，但这反而激发了她内心更强的反抗意识。纯粹的愤怒涌上心头，蓝色的眼眸里，一缕圣洁的光芒开始凝聚。\n<!-- 根据薇薇安当前阶段（纯洁阶段，高潮值0，堕落值0），她会选择一个防御性的技能来抵抗这种被亵渎的攻击。信仰屏障既能提供防护，又能降低高潮值和堕落值，完美符合她试图保持纯洁、抵御“不洁”侵袭的心理。 -->\",\n \"skill\": { \"enum\":[\"攻击\"]},\n \"summary\": \"第N天 阴森洞窟。圣修女薇薇安在洞窟深处搜寻孩子托米后，不料在回程途中遭遇了蓝蕊的袭击。蓝蕊从暗中扑出，向薇薇安泼洒了含有媚药和轻微腐蚀性的粘液，使她纯白的修女袍与内衣被逐渐腐蚀。薇薇安感到全身被黏腻湿热的液体包裹，心中涌起强烈的羞耻与恶心，身体因厌恶而颤抖。她紧握十字架，发出坚定的抗拒声，并决心以信仰力量抵御这股邪恶侵袭，以此保持纯洁不被玷污。\",\n \"roast\": \"哦，我的地牢之主，陨石碎！瞧瞧你这巧妙的开场，真是戏剧性十足！没有直接的刀剑相向，而是选择了……嗯，粘液与腐蚀。这蓝蕊倒是深得我心，一出场就给那圣洁的小修女来了个下马威。看她那震惊又恶心的模样，真是不枉费你精心调配的“粉色液体”啊！这件白袍子，看来是保不住了。我可太期待了，这帷幕才刚刚拉开，好戏才刚刚开始！\"\n}\n```"
    //       }
    //     }
    //   ],
    //   "usage": {
    //     "prompt_tokens": 14282,
    //     "completion_tokens": 1938,
    //     "total_tokens": 18581
    //   }
    // }
    console.log(result.choices[0].message.content)
    const airesponse = result.choices[0].message.content.replace(/^```json\n/, '').replace(/```$/, '').replace(/<!--.*?--!*>/g, '')
    let match = []
    try {
      const json = JSON.parse(airesponse);
      if (json.think && json.roleplay && json.skill && json.summary) {
        match[1] = json.think;
        match[2] = json.roleplay;
        match[3] = json.skill;
        match[4] = json.summary;
        match[5] = json.roast;
      } else {
        // 如果缺少必要字段，则回退到正则
            console.error("JSON.parse失败，回退到正则匹配");
            throw new Error("Missing fields");
      }
    } catch (e) {
      match = airesponse.match(/\"think\"\s*:\s*\"([\S\s]*)\"[\s\S]*?\"roleplay\"\s*:\s*\"([\S\s]*)\"\s*?,\s*?\"skill\"\s*:\s*\"([\S\s]*)\"\s*?,\s*?\"summary\"\s*:\s*\"([\S\s]*)\"\s*?,\s*?\"roast\"\s*:\s*\"([\S\s]*)\"\s*?}/)
      if (!match) {
        match = airesponse.match(/\"think\"\s*:\s*\"([\S\s]*)\"[\s\S]*?\"roleplay\"\s*:\s*\"([\S\s]*)\"\s*?,\s*?\"skill\"\s*:\s*{\s*\"enum\"\s*:\s*\[\s*\"([\S\s]*)\"\s*?\]\s*?}\s*?,\s*?\"summary\"\s*:\s*\"([\S\s]*)\"\s*?,\s*?\"roast\"\s*:\s*\"([\S\s]*)\"\s*?}/)
      }
      if (!match) {
        match = airesponse.match(/<think>([\S\s]*)<\/think>[\s\S]*?\"roleplay\"\s*:\s*\"([\S\s]*)\"\s*?,\s*?\"skill\"\s*:\s*\"([\S\s]*)\"\s*?,\s*?\"summary\"\s*:\s*\"([\S\s]*)\"\s*?,\s*?\"roast\"\s*:\s*\"([\S\s]*)\"\s*?}/)
      }
      if (!match) {
        match = airesponse.match(/<think>([\S\s]*)<\/think>[\s\S]*?\"roleplay\"\s*:\s*\"([\S\s]*)\"\s*?,\s*?\"skill\"\s*:\s*{\s*\"enum\"\s*:\s*\[\s*\"([\S\s]*)\"\s*?\]\s*?}\s*?,\s*?\"summary\"\s*:\s*\"([\S\s]*)\"\s*?,\s*?\"roast\"\s*:\s*\"([\S\s]*)\"\s*?}/)
      }
    }
    match.shift()
    let matchedited = match.map(para => para.replace(/(?!\\)\n/g, "\\n").replace(/(\\)*\"/g, "\\\\\\\""))
    let editedairesponse = "{\"think\":\"" + matchedited[0] + "\",\"roleplay\":\"" + matchedited[1] + "\",\"skill\":\"" + matchedited[2] + "\",\"summary\":\"" + matchedited[3] + "\",\"roast\":\"" + matchedited[4] + "\"}"
    // 解析为JSON对象
    const jsonObject = JSON.parse(editedairesponse);
    return jsonObject;

  } catch (error) {
    console.error('API request failed:', error);
    // 向上抛出错误，让 retryableFunction 捕获
    throw error;
  }
}

async function retryableFunction(fn, retries = 3, delay = 1000) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const result = await fn(attempt); // 获取并返回结果
      return result;
    } catch (error) {
      console.warn(`第 ${attempt} 次尝试失败: ${error.message}`);
      if (attempt < retries) {
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        throw new Error(`全部 ${retries} 次尝试失败: ${error.message}`);
      }
    }
  }
}

function replaceUserWildcard(obj) {
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {  // 安全检查，确保是自身属性
      if (typeof obj[key] === 'string') {
        // 执行替换 <test> → name
        obj[key] = obj[key].replace(/<user>/g, playername);
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        // 递归处理嵌套对象或数组
        replaceUserWildcard(obj[key]);
      }
    }
  }
}

//window.saveData = saveData;
//window.loadData = loadData;
window.openSaveModal = openSaveModal
window.openLoadModal = openLoadModal
window.closeModal = closeModal
window.backMainMenu = backMainMenu;
window.playerAction = playerAction;
window.initCharacterSystem = initCharacterSystem;
window.initLoadCharacterSystem = initLoadCharacterSystem;
// 在游戏初始化时调用角色系统
document.addEventListener('DOMContentLoaded', async () => {
  document.getElementById('startButton').addEventListener('click', initCharacterSystem);
  document.getElementById('loadButton').addEventListener('click', initLoadCharacterSystem);
  document.getElementById('continueButton').addEventListener('click', () => loadGameFromSlot(-1));
  document.getElementById('exitButton').addEventListener('click', () => {
    window.close();
  });
  const images = document.querySelectorAll('img[data-src]');
  for (const img of images) {
    img.src = await resolveAssetPaths(img.dataset.src);
  }
  const elementsWithBg = document.querySelectorAll('[data-bg-src]');
  for (const el of elementsWithBg) {
    const absolutePath = await resolveAssetPaths(el.dataset.bgSrc);
    // 设置背景图片样式，注意要用 url() 包裹路径
    // 同时，需要对路径中的反斜杠 \ 进行转义，以防在CSS字符串中出问题
    el.style.backgroundImage = `url('${absolutePath.replace(/\\/g, '/')}')`;
  }
});