const express = require('express');
const path = require('path');
const config = require('./src/config');
const steamApi = require('./src/steam-api');
const { analyzeGenres } = require('./src/genre-analyzer');
const { getRecommendations } = require('./src/recommender');

const app = express();

app.use(express.json());

// API: 诊断连接
app.get('/api/diagnose', async (req, res) => {
  const results = [];
  const configs = [
    { url: 'https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/', params: { key: req.query.key, steamids: '76561197960435530', format: 'json' } },
    { url: 'https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/', params: { key: req.query.key, steamid: '76561197960435530', include_appinfo: true, format: 'json' } },
    { url: 'https://store.steampowered.com/api/appdetails?appids=730' },
    { url: 'https://google.com' }
  ];

  for (const cfg of configs) {
    try {
      const start = Date.now();
      const resp = await steamApi.apiClient.get(cfg.url, { params: cfg.params, timeout: 10000 });
      results.push({ url: cfg.url, status: resp.status, time: Date.now() - start + 'ms' });
    } catch (e) {
      results.push({ url: cfg.url, error: e.message, status: e.response?.status || e.code });
    }
  }

  res.json({ proxy: config.proxy || '未设置', results });
});

// 静态文件服务
app.use(express.static(path.join(__dirname, 'public')));

// API: 分析 Steam 游戏库
app.post('/api/analyze', async (req, res) => {
  try {
    const { steamId, key } = req.body;

    if (!steamId || !key) {
      return res.status(400).json({
        success: false,
        error: '请提供 Steam ID 和 API Key'
      });
    }

    // 步骤1: 获取玩家信息
    const player = await steamApi.getPlayerSummary(steamId, key);

    // 步骤2: 获取游戏库
    const games = await steamApi.getOwnedGames(steamId, key);

    if (games.length === 0) {
      return res.json({
        success: true,
        data: {
          player,
          totalGames: 0,
          totalHours: 0,
          genreBreakdown: [],
          topGenre: null,
          games: []
        }
      });
    }

    // 步骤3: 获取游戏类型
    const genreMap = await steamApi.getGameGenres(games);

    // 步骤4: 分析类型偏好
    const analysis = analyzeGenres(games, genreMap);

    res.json({
      success: true,
      data: {
        player,
        ...analysis
      }
    });
  } catch (error) {
    console.error('分析出错:', error);
    res.status(500).json({
      success: false,
      error: error.message || '分析过程中发生错误'
    });
  }
});

// API: 获取游戏推荐
app.post('/api/recommend', async (req, res) => {
  try {
    const { steamId, key } = req.body;

    if (!steamId || !key) {
      return res.status(400).json({
        success: false,
        error: '请提供 Steam ID 和 API Key'
      });
    }

    // 先获取游戏库
    const games = await steamApi.getOwnedGames(steamId, key);
    const genreMap = await steamApi.getGameGenres(games);
    const analysis = analyzeGenres(games, genreMap);

    // 生成推荐
    const recommendations = getRecommendations(analysis.genreBreakdown, games);

    res.json({
      success: true,
      data: {
        recommendations,
        topGenre: analysis.topGenre
      }
    });
  } catch (error) {
    console.error('推荐出错:', error);
    res.status(500).json({
      success: false,
      error: error.message || '获取推荐时发生错误'
    });
  }
});

// 启动服务器
app.listen(config.port, () => {
  console.log(`========================================`);
  console.log(`  Steam 游戏类型分析工具已启动`);
  console.log(`  地址: http://localhost:${config.port}`);
  if (config.proxy) {
    console.log(`  代理: ${config.proxy}`);
  } else {
    console.log(`  代理: 未设置 (如需配置请设置 STEAM_PROXY 环境变量)`);
  }
  console.log(`========================================`);
});
