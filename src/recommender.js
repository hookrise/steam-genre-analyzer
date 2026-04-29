const config = require('./config');

// 精选推荐游戏库（按主类型 ID）
// 当 Steam API 无法获取推荐时，使用内置的精选推荐
const curatedRecommendations = {
  'action': [
    { name: 'Devil May Cry 5', appid: 601150, description: '顶级动作游戏，华丽的战斗系统' },
    { name: 'Sekiro: Shadows Die Twice', appid: 814380, description: '动作冒险巅峰之作，挑战性极高' },
    { name: 'Sifu', appid: 2138710, description: '硬核功夫动作游戏' },
    { name: 'Bayonetta', appid: 501300, description: '华丽爽快的动作游戏' },
  ],
  'shooter': [
    { name: 'DOOM Eternal', appid: 782330, description: '快节奏第一人称射击' },
    { name: 'Titanfall 2', appid: 1237970, description: '最佳FPS战役之一' },
    { name: 'Metro Exodus', appid: 412020, description: '末世生存FPS' },
    { name: 'Half-Life: Alyx', appid: 546560, description: 'VR射击革命' },
  ],
  'rpg': [
    { name: 'Elden Ring', appid: 1245620, description: '开放世界动作RPG，年度最佳' },
    { name: 'Baldur\'s Gate 3', appid: 1086940, description: 'CRPG巅峰之作' },
    { name: 'Cyberpunk 2077', appid: 1091500, description: '开放世界科幻RPG' },
    { name: 'Disco Elysium', appid: 632470, description: '叙事RPG创新之作' },
  ],
  'strategy': [
    { name: 'Civilization VI', appid: 289070, description: '回合制策略经典' },
    { name: 'Total War: WARHAMMER III', appid: 1142710, description: '大型战略战争游戏' },
    { name: 'Factorio', appid: 427520, description: '工厂自动化策略' },
    { name: 'Age of Empires IV', appid: 1466860, description: '经典RTS回归' },
  ],
  'adventure': [
    { name: 'The Witcher 3: Wild Hunt', appid: 292030, description: '史诗级开放世界冒险' },
    { name: 'Red Dead Redemption 2', appid: 1174180, description: '西部开放世界冒险' },
    { name: 'Firewatch', appid: 383870, description: '第一人称叙事冒险' },
    { name: 'What Remains of Edith Finch', appid: 501300, description: '叙事冒险经典' },
  ],
  'simulation': [
    { name: 'Stardew Valley', appid: 413150, description: '农场模拟经典' },
    { name: 'Cities: Skylines', appid: 255710, description: '城市模拟建造' },
    { name: 'Euro Truck Simulator 2', appid: 227300, description: '卡车驾驶模拟' },
    { name: 'Microsoft Flight Simulator', appid: 1250410, description: '真实飞行模拟' },
  ],
  'sports_racing': [
    { name: 'Forza Horizon 5', appid: 1551360, description: '开放世界赛车' },
    { name: 'Rocket League', appid: 252950, description: '赛车足球竞技' },
    { name: 'Tony Hawk\'s Pro Skater 1+2', appid: 1373720, description: '滑板运动游戏' },
    { name: 'Football Manager 2024', appid: 2252570, description: '足球经理模拟' },
  ],
  'casual': [
    { name: 'Stray', appid: 1332010, description: '猫咪冒险' },
    { name: 'Untitled Goose Game', appid: 837470, description: '恶搞休闲游戏' },
    { name: 'PowerWash Simulator', appid: 1290000, description: '解压清洗模拟' },
    { name: 'Slime Rancher 2', appid: 1657630, description: '可爱的牧场模拟' },
  ],
  'puzzle': [
    { name: 'Portal 2', appid: 620, description: '物理解谜巅峰之作' },
    { name: 'The Witness', appid: 210970, description: '开放世界解谜' },
    { name: 'Baba Is You', appid: 736260, description: '创新的推箱子解谜' },
  ],
  'sandbox': [
    { name: 'Minecraft', appid: 0, description: '沙盒游戏鼻祖' },
    { name: 'Terraria', appid: 105600, description: '2D沙盒冒险' },
    { name: 'Garry\'s Mod', appid: 4000, description: '物理沙盒创意工坊' },
  ],
  'party': [
    { name: 'Among Us', appid: 945360, description: '多人社交推理游戏' },
    { name: 'Pummel Party', appid: 880940, description: '多人互损派对游戏' },
    { name: 'Overcooked! 2', appid: 728880, description: '多人合作烹饪' },
  ],
  'indie': [
    { name: 'Hollow Knight', appid: 367520, description: '银河城巅峰之作' },
    { name: 'Celeste', appid: 504230, description: '平台跳跃经典' },
    { name: 'Hades', appid: 1145360, description: 'Roguelike动作游戏' },
    { name: 'Undertale', appid: 391540, description: '独特的RPG体验' },
  ],
};

/**
 * 生成游戏推荐
 * @param {Array} genreBreakdown - 类型偏好列表（从 analyzeGenres 获得）
 * @param {Array} ownedGames - 用户已拥有的游戏列表
 * @returns {Array} 推荐列表
 */
function getRecommendations(genreBreakdown, ownedGames) {
  const ownedNames = new Set(ownedGames.map(g => g.name?.toLowerCase()));
  const ownedAppids = new Set(ownedGames.map(g => g.appid));

  const recommendations = [];

  for (const genreData of genreBreakdown.slice(0, 5)) {
    const genreId = genreData.genre; // 现在使用 ID，如 "action"
    const games = curatedRecommendations[genreId] || [];

    const filtered = games.filter(g => {
      return !ownedNames.has(g.name.toLowerCase()) && !ownedAppids.has(g.appid);
    });

    if (filtered.length > 0) {
      recommendations.push({
        genre: genreId,
        genreCn: genreData.genreCn,
        color: genreData.color,
        games: filtered.slice(0, 5),
      });
    }
  }

  // 如果推荐太少，补充一些综合推荐
  if (recommendations.length < 2) {
    const allGenres = Object.keys(curatedRecommendations);
    const fallback = [];
    for (const genreId of allGenres) {
      if (genreId === 'indie') continue;
      for (const game of curatedRecommendations[genreId]) {
        if (!ownedNames.has(game.name.toLowerCase()) && !ownedAppids.has(game.appid)) {
          fallback.push(game);
          if (fallback.length >= 5) break;
        }
      }
      if (fallback.length >= 5) break;
    }

    if (fallback.length > 0) {
      recommendations.push({
        genre: 'recommended',
        genreCn: '综合推荐',
        color: '#3498db',
        games: fallback,
      });
    }
  }

  return recommendations;
}

module.exports = { getRecommendations };
