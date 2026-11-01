/* MultiGameAssistant 宣传站 — vanilla JS，GitHub Pages 静态运行 */
(function () {
  'use strict';
  var REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (REDUCED) document.documentElement.classList.add('no-motion');
  function pad(n) { return n < 10 ? '0' + n : '' + n; }

  /* mobile menu */
  var burger = document.getElementById('burger');
  var mobileMenu = document.getElementById('mobileMenu');
  function setMenu(open, restoreFocus) {
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? '关闭菜单' : '打开菜单');
    burger.textContent = open ? '关闭 ×' : '目录 +';
    mobileMenu.hidden = !open;
    document.body.style.overflow = open ? 'hidden' : '';
    if (open) updateSection();
    if (open) { var a = mobileMenu.querySelector('a.is-active') || mobileMenu.querySelector('a'); if (a) a.focus(); }
    else if (restoreFocus) burger.focus();
  }
  burger.addEventListener('click', function () { setMenu(mobileMenu.hidden); });
  mobileMenu.querySelectorAll('a').forEach(function (a) { a.addEventListener('click', function () { setMenu(false); }); });
  window.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !mobileMenu.hidden) setMenu(false, true); });
  window.matchMedia('(min-width: 769px)').addEventListener('change', function (e) { if (e.matches) setMenu(false); });

  /* chapter sync: left rail + mobile menu, both directions */
  var navLinks = Array.prototype.slice.call(document.querySelectorAll('.rail-item, .mobile-menu > a[data-section]'));
  var sections = Array.prototype.slice.call(document.querySelectorAll('main > .section'));
  var currentId = '';
  function markSection(id) {
    if (id === currentId) return;
    currentId = id;
    navLinks.forEach(function (a) {
      var on = a.dataset.section === id;
      a.classList.toggle('is-active', on);
      if (on) a.setAttribute('aria-current', 'location'); else a.removeAttribute('aria-current');
    });
    var s = document.getElementById(id);
    if (s) s.classList.add('is-entered');
  }
  function updateSection() {
    var y = window.innerHeight * 0.42, cur = sections[0];
    sections.forEach(function (s) { if (s.getBoundingClientRect().top <= y) cur = s; });
    if (cur) markSection(cur.id);
  }
  var navTick = false;
  window.addEventListener('scroll', function () {
    if (navTick) return; navTick = true;
    requestAnimationFrame(function () { updateSection(); navTick = false; });
  }, { passive: true });
  window.addEventListener('resize', updateSection);
  navLinks.forEach(function (a) { a.addEventListener('click', function () { markSection(a.dataset.section); }); });
  updateSection();

  /* features */
  var FEATURE_DATA = [
    {
      zh: '脚本', en: 'SCRIPTS // MODULE-01',
      items: [
        ['任意脚本', 'agent 读说明和代码，写成「脚本包」草稿。'],
        ['本地导入的脚本也能更新', '识别版本、按更新渠道在原目录更新；替换文件先备份、配置不动、可一键撤销。'],
        ['从 Mirror酱 直接安装', '按游戏名或工具名搜索安装。'],
        ['一键安装', '从 GitHub 安装内置脚本，可更新、回滚、删除；续传、校验、安全解压；自动补运行环境；可换下载镜像。'],
        ['本地配置副本 & 多份配置', '大号、小号或不同任务组合互不影响。'],
        ['模拟器', '自动检测 MuMu 及多开实例，其他模拟器可填 ADB 地址。'],
        ['Mirror酱', '填 CDK 后增量更新，国内下载快；CDK 不可用时自动改回 GitHub。']
      ]
    },
    {
      zh: '编排与定时', en: 'PIPELINE // MODULE-02',
      items: [
        ['流水线画布', '脚本任务、agent 步骤、等待、发消息、人工确认连成图；不冲突的并行执行，抢同一模拟器 / 屏幕的自动排队；失败可重试、跳过或停下。'],
        ['运行前检查', '成环、找不到的脚本或任务、参数不对，跑之前先查出来。'],
        ['定时', '每天定点运行；错过的时间在宽限内补跑；同天成功不重复；夏令时不出错。'],
        ['无人值守', '开机自启进托盘、运行期间不睡眠、定时唤醒、跑完关游戏 / 模拟器 / 睡眠 / 关机。'],
        ['用说的也行', '也可以直接对 agent 说「帮我把这几个脚本排成每天早上跑的流程」。']
      ]
    },
    {
      zh: '监控与干预', en: 'MONITOR // MODULE-03',
      items: [
        ['自动处理', '出错、失败、卡住、超时，先按脚本包写好的办法自动处理：重跑、等待、重启模拟器。'],
        ['agent 接管', '处理不了时脚本暂停交给 agent：截图看画面、点击输入排除问题后让脚本继续；也可以只诊断不动手。'],
        ['全程留痕', '每一步都有记录并推送飞书，卡片按钮可停止、继续或回答 agent。']
      ]
    },
    {
      zh: '游戏信息', en: 'INTEL // MODULE-04',
      items: [
        ['活动日历', '还剩几天、商店换完没、快结束没做的，一眼看到。'],
        ['三种数据来源', '数据站（SRA 公共 API、PRTS、B 站游戏 WIKI，每天自动读，不花模型调用）；网页（agent 读官网公告或任意网址）；游戏画面（agent 进游戏看实际进度）。'],
        ['游戏页', '版本大图、我的状态、活动卡片倒计时、全部活动时间轴。'],
        ['更多游戏', 'SRA 公共 API 支持的 18 个游戏，其他输入名字 agent 自动建游戏包。'],
        ['每日日报', '当天做了什么、游戏进度如何，汇总后发飞书。']
      ]
    },
    {
      zh: 'Agent', en: 'AGENT // MODULE-05',
      items: [
        ['模型自选', 'DeepSeek、Claude、ChatGPT、Gemini、国内各家、本机 Ollama；核心是 DeepSeek Harness。'],
        ['斜杠命令', '/技能、/资讯、/编排、/诊断、/<技能名>。'],
        ['技能库', '做成的事存成技能；技能库按需下载，可看差异合并。'],
        ['对话细节', '回复风格可调、对话压缩、时间感知。'],
        ['权限', '「每次确认」沙箱 /「完全访问」，按范围逐项允许、先问我、不允许。']
      ]
    },
    {
      zh: '飞书', en: 'FEISHU // MODULE-06',
      items: [
        ['长连接机器人', '飞书机器人走长连接，不需要公网地址；接收通知、日报和确认卡片。'],
        ['飞书里直接对话', '「现在什么状态」「把日常跑一下」——和软件里是同一个 agent。'],
        ['接入步骤', '见软件内「设置 → 飞书 → 第一次使用」。']
      ]
    }
  ];
  var QUOTES = ['“让脚本成为可管理的工作单元。”', '“把依赖、时间和资源冲突交给流水线。”', '“异常先按规则处理，再交给 Agent 接管。”', '“活动、商店和截止时间，集中成一张情报表。”', '“同一个 Agent，读懂、编排、诊断。”', '“离开电脑，也能确认状态并继续运行。”'];
  var featPanelZh = document.getElementById('featPanelZh');
  var featPanelEn = document.getElementById('featPanelEn');
  var featPanelIdx = document.getElementById('featPanelIdx');
  var featPanelBody = document.getElementById('featPanelBody');
  var featCounter = document.getElementById('featureCounter');
  var featQuote = document.getElementById('featureQuote');
  var featIdx = -1;
  function renderFeature(i) {
    var d = FEATURE_DATA[i];
    featPanelIdx.textContent = pad(i + 1);
    featCounter.textContent = pad(i + 1) + ' / ' + pad(FEATURE_DATA.length);
    featPanelZh.textContent = d.zh;
    featPanelEn.textContent = d.en;
    featQuote.textContent = QUOTES[i];
    var ul = document.createElement('ul');
    d.items.forEach(function (item) {
      var li = document.createElement('li');
      li.className = 'feat-item';
      var t = document.createElement('span'); t.className = 'feat-item-title'; t.textContent = item[0];
      var s = document.createElement('span'); s.className = 'feat-item-text'; s.textContent = '：' + item[1];
      li.appendChild(t); li.appendChild(s); ul.appendChild(li);
    });
    featPanelBody.replaceChildren(ul);
  }
  window.MGAFeature = { data: FEATURE_DATA, set: function (i) { if (i === featIdx || !FEATURE_DATA[i]) return; featIdx = i; renderFeature(i); } };
  window.MGAFeature.set(0);

  function escHtml(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function mdInline(s) {
    return escHtml(s)
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  }
  function renderMarkdown(md) {
    if (!md) return '<p>（无更新说明）</p>';
    var lines = md.replace(/\r\n?/g, '\n').split('\n');
    var html = '', inList = false, para = [];
    function flushPara() {
      if (para.length) { html += '<p>' + para.map(mdInline).join('<br>') + '</p>'; para = []; }
    }
    function closeList() {
      if (inList) { html += '</ul>'; inList = false; }
    }
    lines.forEach(function (line) {
      var t = line.trim();
      var h = t.match(/^(#{1,6})\s+(.*)$/);
      var li = t.match(/^[-*]\s+(.*)$/);
      if (h) {
        flushPara(); closeList();
        var lv = Math.min(h[1].length, 3);
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
    flushPara(); closeList();
    return html || '<p>（无更新说明）</p>';
  }

  var API_URL = 'https://api.github.com/repos/haaahhhis/MultiGameAssistant/releases?per_page=20';
  var SNAPSHOT_URL = 'data/releases.json';
  var RELEASES_PAGE = 'https://github.com/haaahhhis/MultiGameAssistant/releases';
  var CACHE_KEY = 'mga_releases_v1';
  var CACHE_TTL = 10 * 60 * 1000;
  var featuredEl = document.getElementById('releasesFeatured');
  var listEl = document.getElementById('releasesList');
  var statsEl = document.getElementById('releasesStats');
  function fmtDate(iso) { var d = new Date(iso); return isNaN(d) ? '' : d.getFullYear() + '.' + pad(d.getMonth() + 1) + '.' + pad(d.getDate()); }
  function fmtSize(bytes) { if (!bytes && bytes !== 0) return ''; var mb = bytes / 1048576; return mb >= 100 ? Math.round(mb) + ' MB' : mb.toFixed(1) + ' MB'; }
  function assetLabel(name) { var arch = MGADownloads.assetArchitecture(name); return arch === 'arm64' ? 'WINDOWS / ARM64' : arch === 'x64' ? 'WINDOWS / x64' : name; }
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; }
  function buildAssets(assets) {
    var wrap = el('div', 'rel-assets');
    (assets || []).forEach(function (a) {
      var link = el('a', 'rel-asset'); link.href = a.browser_download_url; link.target = '_blank'; link.rel = 'noopener';
      link.appendChild(el('span', null, assetLabel(a.name))); link.appendChild(el('span', 'rel-asset-meta', fmtSize(a.size)));
      wrap.appendChild(link);
    });
    if (!wrap.children.length) { var none = el('a', 'rel-asset'); none.href = RELEASES_PAGE; none.target = '_blank'; none.rel = 'noopener'; none.appendChild(el('span', null, '前往发布页下载')); wrap.appendChild(none); }
    return wrap;
  }
  function renderFeatured(rel) {
    var card = el('article', 'rel-card'), head = el('div', 'rel-card-head');
    head.appendChild(el('span', 'rel-tag', rel.tag_name));
    head.appendChild(el('span', 'rel-badge', rel.prerelease ? 'PRE-RELEASE / 预发布' : 'LATEST / 最新'));
    head.appendChild(el('span', 'rel-date', fmtDate(rel.published_at)));
    card.appendChild(head);
    if (rel.name && rel.name !== rel.tag_name) card.appendChild(el('p', 'rel-name', rel.name));
    var notes = el('div', 'rel-notes'); notes.innerHTML = renderMarkdown(rel.body); /* renderMarkdown 先转义，仅接受 http/https 链接 */
    card.appendChild(notes); card.appendChild(buildAssets(rel.assets));
    featuredEl.replaceChildren(card);
  }
  function renderList(releases) {
    listEl.replaceChildren();
    if (!releases.length) listEl.appendChild(el('p', 'micro', '暂无更早版本。'));
    releases.forEach(function (rel) {
      var det = el('details', 'rel-item'), sum = document.createElement('summary');
      sum.appendChild(el('span', 'rel-item-tag', rel.tag_name));
      sum.appendChild(el('span', 'rel-item-name', rel.name || rel.tag_name));
      sum.appendChild(el('span', 'rel-item-meta', (rel.prerelease ? 'PRE · ' : 'STABLE · ') + (rel.assets || []).length + ' FILES'));
      sum.appendChild(el('span', 'rel-item-date', fmtDate(rel.published_at)));
      sum.appendChild(el('span', 'rel-item-plus', '+'));
      det.appendChild(sum);
      var body = el('div', 'rel-item-body'), notes = el('div', 'rel-notes'); notes.innerHTML = renderMarkdown(rel.body);
      body.appendChild(notes); body.appendChild(buildAssets(rel.assets)); det.appendChild(body); listEl.appendChild(det);
    });
  }
  function renderStats(releases, sourceLabel) {
    statsEl.replaceChildren();
    var s1 = el('span', null); s1.appendChild(el('b', null, String(releases.length))); s1.appendChild(document.createTextNode('个已发布版本'));
    statsEl.appendChild(s1); statsEl.appendChild(el('span', null, 'SOURCE // ' + sourceLabel));
  }
  function renderState(title, msg, withBtn) {
    var box = el('div', 'rel-state'); box.appendChild(el('strong', null, title)); box.appendChild(el('p', null, msg));
    if (withBtn) { var a = el('a', 'btn'); a.href = RELEASES_PAGE; a.target = '_blank'; a.rel = 'noopener'; a.appendChild(el('span', 'btn-label', '前往 GitHub 发布页 ↗')); box.appendChild(a); }
    featuredEl.replaceChildren(box); listEl.replaceChildren(); statsEl.replaceChildren();
    document.getElementById('specBuild').textContent = 'UNAVAILABLE';
  }

  /* downloads: default Windows x64, user can switch */
  var downloadMode = 'x64', detectedArchitecture = { arch: 'x64', detected: false }, downloadReleases = [];
  var archButtons = document.querySelectorAll('[data-download-arch]');
  archButtons.forEach(function (button) {
    button.addEventListener('click', function () {
      downloadMode = button.dataset.downloadArch;
      archButtons.forEach(function (b) { b.setAttribute('aria-pressed', String(b === button)); });
      updateDownloadLinks(downloadReleases);
    });
  });
  MGADownloads.detect(navigator).then(function (result) { detectedArchitecture = result; updateDownloadLinks(downloadReleases); });
  function archName(a) { return a === 'arm64' ? 'ARM64' : 'x64'; }
  function updateDownloadLinks(releases) {
    downloadReleases = releases;
    var arch = downloadMode === 'auto' ? detectedArchitecture.arch : downloadMode;
    document.getElementById('specArch').textContent = archName(arch);
    var latest = MGADownloads.latest(releases);
    if (!latest) return;
    var asset = MGADownloads.chooseAsset(latest, arch);
    var href = asset ? asset.browser_download_url : RELEASES_PAGE;
    var actual = asset ? MGADownloads.assetArchitecture(asset.name) : arch;
    var label = asset ? '下载 ' + latest.tag_name + ' · Windows ' + archName(actual) : '查看 ' + latest.tag_name + ' 下载';
    var hero = document.getElementById('heroDownload');
    hero.href = href; hero.querySelector('.btn-label').textContent = label;
    var mm = document.getElementById('mobileMenuDownload'); mm.href = href; mm.textContent = label;
    document.getElementById('specArch').textContent = archName(actual);
    document.getElementById('specBuild').textContent = latest.tag_name + ' · ' + fmtDate(latest.published_at);
    var hint = document.getElementById('downloadHint');
    if (!asset) hint.textContent = '该版本没有可匹配的 Windows 安装包，请在发布页选择；不会链接到旧版本。';
    else if (actual !== arch) hint.textContent = '该版本未提供 ARM64 包，已回退到 Windows x64；可在版本发布章查看全部文件。';
    else if (downloadMode === 'auto') hint.textContent = (detectedArchitecture.detected ? '已自动识别' : '无法识别或非 Windows 设备，使用') + ' Windows ' + archName(actual) + ' · 支持 Windows 10 / 11';
    else hint.textContent = (downloadMode === 'x64' ? '默认' : '已选择') + ' Windows ' + archName(actual) + (detectedArchitecture.detected && detectedArchitecture.arch !== actual ? ' · 当前设备识别为 ' + archName(detectedArchitecture.arch) + '，可切换' : '') + ' · 支持 Windows 10 / 11';
  }
  function handleReleases(releases, sourceLabel) {
    var visible = (releases || []).filter(function (r) { return r && !r.draft && typeof r.tag_name === 'string'; }).sort(function (a, b) { return (Date.parse(b.published_at) || 0) - (Date.parse(a.published_at) || 0); });
    if (!visible.length) { renderState('暂无发布版本', '仓库还没有公开发布的版本，可以去 GitHub 查看进展。', true); return; }
    renderStats(visible, sourceLabel);
    var latest = MGADownloads.latest(visible);
    renderFeatured(latest);
    renderList(visible.filter(function (r) { return r !== latest; }));
    updateDownloadLinks(visible);
  }
  function trimReleases(list) {
    return (list || []).map(function (r) {
      return {
        tag_name: r.tag_name,
        name: r.name,
        draft: r.draft,
        prerelease: r.prerelease,
        published_at: r.published_at,
        html_url: r.html_url,
        body: r.body,
        assets: (r.assets || []).map(function (a) {
          return {
            name: a.name,
            size: a.size,
            download_count: a.download_count,
            browser_download_url: a.browser_download_url
          };
        })
      };
    });
  }

  function fetchJson(url, timeoutMs, headers) {
    var ctrl = new AbortController();
    var timer = setTimeout(function () { ctrl.abort(); }, timeoutMs);
    return fetch(url, { signal: ctrl.signal, headers: headers || {} })
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .finally(function () { clearTimeout(timer); });
  }

  function fetchReleases() {
    try {
      var raw = sessionStorage.getItem(CACHE_KEY);
      if (raw) {
        var cached = JSON.parse(raw);
        if (cached && Date.now() - cached.t < CACHE_TTL && Array.isArray(cached.data)) {
          handleReleases(cached.data, 'GITHUB API');
          return;
        }
      }
    } catch (e) { /* ignore cache errors */ }

    fetchJson(API_URL, 6000, { 'Accept': 'application/vnd.github+json' })
      .then(function (data) {
        var trimmed = trimReleases(data);
        try {
          sessionStorage.setItem(CACHE_KEY, JSON.stringify({ t: Date.now(), data: trimmed }));
        } catch (e) { /* ignore */ }
        handleReleases(trimmed, 'GITHUB API');
      })
      .catch(function () {
        /* api.github.com 不可达（如大陆网络 / 超时 / 限流）→ 回退到仓库内快照 */
        fetchJson(SNAPSHOT_URL, 8000)
          .then(function (data) {
            handleReleases(trimReleases(data), '本站快照');
          })
          .catch(function () {
            renderState(
              '暂时无法获取版本信息',
              'GitHub API 与本站快照均无法访问（API 未登录每小时限 60 次）。可直接前往发布页下载。',
              true
            );
          });
      });
  }
  fetchReleases();
  document.getElementById('backToTop').addEventListener('click', function () {
    window.scrollTo({ top: 0, behavior: REDUCED ? 'auto' : 'smooth' });
    document.getElementById('home').querySelector('a, button').focus({ preventScroll: true });
  });

  /* pipeline demo: browser-only simulation */
  var board = document.getElementById('flowBoard');
  var stageEl = document.getElementById('flowStage');
  var inner = document.getElementById('flowStageInner');
  var edgesSvg = document.getElementById('flowEdges');
  var statusEl = document.getElementById('flowStatus');
  var logEl = document.getElementById('flowLog');
  var runBtn = document.getElementById('flowRun');
  var addBtn = document.getElementById('flowAdd');
  var blockBtn = document.getElementById('flowBlock');
  var progressEl = document.getElementById('flowProgress');
  var percentEl = document.getElementById('flowPercent');
  var SVG_NS = 'http://www.w3.org/2000/svg', STAGE_W = 560, STAGE_H = 400;
  var nodes = [
    { id: 't1', kind: '开始', marker: 'start', x: 18, y: 186, noIn: true },
    { id: 'n1', kind: '脚本任务', title: 'MAA · 日常任务', sub: '明日方舟', x: 112, y: 40 },
    { id: 'n2', kind: '脚本任务', title: '三月七小助手 · 材料速刷', sub: '崩坏：星穹铁道', x: 112, y: 168 },
    { id: 'n3', kind: '脚本任务', title: 'MaaEnd · 清体力', sub: '明日方舟：终末地', x: 112, y: 296 },
    { id: 'n5', kind: '发消息', title: '飞书日报', sub: '汇总执行结果', x: 326, y: 168 },
    { id: 'n4', kind: '结束', marker: 'end', x: 512, y: 186, noOut: true }
  ];
  var edges = [
    { id: 'e1', from: 't1', to: 'n1', when: '成功后' }, { id: 'e2', from: 't1', to: 'n2', when: '成功后' },
    { id: 'e3', from: 't1', to: 'n3', when: '成功后' }, { id: 'e4', from: 'n1', to: 'n5', when: '结束后' },
    { id: 'e5', from: 'n2', to: 'n5', when: '结束后' }, { id: 'e6', from: 'n3', to: 'n5', when: '结束后' },
    { id: 'e7', from: 'n5', to: 'n4', when: '结束后' }
  ];
  var nodeEls = {}, edgeEls = {}, addSeq = 0, running = false, blocked = false, releaseBlock = null, zoom = 1;
  function stageZoom() { zoom = stageEl.clientWidth / STAGE_W; inner.style.zoom = String(zoom); }
  window.addEventListener('resize', stageZoom);
  function mk(tag, cls, txt, parent) { var d = document.createElement(tag); if (cls) d.className = cls; if (txt != null) d.textContent = txt; if (parent) parent.appendChild(d); return d; }
  function nodeOf(id) { for (var i = 0; i < nodes.length; i++) if (nodes[i].id === id) return nodes[i]; }
  function select(id) { nodes.forEach(function (n) { nodeEls[n.id].classList.toggle('selected', n.id === id); }); }
  function portPos(n, out) { var e = nodeEls[n.id]; return { x: n.x + (out ? e.offsetWidth : 0), y: n.y + e.offsetHeight / 2 }; }
  function paintEdges() {
    edges.forEach(function (e) {
      var a = portPos(nodeOf(e.from), true), b = portPos(nodeOf(e.to), false), mx = (a.x + b.x) / 2;
      var d = 'M' + a.x + ' ' + a.y + ' C' + mx + ' ' + a.y + ', ' + mx + ' ' + b.y + ', ' + b.x + ' ' + b.y;
      edgeEls[e.id].base.setAttribute('d', d); edgeEls[e.id].pulse.setAttribute('d', d);
      edgeEls[e.id].label.setAttribute('x', mx); edgeEls[e.id].label.setAttribute('y', (a.y + b.y) / 2 - 4);
    });
  }
  function buildEdge(e) {
    var base = document.createElementNS(SVG_NS, 'path'), pulse = document.createElementNS(SVG_NS, 'path'), label = document.createElementNS(SVG_NS, 'text');
    base.setAttribute('class', 'flow-edge'); pulse.setAttribute('class', 'flow-pulse');
    label.setAttribute('class', 'flow-edge-label'); label.setAttribute('text-anchor', 'middle'); label.textContent = e.when;
    edgesSvg.appendChild(base); edgesSvg.appendChild(pulse); edgesSvg.appendChild(label);
    edgeEls[e.id] = { base: base, pulse: pulse, label: label };
  }
  function moveNode(n, x, y) {
    var d = nodeEls[n.id];
    n.x = Math.max(0, Math.min(STAGE_W - d.offsetWidth, x));
    n.y = Math.max(0, Math.min(STAGE_H - d.offsetHeight, y));
    d.style.left = n.x + 'px'; d.style.top = n.y + 'px';
    paintEdges();
  }
  function buildNode(n) {
    var d = mk('div', n.marker ? 'fl-node fl-marker ' + n.marker : 'fl-node', null, inner), st;
    d.dataset.id = n.id; d.tabIndex = 0; d.setAttribute('role', 'button');
    d.setAttribute('aria-label', (n.title || n.kind) + '，方向键移动节点');
    d.style.left = n.x + 'px'; d.style.top = n.y + 'px';
    if (!n.noIn) mk('i', 'fl-port fl-in', null, d);
    if (n.marker) { mk('span', null, n.kind, d); st = mk('span', 'fl-state', '', d); }
    else {
      var k = mk('div', 'fl-kind', null, d); mk('span', null, n.kind, k); st = mk('span', 'fl-state', '就绪', k);
      mk('div', 'fl-title', n.title, d); if (n.sub) mk('div', 'fl-sub', n.sub, d);
    }
    if (!n.noOut) mk('i', 'fl-port fl-out', null, d);
    d._stateEl = st; nodeEls[n.id] = d;
    d.addEventListener('focus', function () { select(n.id); });
    d.addEventListener('keydown', function (e) {
      var step = e.shiftKey ? 32 : 8, dx = { ArrowLeft: -step, ArrowRight: step }[e.key] || 0, dy = { ArrowUp: -step, ArrowDown: step }[e.key] || 0;
      if ((!dx && !dy) || running) return;
      e.preventDefault(); moveNode(n, n.x + dx, n.y + dy); statusEl.textContent = '就绪 / 已移动节点';
    });
    d.addEventListener('pointerdown', function (ev) {
      if (ev.button !== 0 || running) return;
      ev.preventDefault(); d.focus({ preventScroll: true }); d.setPointerCapture(ev.pointerId); d.classList.add('dragging');
      var sx = ev.clientX, sy = ev.clientY, ox = n.x, oy = n.y;
      function mv(e2) { moveNode(n, ox + (e2.clientX - sx) / zoom, oy + (e2.clientY - sy) / zoom); }
      function up() { d.classList.remove('dragging'); d.removeEventListener('pointermove', mv); d.removeEventListener('pointerup', up); d.removeEventListener('pointercancel', up); }
      d.addEventListener('pointermove', mv); d.addEventListener('pointerup', up); d.addEventListener('pointercancel', up);
    });
  }
  function log(line) { logEl.textContent += '\n' + line; logEl.scrollTop = logEl.scrollHeight; }
  function setProgress(v) { v = Math.round(v); progressEl.value = v; progressEl.textContent = v + '%'; percentEl.textContent = v + '%'; }
  addBtn.addEventListener('click', function () {
    if (running) return;
    addSeq++;
    var n = { id: 'u' + addSeq, kind: '脚本任务', title: '新任务 ' + addSeq, sub: 'Tab 选中 · 方向键移动', x: 222, y: 20 + (addSeq * 86) % 300 };
    nodes.push(n); buildNode(n);
    [{ id: 'eu' + addSeq + 'a', from: 't1', to: n.id, when: '成功后' }, { id: 'eu' + addSeq + 'b', from: n.id, to: 'n5', when: '结束后' }].forEach(function (e) { edges.push(e); buildEdge(e); });
    paintEdges(); nodeEls[n.id].focus();
    statusEl.textContent = '就绪 / 已添加节点';
    log('[edit] add node / ' + n.title);
  });
  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function depthOf(id, seen) {
    if (seen.indexOf(id) >= 0) return 0;
    var d = 0;
    edges.filter(function (e) { return e.to === id; }).forEach(function (e) { d = Math.max(d, depthOf(e.from, seen.concat(id)) + 1); });
    return d;
  }
  blockBtn.addEventListener('click', function () {
    if (!running) return;
    if (!blocked) { blocked = true; blockBtn.textContent = '解除阻塞'; return; }
    blocked = false; blockBtn.textContent = '模拟阻塞';
    if (releaseBlock) { releaseBlock(); releaseBlock = null; }
  });
  function waitIfBlocked(stamp) {
    if (!blocked) return Promise.resolve();
    board.classList.add('is-blocked'); statusEl.textContent = '阻塞 / 等待人工确认';
    log(stamp + ' blocked / 资源被占用，等待人工确认');
    return new Promise(function (r) { releaseBlock = r; }).then(function () {
      board.classList.remove('is-blocked'); statusEl.textContent = '运行 / 已恢复执行';
      log(stamp + ' resumed / 已解除阻塞');
    });
  }
  runBtn.addEventListener('click', async function () {
    if (running) return;
    running = true; runBtn.disabled = true; addBtn.disabled = true; blockBtn.disabled = false;
    board.classList.add('is-running');
    nodes.forEach(function (n) { nodeEls[n.id].classList.remove('active', 'done'); if (!n.marker) nodeEls[n.id]._stateEl.textContent = '就绪'; });
    logEl.textContent = '[06:30:00] run / pipeline 325 start';
    setProgress(0);
    var step = REDUCED ? 80 : 650, maxD = 0;
    nodes.forEach(function (n) { maxD = Math.max(maxD, depthOf(n.id, [])); });
    for (var d = 0; d <= maxD; d++) {
      var stamp = '[06:30:' + pad(d * 7) + ']';
      await waitIfBlocked(stamp);
      var layer = nodes.filter(function (n) { return depthOf(n.id, []) === d; });
      layer.forEach(function (n) {
        edges.filter(function (e) { return e.to === n.id; }).forEach(function (e) { edgeEls[e.id].pulse.classList.add('active'); });
        nodeEls[n.id].classList.add('active'); nodeEls[n.id]._stateEl.textContent = '运行';
      });
      statusEl.textContent = '运行 / 第 ' + pad(d + 1) + ' 层 · ' + layer.length + ' 个节点';
      log(stamp + ' running / ' + layer.map(function (n) { return n.title || n.kind; }).join(' · '));
      await sleep(step);
      await waitIfBlocked(stamp);
      layer.forEach(function (n) { nodeEls[n.id].classList.remove('active'); nodeEls[n.id].classList.add('done'); nodeEls[n.id]._stateEl.textContent = '完成'; });
      setProgress((d + 1) / (maxD + 1) * 100);
    }
    edges.forEach(function (e) { edgeEls[e.id].pulse.classList.remove('active'); });
    statusEl.textContent = '完成 / 模拟执行结束';
    log('[06:35:01] done / 日报已生成（模拟）');
    board.classList.remove('is-running');
    running = false; blocked = false; runBtn.disabled = false; addBtn.disabled = false; blockBtn.disabled = true; blockBtn.textContent = '模拟阻塞';
  });
  nodes.forEach(buildNode); edges.forEach(buildEdge); stageZoom(); paintEdges();

  window.__mgaFlow = {
    nodeCount: function () { return nodes.length; },
    edgeCount: function () { return edges.length; },
    running: function () { return running; },
    state: function (id) { return nodeEls[id] ? nodeEls[id].className : ''; },
    pos: function (id) { var n = nodeOf(id); return n ? { x: n.x, y: n.y } : null; }
  };
})();
