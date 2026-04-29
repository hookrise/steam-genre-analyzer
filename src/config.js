// Steam API 配置
const config = {
  // Steam Web API 基础地址
  steamApiBase: 'https://api.steampowered.com',
  // Steam 商店 API 基础地址
  storeApiBase: 'https://store.steampowered.com/api',

  // 请求间隔（毫秒），避免触发 Steam API 限流
  requestDelay: 500,

  // API 超时（毫秒）
  apiTimeout: 15000,
  storeTimeout: 10000,

  // 默认端口
  port: process.env.PORT || 3000,

  // HTTP 代理设置
  proxy: process.env.STEAM_PROXY || null,

  // ========== 游戏类型层级分类体系 ==========

  // 主类型定义（含子类型）
  genreHierarchy: [
    {
      id: 'action',
      name: '动作游戏',
      subGenres: ['平台跳跃', '清版动作', '格斗', '射击', '动作冒险', '其他动作'],
    },
    {
      id: 'rpg',
      name: '角色扮演游戏',
      subGenres: ['传统日式', '开放世界RPG', '动作角色扮演', '回合制角色扮演', '大型多人在线角色扮演', '其他角色扮演'],
    },
    {
      id: 'strategy',
      name: '策略游戏',
      subGenres: ['即时战略', '回合制策略', '塔防', '模拟经营', '自走棋', '其他策略'],
    },
    {
      id: 'adventure',
      name: '冒险游戏',
      subGenres: ['点击解谜', '视觉小说', '步行模拟', '其他冒险'],
    },
    {
      id: 'simulation',
      name: '模拟游戏',
      subGenres: ['生活模拟', '载具模拟', '体育模拟', '恋爱模拟', '其他模拟'],
    },
    {
      id: 'puzzle',
      name: '益智/解谜游戏',
      subGenres: ['方块消除', '物理益智', '逻辑推理', '找茬/拼图', '其他解谜'],
    },
    {
      id: 'shooter',
      name: '射击游戏',
      subGenres: ['第一人称射击', '第三人称射击', '战术射击', '弹幕射击', '其他射击'],
    },
    {
      id: 'sports_racing',
      name: '体育/竞速游戏',
      subGenres: ['体育', '竞速', '极限运动', '其他体育竞速'],
    },
    {
      id: 'casual',
      name: '休闲游戏',
      subGenres: ['三消', '跑酷', '放置类', '其他休闲'],
    },
    {
      id: 'sandbox',
      name: '沙盒/开放世界游戏',
      subGenres: [],
    },
    {
      id: 'party',
      name: '派对/聚会游戏',
      subGenres: [],
    },
    {
      id: 'indie',
      name: '独立游戏',
      subGenres: [],
    },
  ],

  // Steam 官方标签 → 主类型 ID 映射（中英文均支持）
  steamTagToCategory: {
    // English
    'Action': 'action', 'Adventure': 'adventure', 'RPG': 'rpg',
    'Strategy': 'strategy', 'Simulation': 'simulation',
    'Sports': 'sports_racing', 'Racing': 'sports_racing',
    'Casual': 'casual', 'Puzzle': 'puzzle',
    'Massively Multiplayer': 'rpg', 'Indie': 'indie',
    // 中文（Steam API 带 l=schinese 时返回）
    '动作': 'action', '冒险': 'adventure', '角色扮演': 'rpg',
    '策略': 'strategy', '模拟': 'simulation',
    '体育': 'sports_racing', '竞速': 'sports_racing',
    '休闲': 'casual', '解谜': 'puzzle',
    '大型多人在线': 'rpg', '独立': 'indie',
  },

  // 应跳过的非游戏类型业务标签（中英文）
  skipTags: [
    'Free to Play', 'Free To Play', 'Early Access',
    'Animation & Modeling', 'Design & Illustration', 'Utilities',
    'Audio Production', 'Video Production', 'Photo Editing',
    'Web Publishing', 'Education', 'Software Training', 'Accounting',
    '免费开玩', '抢先体验',
    '动画制作和建模', '设计和插画', '实用工具',
    '音频制作', '视频制作', '照片编辑',
    '网页出版', '教育', '软件训练', '会计',
  ],

  // Steam 标签 → 子类型映射（中英文）
  steamTagToSubGenre: {
    'Platformer': '平台跳跃', '平台游戏': '平台跳跃',
    'Beat \'em up': '清版动作', 'Hack and Slash': '清版动作',
    'Fighting': '格斗', '格斗': '格斗',
    'FPS': '第一人称射击', 'Shooter': '射击',
    'Third-Person Shooter': '第三人称射击',
    'Bullet Hell': '弹幕射击',
    'JRPG': '传统日式',
    'CRPG': '开放世界RPG',
    'Action RPG': '动作角色扮演', '动作角色扮演': '动作角色扮演',
    'Turn-Based': '回合制角色扮演',
    'Turn-Based Strategy': '回合制策略', '回合制策略': '回合制策略',
    'Turn-Based RPG': '回合制角色扮演',
    'MMORPG': '大型多人在线角色扮演',
    'Real-Time Strategy': '即时战略', '即时战略': '即时战略',
    'RTS': '即时战略',
    'Tower Defense': '塔防', '塔防': '塔防',
    'Auto Battler': '自走棋',
    'City Builder': '模拟经营', '城市建造': '模拟经营',
    'Management': '模拟经营', '管理': '模拟经营',
    'Base Building': '基地建造', '基地建造': '基地建造',
    'Point & Click': '点击解谜', '点击': '点击解谜',
    'Visual Novel': '视觉小说', '视觉小说': '视觉小说',
    'Walking Simulator': '步行模拟',
    'Life Sim': '生活模拟', '生活模拟': '生活模拟',
    'Driving': '载具模拟', 'Flight': '载具模拟',
    'Love': '恋爱模拟', '恋爱模拟': '恋爱模拟',
    'Dating Sim': '恋爱模拟',
    'Match 3': '三消', '三消': '三消',
    'Rhythm': '节奏',
    'Runner': '跑酷', '跑酷': '跑酷',
    'Idler': '放置类', 'Idle': '放置类', 'Clicker': '放置类',
    'Sandbox': '沙盒',
    'Open World': '开放世界RPG', '开放世界': '开放世界RPG',
    'Party': '派对',
    'MOBA': '多人在线战术竞技',
    'Battle Royale': '大逃杀',
  },

  // 已知特定游戏的分类覆盖（appid → { category, subGenre }）
  // 用于 Steam 标签不足以准确判断时的手动修正
  appidOverride: {
    // 射击游戏（Steam 通常标为 Action）
    730: { category: 'shooter', subGenre: '战术射击' },
    1085660: { category: 'shooter', subGenre: '第一人称射击' },
    1172470: { category: 'shooter', subGenre: '第一人称射击' },
    359550: { category: 'shooter', subGenre: '战术射击' },
    2357570: { category: 'shooter', subGenre: '第一人称射击' },
    1422450: { category: 'shooter', subGenre: '第三人称射击' },
    1938090: { category: 'shooter', subGenre: '第一人称射击' },
    1237970: { category: 'shooter', subGenre: '第一人称射击' },
    578080: { category: 'shooter', subGenre: '第一人称射击' },
    2076040: { category: 'shooter', subGenre: '第一人称射击' },
    2073850: { category: 'shooter', subGenre: '第一人称射击' },
    553850: { category: 'shooter', subGenre: '第三人称射击' },
    2807960: { category: 'shooter', subGenre: '第一人称射击' },
    1238810: { category: 'shooter', subGenre: '第一人称射击' },
    1238840: { category: 'shooter', subGenre: '第一人称射击' },
    1517290: { category: 'shooter', subGenre: '第一人称射击' },
    2641470: { category: 'shooter', subGenre: '第一人称射击' },
    3065800: { category: 'shooter', subGenre: '第一人称射击' },
    // 空标签但已知类型的游戏
    2767030: { category: 'shooter', subGenre: '第三人称射击' }, // Marvel Rivals
    2358720: { category: 'rpg', subGenre: '动作角色扮演' }, // Black Myth: Wukong
    2868840: { category: 'strategy', subGenre: '回合制策略' }, // Slay the Spire 2
    3321460: { category: 'rpg', subGenre: '动作角色扮演' }, // Crimson Desert
    2742830: { category: 'strategy', subGenre: '回合制策略' }, // Monster Train 2
    2567870: { category: 'action', subGenre: '平台跳跃' }, // Chained Together
    3241660: { category: 'action', subGenre: '动作冒险' }, // REPO
    4443040: { category: 'shooter', subGenre: '第一人称射击' }, // Hull Rupture
    3065170: { category: 'action', subGenre: '动作冒险' }, // Monster Hunter Wilds Beta
    3167020: { category: 'shooter', subGenre: '第一人称射击' }, // Escape From Duckov
    2074930: { category: 'shooter', subGenre: '第三人称射击' }, // The First Descendant
    2943730: { category: 'shooter', subGenre: '第一人称射击' }, // FragPunk
    3921890: { category: 'action', subGenre: '清版动作' }, // RACCOIN
    2427520: { category: 'shooter', subGenre: '第一人称射击' }, // ARC Raiders
    1611740: { category: 'shooter', subGenre: '第一人称射击' }, // BattleBit Remastered
    3020650: { category: 'shooter', subGenre: '弹幕射击' }, // Bang Bang Barrage
    4131170: { category: 'rpg', subGenre: '动作角色扮演' }, // Granblue Fantasy Relink Beta
    2222400: { category: 'action' }, // Neighbors
    1239300: { category: 'action', subGenre: '动作冒险' }, // Gravewood High
    2878420: { category: 'simulation', subGenre: '生活模拟' }, // Old Market Simulator
    1905910: { category: 'shooter', subGenre: '第一人称射击' }, // Steel Hunters
    2436940: { category: 'adventure', subGenre: '视觉小说' }, // Sephiria
    3081410: { category: 'shooter', subGenre: '第一人称射击' }, // Battlefield 6 Open Beta
    1504980: { category: 'adventure', subGenre: '步行模拟' }, // It Takes Two
    2784470: { category: 'casual', subGenre: '其他休闲' }, // 9 Kings
    // 派对/聚会游戏
    1097150: { category: 'party' },
    945360: { category: 'party' },
    // 沙盒/开放世界
    4000: { category: 'sandbox' },
    271590: { category: 'sandbox' },
    1174180: { category: 'sandbox' },
    // 动作角色扮演（区别于普通 RPG）
    582010: { category: 'action', subGenre: '动作冒险' },
    2054970: { category: 'rpg', subGenre: '动作角色扮演' },
  },

  // 游戏类型配色方案（按主类型）
  genreColors: {
    'action': '#e74c3c',
    'rpg': '#9b59b6',
    'strategy': '#2ecc71',
    'adventure': '#3498db',
    'simulation': '#f39c12',
    'puzzle': '#1abc9c',
    'shooter': '#e67e22',
    'sports_racing': '#e91e63',
    'casual': '#95a5a6',
    'sandbox': '#2c3e50',
    'party': '#fd79a8',
    'indie': '#636e72',
  },

  // 主类型 ID → 中文名快速查询
  getCategoryName(id) {
    const cat = this.genreHierarchy.find(c => c.id === id);
    return cat ? cat.name : id;
  },

  // 获取类型颜色
  getCategoryColor(id) {
    return this.genreColors[id] || '#66aaff';
  },

  // 获取类型下所有子类型（含"未细分"）
  getSubGenres(categoryId) {
    const cat = this.genreHierarchy.find(c => c.id === categoryId);
    return cat ? [...cat.subGenres] : [];
  },

  // 判断是否是有效的主类型
  isValidCategory(id) {
    return this.genreHierarchy.some(c => c.id === id);
  },
};

module.exports = config;
