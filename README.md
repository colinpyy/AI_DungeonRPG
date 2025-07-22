# 逆·聖修道女の堕ちた洞窟です
基于大语言模型API结构化输出功能的RPG对战游戏，游戏内容素材来自类脑社区角色卡作者一知半解制作的角色卡《聖修道女の堕ちた洞窟です》与yorino_233的戏剧之王预设，基于谷歌gemini的结构化输出功能进行制作。是对在SillyTavern外使用结构化输出功能来约束输出内容格式进行角色扮演游戏的一次探索。推荐使用支持结构化输出功能的谷歌aistudio的API，同时也兼容其他api通过文字引导进行json格式输出。
![image](https://github.com/colinpyy/AI_DungeonRPG/blob/main/example.png)
![image](https://github.com/colinpyy/AI_DungeonRPG/blob/main/example2.png)

# API设置
```
API_URL=https://generativelanguage.googleapis.com/v1beta/openai/chat/completions
API_KEY=
API_MODEL=gemini-2.5-flash-preview-05-20
API_TEMP=1.1
API_TOPP=0.99
API_PRESENCE=0
API_JSON_SCHEMA=true
```
如上resources/.env中内容为API设置，URL请通过加上chat/completions指定使用聊天补全模式。API_KEY、API_MODEL、API_TEMP、API_TOPP、API_PRESENCE分别为密钥、模型的名称、temperature、top_p、presence_penalty参数。API_JSON_SCHEMA为是否使用官方的结构化输出功能，开启后默认每次对话第一次尝试使用官方的json结构化输出功能，失败则使用普通的文本引导进行后两次尝试。关闭则三次都使用文本引导json格式输出。
（建议在酒馆的聊天补全的兼容OpenAI模式下测试完后将URL复制过来添加上chat/completions后使用）

设置完成后就可以点击开始游戏。

存档地址：C:\Users\<用户名>\AppData\Roaming\airpg\saves\
存档中的角色状态格式与角色初始状态json文件格式一致，修改可参考下方介绍。

# 玩法
输入角色名选择魔物部下然后指挥魔物与圣女进行RPG对战。点击使用技能前可以先在输入框中输入你的行动的文字描述，可以对魔物发出指令也可以直接借魔物之口对圣女说话。输入完成后点击想要使用的技能然后等待回复。（虽说口胡才是最强技能，但是对话不会影响技能内容，也不会造成技能外的效果）

如果api返回错误，建议点击Return回到主菜单然后点continue继续。

结局触发条件：圣女HP归零/堕落到100/被打败4只魔物

# 自定义修改
## 修改预设
预设文件为resources/break.json，考虑可能有模型拒绝回复，支持自定义预设文件。

默认将角色扮演的对话信息插入"role":"input"处，暂时没有在对话中再插入内容的功能。
## 修改世界书
世界书以js函数的形式存放在ultis.js中，函数insertLorebood(chatlog, character, enemy, playername)输入当前的聊天记录、当前角色信息、当前敌人信息、当前玩家名来将世界书的信息动态地插入到对话内容中，保证世界书中的角色信息正确。
## 添加角色
游戏支持添加魔物，需要准备的文件有魔物角色信息的json文件、角色头像以及技能CG。

魔物角色卡格式如下：
```
{
  "id": "slime_s", //角色id
  "name": "蓝涟", //角色名称
  "description": "全身呈半透明蓝色的拟态史莱姆娘...", //用于在游戏中显示的角色介绍
  "full_desc": "# 蓝涟 - 拟态史莱姆娘...", //用于发送给大语言模型的角色世界书
  "avatar": "data/img/slime_s.png", //魔物头像路径
  "bound_image": "data/img/slime_trap/", //魔物束缚状态CG存放路径
  "bound_image_number": [ //束缚状态CG文件名
    "1.png"
  ],
  "bound_desc": "#史莱姆黏液陷阱...", //束缚状态的世界书内容
  "maxHP": 80, //最高血量
  "HP": 80, //初始血量
  "skills": [ //技能列表
    {
      "name": "史莱姆陷阱", //技能名
      "description": "使用粘液触手<span style=\"color: white;\">束缚</span>住猎物...", //用于在游戏中显示的技能介绍
      "full_desc": "突然向薇薇安伸出蓝色透明的史莱姆触手，使用粘液触手将薇薇安牢牢捆住...", //传递给大语言模型的技能介绍
      "image": "data/img/slime_trap/", //技能CG路径
      "image_number": [ //技能CG文件名
        "1.png"
      ],
      "require": "not_bound",//使用技能的条件:not_bound为处于非束缚状态、bound为处于束缚状态、not_bound2为处于刚刚挣脱束缚以外的回合
      "effects": [ //技能具体影响
        {
          "side": "enemy",// 影响哪一份，enemy为敌人（即本作的圣女），player为己方
          "source": "bound",// 影响的数值，bound为束缚回合数、HP为血量、MP为魔力、climax_value为高潮度、degenerate为堕落度、cloth_wet潮湿状态（value填true）、cloth_break破衣状态（value填true）
          "value": 3 //具体变化数值，正为加，负数为减
        }
      ]
    }
  ]
}
```
支持为一个技能添加多个分支（技能效果相同但文字描述不同），可参见flower.json中的百合之拥技能。

制作完后将新角色的json文件以角色id命名放入resources\data\characters文件夹中、CG可放在resources\data\img中，最后将角色id添加到resources\data\characters.json的数组中。
## 修改敌人
敌人（即本作圣女）的角色信息存放在resources\data\enemy.json中:
```
{
  "name": "薇薇安", //角色名
  "maxHP": 200, //最大HP值
  "maxMP": 200, //最大MP值
  "maxdegenerate": 100, //最大堕落度
  "maxclimax_value": 100, //最大高潮值
  "HP": 200, //当前HP值
  "MP": 80, //当前MP值
  "degenerate": 0, //当前堕落度
  "climax_value": 0, //当前高潮值
  "climax_times": 0, //总高潮次数
  "monsters_defeat": [], //已战胜敌人列表
  "bound": 0, //束缚状态回合数
  "invincible":0, //无敌护盾层数
  "pregnant":false, //怀孕状态（当前只适配抱脸虫的技能）
  "cloth_break": false, //初始是否处于破衣状态
  "cloth_wet": false, //初始是否处于潮湿状态
  "skills_desc":"1. 圣光冲击：基础的圣魔法...",//对所有技能的文字介绍，用于引导大语言模型选择技能
  "skills": [//技能列表，除了没用图片信息和技能使用前提外与魔物基本一致
    {
      "name": "圣光冲击",
      "description":"举起法杖对准敌人发射出圣光束造成圣属性伤害...",
      "full_desc":"举起法杖对准敌人发射出圣光束造成圣属性伤害...",
      "effects": [
        {
          "side": "player",
          "source": "HP",
          "value": -25
        }
      ]
    },
...
  ]
}
```

# 制作历程
考虑到有人好奇本游戏的制作流程要求我制作一个教程，决定在这里简单介绍一下。事先声明本人也是半个JavaScript新手，本作至少有30%内容是在gemini的帮助下完成的。因为没接触过rpgmaker和unity之类的，所以最后决定用js来做这个游戏了。
## 前端制作
因为游戏本质上只是一个普通的rpg对战，只不过唯一不同是敌人的技能由ai决定，因此首先要做的就是做一个不带对话功能的rpg对战游戏。

具体实现方法就是直接找gemini让它制作一个rpg网页游戏、给出游戏的index.html、renderer.js和style.css并要求它把敌人的技能使用决策放在一个独立的函数中。暂时让gemini把这儿写成随机使用技能，这个函数就是我们后面要重点修改的地方。现阶段就让gemini把游戏的界面想优化的都优化好比如留好输入文本框、状态框、后面需要显示对话记录的文本框。

完成这一些后就可以开始在renderer.js中添加自己想要的内容了，构建对话、计算属性、更新图片之类的内容，这部分边学边改。可以先不管后端，照着预期ai回复的文本格式自己写个回复作为测试的默认回复，让游戏先跑起来。
## 后端制作
虽说是想用gemini的结构化输出，没用谷歌的genAI库是因为想兼容其他家的模型。最终选择的是按照openai官方文档的结构化输出的格式自己构筑request，一开始使用的fetch时需要本地用node.js进行代理，后面electron打包时换成了electron的net就可以直连了。

测试好后就可以对接到前端写进敌人技能决策的函数了。
## 打包
这没什么好说的了，照着electron的文档来就行了

总的来说有问题问ai就好了。
