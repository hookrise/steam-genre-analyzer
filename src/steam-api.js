const axios = require('axios');
const { HttpsProxyAgent } = require('https-proxy-agent');
const fs = require('fs');
const path = require('path');
const config = require('./config');

// 创建带代理支持的 axios 实例
function createAxiosInstance() {
  const instanceConfig = {};
  if (config.proxy) {
    instanceConfig.httpsAgent = new HttpsProxyAgent(config.proxy);
  }
  return axios.create(instanceConfig);
}

const apiClient = createAxiosInstance();

// 缓存文件路径
const CACHE_FILE = path.join(__dirname, '..', 'data', 'game-genres.json');

// 延迟工具函数
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * 获取用户拥有的游戏列表
 * @param {string} steamId - Steam 64位ID
 * @param {string} apiKey - Steam Web API Key
 * @returns {Promise<Array>} 游戏列表 [{appid, name, playtime_forever, playtime_2weeks}]
 */
async function getOwnedGames(steamId, apiKey) {
  // 尝试多个端点
  const endpoints = [
    `${config.steamApiBase}/IPlayerService/GetOwnedGames/v1/`,
    `${config.steamApiBase}/IPlayerService/GetOwnedGames/v0001/`,
    `${config.steamApiBase}/ISteamUserStats/GetOwnedGames/v1/`,
    `${config.steamApiBase}/ISteamUserStats/GetOwnedGames/v0001/`
  ];

  const errors = [];
  let response = null;

  for (const url of endpoints) {
    try {
      response = await apiClient.get(url, {
        params: {
          key: apiKey,
          steamid: steamId,
          include_appinfo: true,
          include_played_free_games: true,
          format: 'json'
        },
        timeout: config.apiTimeout
      });
      if (response.data?.response?.games) break;
    } catch (e) {
      errors.push(`${url} -> ${e.response?.status || e.code || e.message}`);
    }
  }

  if (!response || !response.data?.response?.games) {
    throw new Error(`Steam API 所有端点均失败:\n${errors.join('\n')}\n\n请检查: 1) Clash Verge 是否开启 2) API Key 是否正确 3) Steam ID 是否为 64 位数字ID`);
  }

  const games = response.data.response.games;

  return games.map(game => ({
    appid: game.appid,
    name: game.name || '未知游戏',
    playtime_forever: game.playtime_forever || 0,
    playtime_2weeks: game.playtime_2weeks || 0,
    img_icon_url: game.img_icon_url || null,
    img_logo_url: game.img_logo_url || null,
    has_community_visible_stats: game.has_community_visible_stats || false
  }));
}

/**
 * 从本地缓存或 Steam API 获取游戏类型
 * @param {Array} games - 游戏列表
 * @returns {Promise<Map>} appid -> genres 的映射
 */
async function getGameGenres(games) {
  // 加载已有缓存
  let genreCache = new Map();
  if (fs.existsSync(CACHE_FILE)) {
    try {
      const cached = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8'));
      genreCache = new Map(Object.entries(cached));
    } catch (e) {
      // 缓存损坏则忽略
    }
  }

  // 找出未缓存 appid 的游戏
  const uncached = games.filter(g => !genreCache.has(String(g.appid)));

  if (uncached.length > 0) {
    console.log(`正在获取 ${uncached.length} 个游戏的类型信息...`);

    for (let i = 0; i < uncached.length; i++) {
      const game = uncached[i];
      try {
        await delay(config.requestDelay);
        const url = `${config.storeApiBase}/appdetails`;
        const response = await apiClient.get(url, {
          params: { appids: game.appid, cc: 'cn', l: 'schinese' },
        timeout: config.storeTimeout
        });

        const data = response.data?.[game.appid];
        if (data?.success && data.data?.genres) {
          genreCache.set(String(game.appid), data.data.genres.map(g => g.description));
        } else {
          genreCache.set(String(game.appid), []);
        }
      } catch (e) {
        // 单个游戏获取失败，标记为空
        genreCache.set(String(game.appid), []);
      }

      // 每20个游戏保存一次缓存
      if (i % 20 === 0 && i > 0) {
        saveCache(genreCache);
      }
    }

    // 保存完整缓存
    saveCache(genreCache);
  }

  // 返回请求的游戏类型
  const result = new Map();
  for (const game of games) {
    const genres = genreCache.get(String(game.appid)) || [];
    result.set(game.appid, genres);
  }

  return result;
}

