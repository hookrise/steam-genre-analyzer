// 存储分析结果
let analysisData = null;
let genreChart = null;

/**
 * 开始分析
 */
async function startAnalysis() {
  const steamId = document.getElementById('steamId').value.trim();
  const apiKey = document.getElementById('apiKey').value.trim();

  if (!steamId || !apiKey) {
    showError('请填写 Steam ID 和 API Key');
    return;
  }

  // 显示加载
  document.getElementById('loading').classList.remove('hidden');
  document.getElementById('analyze-btn').disabled = true;
  document.getElementById('analyze-btn').textContent = '分析中...';

  // 隐藏旧结果
  hideSections();

  try {
    // 并行获取分析和推荐
    const [analysisRes, recommendRes] = await Promise.all([
      fetch(`/api/analyze?steamId=${encodeURIComponent(steamId)}&key=${encodeURIComponent(apiKey)}`),
      fetch(`/api/recommend?steamId=${encodeURIComponent(steamId)}&key=${encodeURIComponent(apiKey)}`)
    ]);

    const analysis = await analysisRes.json();
    const recommend = await recommendRes.json();

    if (!analysis.success) {
      showError(analysis.error || '分析失败');
      return;
    }

    analysisData = analysis.data;

    // 显示结果
    displayResults(analysis.data, recommend.data);
  } catch (err) {
    showError('网络错误，请检查服务器是否运行');
  } finally {
    document.getElementById('loading').classList.add('hidden');
    document.getElementById('analyze-btn').disabled = false;
    document.getElementById('analyze-btn').textContent = '开始分析';
  }
}

/**
 * 显示结果
 */
function displayResults(analysis, recommend) {
  // 玩家信息
  if (analysis.player) {
    showPlayerInfo(analysis.player);
  }

  // 概览
  showOverview(analysis);

  // 图表
  showChart(analysis.genreBreakdown);

  // 子类型占比
  showSubGenres(analysis.genreBreakdown);

  // 推荐
  showRecommendations(recommend);

  // 游戏列表
  showGamesList(analysis.games);

  // 滚动到结果
  document.getElementById('player-section').scrollIntoView({ behavior: 'smooth' });
}

/**
 * 显示玩家信息
 */
function showPlayerInfo(player) {
  document.getElementById('player-avatar').src = player.avatar || 'https://steamcdn-a.akamaihd.net/steamcommunity/public/images/avatars/default.jpg';
  document.getElementById('player-name').textContent = player.name || '未知玩家';
  document.getElementById('player-stats').textContent =
    `游戏库: ${analysisData.totalGames} 款游戏 | 总时长: ${formatTotalHours(analysisData.totalHours)}`;
  document.getElementById('player-section').classList.remove('hidden');
}

/**
 * 显示概览
 */
function showOverview(analysis) {
  const container = document.getElementById('overview-content');
  container.innerHTML = `
    <div class="overview-item">
      <div class="number">${analysis.totalGames}</div>
      <div class="label">已玩游戏</div>
    </div>
    <div class="overview-item">
      <div class="number">${formatTotalHours(analysis.totalHours)}</div>
      <div class="label">总游玩时长</div>
    </div>
    <div class="overview-item">
      <div class="number">${analysis.genreBreakdown.length}</div>
      <div class="label">游戏类型</div>
    </div>
    <div class="overview-item">
      <div class="number" style="color: ${analysis.topGenre?.color || '#66aaff'}">${analysis.topGenre?.genreCn || '-'}</div>
      <div class="label">最爱类型</div>
    </div>
  `;
  document.getElementById('overview-section').classList.remove('hidden');
}

/**
 * 显示主类型饼图
 */
function showChart(genreBreakdown) {
  if (genreChart) {
    genreChart.destroy();
  }

  const ctx = document.getElementById('genreChart').getContext('2d');

  const labels = genreBreakdown.map(g => g.genreCn);
  const data = genreBreakdown.map(g => g.hours);
  const colors = genreBreakdown.map(g => g.color);

  genreChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        data: data,
        backgroundColor: colors,
        borderColor: '#1a1a2e',
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: 'right',
          labels: {
            color: '#aabbcc',
            font: { size: 12 }
          }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const item = genreBreakdown[context.dataIndex];
              return `${item.genreCn}: ${formatTotalHours(item.hours)} (${item.percentage}%)`;
            }
          }
        }
      }
    }
  });

  document.getElementById('chart-section').classList.remove('hidden');
}

/**
 * 显示子类型占比
 */
