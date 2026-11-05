/* MultiGameAssistant 官网 — 版本发布页 */
(function () {
  'use strict';

  var R = window.MGAReleases;
  var latestEl = document.getElementById('relLatest');
  var historyEl = document.getElementById('relHistory');
  var statsEl = document.getElementById('relStats');
  if (!latestEl || !historyEl) return;

  /* ============================================================
     Safe mini markdown renderer
     ============================================================ */
  function escHtml(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function mdInline(s) {
    return escHtml(s)
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  }
  /* the release body ends with a「下载」list that only repeats the asset names —
     the page already shows real download buttons, so that section is dropped */
  function stripDownloads(md) {
    return md.replace(/\r\n?/g, '\n').replace(/\n#{1,6}\s*下载\s*\n[\s\S]*$/, '\n');
  }
  function renderMarkdown(md) {
    if (!md) return '<p>（无更新说明）</p>';
    var lines = stripDownloads(md).split('\n');
    var html = '', inList = false, inCode = false, para = [], code = [];
    function flushPara() {
      if (para.length) { html += '<p>' + para.map(mdInline).join('<br>') + '</p>'; para = []; }
    }
    function closeList() {
      if (inList) { html += '</ul>'; inList = false; }
    }
    lines.forEach(function (line) {
      var t = line.trim();
      if (/^```/.test(t)) {
        if (inCode) { html += '<pre><code>' + escHtml(code.join('\n')) + '</code></pre>'; code = []; inCode = false; }
        else { flushPara(); closeList(); inCode = true; }
        return;
      }
      if (inCode) { code.push(line); return; }
      var h = t.match(/^(#{1,6})\s+(.*)$/);
      var li = t.match(/^[-*]\s+(.*)$/);
      if (h) {
        flushPara(); closeList();
        var lv = Math.min(h[1].length + 1, 4);
        html += '<h' + lv + '>' + mdInline(h[2]) + '</h' + lv + '>';
      } else if (li) {
        flushPara();
        if (!inList) { html += '<ul>'; inList = true; }
        html += '<li>' + mdInline(li[1]) + '</li>';
      } else if (t === '') {
        flushPara(); closeList();
      } else {
        closeList();
        para.push(t);
      }
    });
    if (inCode) html += '<pre><code>' + escHtml(code.join('\n')) + '</code></pre>';
    flushPara(); closeList();
    return html || '<p>（无更新说明）</p>';
  }

  /* ============================================================
     Rendering
     ============================================================ */
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  }
  function version(rel) { return rel.tag_name.replace(/^v/, ''); }

  function assetInfo(name) {
    var arch = MGADownloads.assetArchitecture(name);
    if (arch === 'arm64') return { label: 'Windows ARM64', note: '骁龙等 ARM 处理器的电脑' };
    if (arch === 'x64') return { label: 'Windows x64', note: '大多数电脑' };
    if (/^dsh-multigameassistant(-.*)?\.tgz$/i.test(name)) return { label: 'dsh 插件包', note: '已经装了 dsh 时使用' };
    return { label: name, note: '' };
  }

  /* installers first (x64, ARM64), then the dsh plugin, then anything else */
  function assetRank(name) {
    var arch = MGADownloads.assetArchitecture(name);
    return arch === 'x64' ? 0 : arch === 'arm64' ? 1 : /\.tgz$/i.test(name) ? 2 : 3;
  }

  /* dsh-multigameassistant.tgz is the versioned package again under a fixed name, for the always-latest link */
  function withoutAlias(assets) {
    var versioned = assets.some(function (a) { return /^dsh-multigameassistant-.+\.tgz$/i.test(a.name); });
    return assets.filter(function (a) { return !(versioned && /^dsh-multigameassistant\.tgz$/i.test(a.name)); });
  }

  function buildAssets(assets) {
    var wrap = el('div', 'rel-assets');
    withoutAlias(assets || []).sort(function (a, b) { return assetRank(a.name) - assetRank(b.name); }).forEach(function (a) {
      if (!/^https:\/\//i.test(a.browser_download_url || '')) return;
      var info = assetInfo(a.name);
      var link = el('a', 'rel-asset');
      link.href = a.browser_download_url;
      link.rel = 'noopener';
      var text = el('span', 'rel-asset-text');
      text.appendChild(el('b', null, info.label));
      if (info.note) text.appendChild(el('small', null, info.note));
      link.appendChild(text);
      link.appendChild(el('span', 'rel-asset-meta', fmtMeta(a)));
      link.title = a.name;
      wrap.appendChild(link);
    });
    if (!wrap.children.length) {
      var none = el('a', 'rel-asset');
      none.href = R.RELEASES_PAGE;
      none.target = '_blank';
      none.rel = 'noopener';
      none.appendChild(el('b', null, '前往 GitHub 发布页下载'));
      wrap.appendChild(none);
    }
    return wrap;
  }
  function fmtMeta(a) { return R.fmtSize(a.size); }

  function renderLatest(rel) {
    document.getElementById('relLatestTag').textContent = rel.tag_name;
    document.getElementById('relLatestBadge').textContent = rel.prerelease ? '预发布' : '最新正式版';
    document.getElementById('relLatestBadge').classList.toggle('pre', !!rel.prerelease);
    document.getElementById('relLatestDate').textContent = R.fmtDate(rel.published_at);
    document.getElementById('relLatestName').textContent = rel.name && rel.name !== rel.tag_name ? rel.name : 'MultiGameAssistant ' + version(rel);
    var notes = document.getElementById('relLatestNotes');
    notes.innerHTML = renderMarkdown(rel.body); /* renderMarkdown 内部先转义，仅接受 http/https 链接 */
    document.getElementById('relLatestAssets').replaceChildren(buildAssets(rel.assets));
    var gh = document.getElementById('relLatestGithub');
    if (gh && /^https:\/\//i.test(rel.html_url || '')) gh.href = rel.html_url;
    latestEl.classList.remove('is-loading');
  }

  function renderHistory(releases, latest) {
    historyEl.replaceChildren();
    releases.forEach(function (rel) {
      var det = el('details', 'rel-item');
      det.id = rel.tag_name;
      var sum = document.createElement('summary');
      sum.appendChild(el('span', 'rel-item-dot'));
      sum.appendChild(el('span', 'rel-item-tag', rel.tag_name));
      if (rel === latest) sum.appendChild(el('span', 'rel-badge', '最新'));
      if (rel.prerelease) sum.appendChild(el('span', 'rel-badge pre', '预发布'));
      sum.appendChild(el('span', 'rel-item-name', rel.name && rel.name !== rel.tag_name ? rel.name : ''));
      sum.appendChild(el('span', 'rel-item-date', R.fmtDate(rel.published_at)));
      sum.appendChild(el('span', 'rel-item-plus', '+'));
      det.appendChild(sum);
      var body = el('div', 'rel-item-body');
      var notes = el('div', 'rel-notes');
      notes.innerHTML = renderMarkdown(rel.body);
      body.appendChild(notes);
      body.appendChild(buildAssets(rel.assets));
      var link = el('a', 'rel-permalink', '本版本链接 #' + rel.tag_name);
      link.href = '#' + rel.tag_name;
      body.appendChild(link);
      det.appendChild(body);
      historyEl.appendChild(det);
    });
    openFromHash();
  }

  function openFromHash() {
    var id = decodeURIComponent(location.hash.slice(1));
    if (!/^v\d/.test(id)) return;
    var target = document.getElementById(id);
    if (!target || target.tagName !== 'DETAILS') return;
    target.open = true;
    target.scrollIntoView({ block: 'start' });
  }
  window.addEventListener('hashchange', openFromHash);

  function renderStats(releases, source) {
    statsEl.replaceChildren();
    var count = el('span', null);
    count.appendChild(el('b', null, String(releases.length)));
    count.appendChild(document.createTextNode('个公开版本'));
    statsEl.appendChild(count);
    statsEl.appendChild(el('span', null, 'SOURCE // ' + source));
  }

  function renderState(title, msg, isError) {
    var box = el('div', 'rel-state' + (isError ? ' is-error' : ''));
    box.appendChild(el('strong', null, title));
    box.appendChild(el('p', null, msg));
    var a = el('a', 'btn btn-outline');
    a.href = R.RELEASES_PAGE;
    a.target = '_blank';
    a.rel = 'noopener';
    a.appendChild(el('span', 'btn-label', '前往 GitHub 发布页'));
    box.appendChild(a);
    latestEl.classList.remove('is-loading');
    latestEl.classList.add('is-empty');
    latestEl.replaceChildren(box);
    historyEl.replaceChildren();
    statsEl.replaceChildren();
  }

  /* ============================================================
     Downloads + data
     ============================================================ */
  var setReleases = R.bindDownloads(function (choice) {
    var btn = document.getElementById('relDownload');
    btn.href = choice.href;
    btn.querySelector('.btn-label').textContent = choice.label;
    var hint = document.getElementById('downloadHint');
    hint.textContent = choice.hint;
    hint.classList.toggle('is-warn', choice.warn);
  });

  R.load(function (releases, source) {
    if (!releases.length) {
      renderState('暂无发布版本', '仓库还没有公开发布的版本，可以去 GitHub 查看进展。', false);
      return;
    }
    var latest = MGADownloads.latest(releases);
    R.fillVersion(latest);
    renderStats(releases, source);
    renderLatest(latest);
    renderHistory(releases, latest);
    setReleases(releases);
  }, function () {
    renderState('暂时无法获取版本信息', 'GitHub API 与本站快照均无法访问（API 未登录每小时限 60 次）。可直接前往发布页下载。', true);
  });
})();