/**
 * 保存类型缓存到文件
 */
function saveCache(genreCache) {
  try {
    const obj = Object.fromEntries(genreCache);
    fs.writeFileSync(CACHE_FILE, JSON.stringify(obj, null, 2), 'utf-8');
  } catch (e) {
    console.error('保存缓存失败:', e.message);
  }
}

/**
 * 获取玩家摘要信息
 * @param {string} steamId - Steam 64位ID
 * @param {string} apiKey - Steam Web API Key
 * @returns {Promise<Object>} 玩家信息
 */
async function getPlayerSummary(steamId, apiKey) {
  const apiUrls = [
    `${config.steamApiBase}/ISteamUser/GetPlayerSummaries/v2`,
    `${config.steamApiBase}/ISteamUser/GetPlayerSummaries/v0002`
  ];

  const playerErrors = [];
  let response = null;

  for (const url of apiUrls) {
    try {
      response = await apiClient.get(url, {
        params: { key: apiKey, steamids: steamId, format: 'json' },
        timeout: config.apiTimeout
      });
      if (response.data?.response?.players?.length > 0) break;
    } catch (e) {
      playerErrors.push(`${url} -> ${e.response?.status || e.code}`);
    }
  }

  const players = response?.data?.response?.players;
  if (!players || players.length === 0) {
    console.error('获取玩家信息失败:', playerErrors.join(' | '));
    return null;
  }
  if (!players || players.length === 0) {
    return null;
  }

  const player = players[0];
  return {
    name: player.personaname,
    avatar: player.avatarmedium,
    profileUrl: player.profileurl,
    level: player.communityvisibilitystate
  };
}

/**
 * 从 Steam 商店搜索推荐游戏
 * @param {string} genre - 游戏类型
 * @param {Array} ownedAppIds - 用户已拥有的 appid 列表
 * @param {string} apiKey - Steam API Key
 * @returns {Promise<Array>} 推荐游戏列表
 */
async function getRecommendedGames(genre, ownedAppIds, apiKey) {
  try {
    await delay(config.requestDelay);
    // 使用 Steam 商店搜索
    const url = `${config.storeApiBase}/appdetails`;

    // 先获取该类型下的一些热门游戏
    // 用 Steam 的 GetAppList 获取所有应用列表来按类型筛选不太可行
    // 改用 SteamSpy 热门游戏数据或商店搜索

    // 这里使用 store.steampowered.com 的标签搜索功能
    const searchUrl = `https://store.steampowered.com/api/getrecommendations`;
    // 简化为返回按类型推荐的逻辑
    // 实际上 Steam 没有直接的 "按类型推荐" API，需要组合查询

    // 替代方案: 通过 Steam 标签搜索
    const tagUrl = `https://store.steampowered.com/api/tagdetails/${encodeURIComponent(genre)}`;
    const tagResponse = await apiClient.get(tagUrl, { timeout: 5000 });
    const tagData = tagResponse.data;

    if (tagData?.success && tagData?.tags) {
      // 提取热门游戏并过滤已拥有的
      const recommendations = tagData.tags
        .filter(item => !ownedAppIds.includes(item.appid))
        .slice(0, 10)
        .map(item => ({
          appid: item.appid,
          name: item.name,
          count: item.count
        }));
      return recommendations;
    }

    return [];
  } catch (e) {
    console.error(`获取 ${genre} 推荐失败:`, e.message);
    return [];
  }
}

module.exports = {
  apiClient,
  getOwnedGames,
  getGameGenres,
  getPlayerSummary,
  getRecommendedGames
};
