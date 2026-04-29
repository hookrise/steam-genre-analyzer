const config = require('./config');

const SKIP_TAGS = new Set(config.skipTags);
const INDIE_TAGS = new Set(['Indie', '独立']);

/**
 * 分析用户游戏库的类型偏好（新版层级分类）
 * @param {Array} games - 游戏列表（含 appid, name, playtime_forever）
 * @param {Map} genreMap - appid -> genres 的映射
 * @returns {Object} 分析结果
 */
function analyzeGenres(games, genreMap) {
  // 主类型统计：{ categoryId: { totalMinutes, subGenres: { subName: minutes } } }
  const stats = {};

  // 获取主类型 ID 列表
  const categoryIds = config.genreHierarchy.map(c => c.id);
  categoryIds.forEach(id => {
    stats[id] = { totalMinutes: 0, subGenres: {} };
  });
  // 额外未分类桶
  stats['_uncategorized'] = { totalMinutes: 0, subGenres: {} };

  // 逐游戏分析
  for (const game of games) {
    if (game.playtime_forever <= 0) continue;

    const minutes = game.playtime_forever;
    const rawTags = genreMap.get(game.appid) || [];

    // 获取该游戏的分类归属
    const assignments = classifyGame(game.appid, rawTags);

    if (assignments.length === 0) {
      // 无匹配 → 未分类
      stats['_uncategorized'].totalMinutes += minutes;
      continue;
    }

    // 将游玩时间均分给每个匹配的主类型
    const minutesPerCategory = minutes / assignments.length;

    for (const { category, subGenre } of assignments) {
      const stat = stats[category];
      if (!stat) continue;

      stat.totalMinutes += minutesPerCategory;
      const subKey = subGenre || '未细分';
      if (!stat.subGenres[subKey]) {
        stat.subGenres[subKey] = 0;
      }
      stat.subGenres[subKey] += minutesPerCategory;
    }
  }

  // 计算总时长（小时）
  const totalMinutesAll = Object.values(stats).reduce((sum, s) => sum + s.totalMinutes, 0);
  const totalHours = Math.round(totalMinutesAll / 60);

  // 构建输出
  const genreBreakdown = [];
  let topGenre = null;

  for (const cat of config.genreHierarchy) {
    const stat = stats[cat.id];
    if (!stat || stat.totalMinutes <= 0) continue;

    const hours = Math.round(stat.totalMinutes / 60);
    const percentage = totalHours > 0 ? Math.round((stat.totalMinutes / totalMinutesAll) * 100) : 0;
    if (percentage < 1) continue;

    // 子类型数据
    const subGenreTotal = Object.values(stat.subGenres).reduce((a, b) => a + b, 0) || 1;
    const subGenres = Object.entries(stat.subGenres)
      .map(([name, mins]) => ({
        name,
        hours: Math.round(mins / 60),
        percentage: Math.round((mins / subGenreTotal) * 100),
      }))
      .sort((a, b) => b.hours - a.hours);

    const item = {
      genre: cat.id,
      genreCn: cat.name,
      hours,
      percentage,
      color: config.getCategoryColor(cat.id),
      subGenres,
    };

    genreBreakdown.push(item);

    if (!topGenre || item.hours > topGenre.hours) {
      topGenre = item;
    }
  }

  // 未分类（如果有）
  const uncat = stats['_uncategorized'];
  if (uncat.totalMinutes > 0) {
    const hours = Math.round(uncat.totalMinutes / 60);
    const percentage = totalHours > 0 ? Math.round((uncat.totalMinutes / totalMinutesAll) * 100) : 0;
    if (percentage >= 1) {
      genreBreakdown.push({
        genre: '_uncategorized',
        genreCn: '未分类',
        hours,
        percentage,
        color: '#555555',
        subGenres: [],
      });
    }
  }

  // 按小时数降序
  genreBreakdown.sort((a, b) => b.hours - a.hours);

  // 按游戏统计（包含分类信息）
  const gamesWithGenres = games
    .filter(g => g.playtime_forever > 0)
    .map(g => {
      const rawTags = genreMap.get(g.appid) || [];
      const assignments = classifyGame(g.appid, rawTags);
      return {
        appid: g.appid,
        name: g.name,
        playtime: g.playtime_forever,
        genres: rawTags,
        category: assignments.length > 0 ? assignments[0].category : '_uncategorized',
        categoryName: assignments.length > 0 ? (config.getCategoryName(assignments[0].category) || '_uncategorized') : '未分类',
        subGenre: assignments.length > 0 ? (assignments[0].subGenre || '未细分') : '未分类',
      };
    })
    .sort((a, b) => b.playtime - a.playtime);

  return {
    totalGames: games.filter(g => g.playtime_forever > 0).length,
    totalHours,
    genreBreakdown,
    topGenre: topGenre || null,
    games: gamesWithGenres,
  };
}

/**
 * 将游戏归类到主类型和子类型
 * @param {number} appid
 * @param {Array} tags - Steam 官方标签列表
 * @returns {Array<{category: string, subGenre: string|null}>}
 */
function classifyGame(appid, tags) {
  // 1. 优先检查手动覆盖
  const override = config.appidOverride[appid];
  if (override) {
    return [{ category: override.category, subGenre: override.subGenre || null }];
  }

  // 2. 过滤掉非游戏类型标签
  const genreTags = tags.filter(t => !SKIP_TAGS.has(t));

  if (genreTags.length === 0) {
    // 如果只有 Indie，归入独立游戏
    if (tags.some(t => INDIE_TAGS.has(t))) {
      return [{ category: 'indie', subGenre: null }];
    }
    // 真·无标签
    return [];
  }

  // 3. 映射到主类型
  const assignments = [];
  const mappedCategories = new Set();

  for (const tag of genreTags) {
    const catId = config.steamTagToCategory[tag];
    if (catId && !mappedCategories.has(catId)) {
      // 尝试检测子类型
      let subGenre = null;

      // 检查是否有标签映射到子类型
      for (const t of genreTags) {
        const sg = config.steamTagToSubGenre[t];
        if (sg) {
          // 验证这个子类型是否属于当前主类型
          const cat = config.genreHierarchy.find(c => c.id === catId);
          if (cat && (cat.subGenres.includes(sg) || cat.subGenres.some(s => sg.includes(s) || s.includes(sg)))) {
            subGenre = sg;
            break;
          }
        }
      }

      assignments.push({ category: catId, subGenre });
      mappedCategories.add(catId);
    }
  }

  // 4. 如果是 Indie-only 标签，但之前被 genreTags 过滤掉了
  if (assignments.length === 0 && tags.some(t => INDIE_TAGS.has(t)) && !mappedCategories.has('indie')) {
    return [{ category: 'indie', subGenre: null }];
  }

  return assignments;
}

module.exports = { analyzeGenres };