function showSubGenres(genreBreakdown) {
  const container = document.getElementById('subgenre-content');
  const topCategories = genreBreakdown.slice(0, 5);

  let html = '';
  for (const cat of topCategories) {
    if (!cat.subGenres || cat.subGenres.length === 0) continue;

    const maxSubHours = Math.max(...cat.subGenres.map(s => s.hours), 1);

    html += `
      <div class="subgenre-category">
        <div class="subgenre-header">
          <span class="subgenre-title" style="color: ${cat.color}">${cat.genreCn}</span>
          <span class="subgenre-total">${formatTotalHours(cat.hours)}</span>
        </div>
        <div class="subgenre-bars">
          ${cat.subGenres.map(sub => `
            <div class="subgenre-row">
              <span class="subgenre-name">${sub.name}</span>
              <div class="subgenre-bar-track">
                <div class="subgenre-bar-fill" style="width: ${(sub.hours / maxSubHours) * 100}%; background: ${cat.color}"></div>
              </div>
              <span class="subgenre-stat">${formatTotalHours(sub.hours)} · ${sub.percentage}%</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  if (html) {
    container.innerHTML = html;
    document.getElementById('subgenre-section').classList.remove('hidden');
  }
}

/**
 * 显示推荐（含封面图）
 */
function showRecommendations(data) {
  const container = document.getElementById('recommend-content');

  if (!data.recommendations || data.recommendations.length === 0) {
    container.innerHTML = '<p style="color: #667788">暂无推荐</p>';
    document.getElementById('recommend-section').classList.remove('hidden');
    return;
  }

  let html = '';
  for (const cat of data.recommendations) {
    html += `
      <div class="recommend-category">
        <h3 style="color: ${cat.color || '#66aaff'}; border-bottom-color: ${cat.color || '#66aaff'}">
          ${cat.genreCn}
        </h3>
        ${cat.games.map(game => `
          <div class="recommend-item">
            <img class="recommend-cover" src="https://steamcdn-a.akamaihd.net/steam/apps/${game.appid}/header.jpg" alt="${game.name}" loading="lazy" onerror="this.style.display='none'">
            <div class="recommend-info">
              <div class="game-name">${game.name}</div>
              <div class="game-desc">${game.description || ''}</div>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  container.innerHTML = html;
  document.getElementById('recommend-section').classList.remove('hidden');
}

/**
 * 显示游戏列表
 */
function showGamesList(games) {
  const container = document.getElementById('games-list');
  const count = document.getElementById('game-count');

  analysisData._games = games;
  count.textContent = `${games.length} 款游戏`;

  renderGames(games);
  document.getElementById('games-section').classList.remove('hidden');
}

/**
 * 渲染游戏列表（含封面图和分类标签）
 */
function renderGames(games) {
  const container = document.getElementById('games-list');
  container.innerHTML = games.map(game => `
    <div class="game-item">
      <img class="game-cover" src="https://steamcdn-a.akamaihd.net/steam/apps/${game.appid}/header.jpg" alt="${game.name}" loading="lazy" onerror="this.style.display='none'">
      <div class="game-info">
        <div class="game-name">${game.name}</div>
        <div class="game-genres">
          <span class="genre-tag" style="background: ${getTagColor(game.category)}">${game.categoryName || '未分类'}</span>
          ${game.subGenre && game.subGenre !== '未分类' && game.subGenre !== '未细分' ? `<span class="genre-tag genre-tag-sub">${game.subGenre}</span>` : ''}
          ${(game.genres || []).filter(t => !isSkipTag(t)).join(' · ') || ''}
        </div>
      </div>
      <div class="game-hours">${formatHours(game.playtime)}</div>
    </div>
  `).join('');
}

/** 跳过非类型标签 */
function isSkipTag(tag) {
  const skip = ['Free to Play','Free To Play','Early Access','Animation & Modeling',
    'Design & Illustration','Utilities','Audio Production','Video Production',
    'Photo Editing','Web Publishing','Education','Software Training','Accounting'];
  return skip.includes(tag);
}

/** 获取分类标签颜色 */
function getTagColor(category) {
  const colors = {
    'action': '#e74c3c', 'rpg': '#9b59b6', 'strategy': '#2ecc71',
    'adventure': '#3498db', 'simulation': '#f39c12', 'puzzle': '#1abc9c',
    'shooter': '#e67e22', 'sports_racing': '#e91e63', 'casual': '#95a5a6',
    'sandbox': '#2c3e50', 'party': '#fd79a8', 'indie': '#636e72'
  };
  return colors[category] || '#666';
}

/**
 * 过滤游戏列表
 */
function filterGames() {
  const query = document.getElementById('game-search').value.toLowerCase();
  if (!analysisData?._games) return;

  const filtered = analysisData._games.filter(game =>
    game.name.toLowerCase().includes(query)
  );
  renderGames(filtered);
}

/**
 * 隐藏所有结果区域
 */
function hideSections() {
  ['player-section', 'overview-section', 'chart-section', 'subgenre-section', 'recommend-section', 'games-section'].forEach(id => {
    document.getElementById(id).classList.add('hidden');
  });
}

/**
 * 格式化分钟 → 显示用（用于单个游戏时长）
 */
function formatHours(minutes) {
  if (!minutes || minutes <= 0) return '0 小时';
  const hours = Math.round(minutes / 60);
  if (hours < 1) return '< 1 小时';
  return `${hours} 小时`;
}

/**
 * 格式化已换算好的小时数（用于总时长、类型时长）
 */
function formatTotalHours(hours) {
  if (!hours || hours <= 0) return '0 小时';
  return `${Math.round(hours)} 小时`;
}

/**
 * 显示错误
 */
function showError(msg) {
  alert(msg);
}

// 支持回车提交
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('apiKey').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') startAnalysis();
  });
  document.getElementById('steamId').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') document.getElementById('apiKey').focus();
  });
});
