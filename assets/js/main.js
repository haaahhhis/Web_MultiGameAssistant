/* MultiGameAssistant 官网 — vanilla JS */
(function () {
  'use strict';

  var REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var TOUCH = window.matchMedia('(hover: none), (pointer: coarse)').matches;

  if (REDUCED) document.documentElement.classList.add('no-motion');

  /* ============================================================
     Loader
     ============================================================ */
  var loader = document.getElementById('loader');
  var loaderBar = document.getElementById('loaderBar');
  var loaderPct = document.getElementById('loaderPct');
  var loaderStatus = document.getElementById('loaderStatus');

  function finishLoad() {
    document.body.classList.add('anim-ready');
    if (REDUCED) {
      loader.remove();
      return;
    }
    loader.classList.add('is-done');
    setTimeout(function () { loader.remove(); }, 700);
  }

  if (REDUCED) {
    finishLoad();
  } else {
    var start = performance.now();
    var DURATION = 950;
    (function tick(now) {
      var t = Math.min(1, (now - start) / DURATION);
      var eased = 1 - Math.pow(1 - t, 2.2);
      var pct = Math.round(eased * 100);
      loaderBar.style.transform = 'scaleX(' + eased + ')';
      loaderPct.textContent = pct + '%';
      if (t >= 1) {
        loaderStatus.textContent = 'Done.';
        setTimeout(finishLoad, 220);
      } else {
        requestAnimationFrame(tick);
      }
    })(start);
  }

  /* ============================================================
     Text scramble
     ============================================================ */
  var SCRAMBLE_CHARS = '!<>-_/[]{}=+*^?#01AFX';

  function scramble(el, finalText, duration, onDone) {
    if (REDUCED || !el) {
      if (el) el.textContent = finalText;
      if (onDone) onDone();
      return;
    }
    var start = performance.now();
    duration = duration || 600;
    function frame(now) {
      var p = Math.min(1, (now - start) / duration);
      var reveal = Math.floor(finalText.length * p);
      var out = '';
      for (var i = 0; i < finalText.length; i++) {
        if (i < reveal || finalText[i] === ' ') {
          out += finalText[i];
        } else {
          out += SCRAMBLE_CHARS[(Math.random() * SCRAMBLE_CHARS.length) | 0];
        }
      }
      el.textContent = out;
      if (p < 1) {
        requestAnimationFrame(frame);
      } else {
        el.textContent = finalText;
        if (onDone) onDone();
      }
    }
    requestAnimationFrame(frame);
  }

  /* scramble on hover for labelled buttons + mobile menu items
     — reads the label's CURRENT text, locks the element width during the
     scramble so neighbours don't shift, and ignores re-entry while busy */
  document.querySelectorAll('[data-scramble-label]').forEach(function (el) {
    var label = el.querySelector('.btn-label') || el.querySelector('.mm-zh');
    if (!label) return;
    el.addEventListener('mouseenter', function () {
      if (label.dataset.busy === '1') return;
      label.dataset.busy = '1';
      var current = label.textContent;
      el.style.width = el.getBoundingClientRect().width + 'px';
      scramble(label, current, 380, function () {
        el.style.width = '';
        delete label.dataset.busy;
      });
    });
  });
  document.querySelectorAll('.mobile-menu-list a').forEach(function (a) {
    var zh = a.querySelector('.mm-zh');
    if (!zh) return;
    a.addEventListener('mouseenter', function () {
      if (zh.dataset.busy === '1') return;
      zh.dataset.busy = '1';
      var current = zh.textContent;
      scramble(zh, current, 380, function () { delete zh.dataset.busy; });
    });
  });

  /* ============================================================
     Mobile menu
     ============================================================ */
  var burger = document.getElementById('burger');
  var mobileMenu = document.getElementById('mobileMenu');

  function setMenu(open) {
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? '关闭菜单' : '打开菜单');
    mobileMenu.classList.toggle('open', open);
    mobileMenu.setAttribute('aria-hidden', String(!open));
    document.body.style.overflow = open ? 'hidden' : '';
  }
  burger.addEventListener('click', function () {
    setMenu(!mobileMenu.classList.contains('open'));
  });
  mobileMenu.querySelectorAll('a').forEach(function (a) {
    a.addEventListener('click', function () { setMenu(false); });
  });
  window.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && mobileMenu.classList.contains('open')) setMenu(false);
  });
  window.matchMedia('(min-width: 769px)').addEventListener('change', function (e) {
    if (e.matches) setMenu(false);
  });

  /* ============================================================
     Scroll reveals + rail active state
     ============================================================ */
  var revealEls = document.querySelectorAll('.reveal-block');
  var wipeEls = document.querySelectorAll('.wipe-title');

  if (REDUCED || !('IntersectionObserver' in window)) {
    revealEls.forEach(function (el) { el.classList.add('in'); });
    wipeEls.forEach(function (el) { el.classList.add('wiped'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          en.target.classList.add('in');
          io.unobserve(en.target);
        }
      });
    }, { threshold: 0.12 });
    revealEls.forEach(function (el) { io.observe(el); });

    var wio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          en.target.classList.add('wiped');
          wio.unobserve(en.target);
        }
      });
    }, { threshold: 0.6 });
    wipeEls.forEach(function (el) { wio.observe(el); });
  }

  /* rail active section tracking */
  var railItems = Array.prototype.slice.call(document.querySelectorAll('.rail-item'));
  var sections = railItems
    .map(function (a) { return document.getElementById(a.dataset.section); })
    .filter(Boolean);

  function updateRail() {
    var y = window.scrollY + window.innerHeight * 0.4;
    var current = sections[0];
    sections.forEach(function (s) { if (s.offsetTop <= y) current = s; });
    railItems.forEach(function (a) {
      a.classList.toggle('is-active', current && a.dataset.section === current.id);
    });
  }
  var railTick = false;
  window.addEventListener('scroll', function () {
    if (railTick) return;
    railTick = true;
    requestAnimationFrame(function () { updateRail(); railTick = false; });
  }, { passive: true });
  updateRail();

  /* ============================================================
     Feature switcher
     ============================================================ */
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

  var featPanelZh = document.getElementById('featPanelZh');
  var featPanelEn = document.getElementById('featPanelEn');
  var featPanelIdx = document.getElementById('featPanelIdx');
  var featPanelBody = document.getElementById('featPanelBody');
  var featWipe = document.querySelector('.feat-panel-wipe');
  var featCounter = document.getElementById('featureCounter');
  var featIdx = -1;

  function pad(n) { return n < 10 ? '0' + n : '' + n; }

  function renderFeature(i) {
    var d = FEATURE_DATA[i];
    featPanelIdx.textContent = pad(i + 1);
    featCounter.textContent = pad(i + 1) + ' / ' + pad(FEATURE_DATA.length);
    scramble(featPanelZh, d.zh, 400);
    featPanelEn.textContent = /MODULE-\d+/.test(d.en) ? d.en : d.en + ' // MODULE-' + pad(i + 1);
    var ul = document.createElement('ul');
    d.items.forEach(function (item) {
      var li = document.createElement('li');
      li.className = 'feat-item';
      var mark = document.createElement('span');
      mark.className = 'feat-item-mark';
      mark.setAttribute('aria-hidden', 'true');
      var txt = document.createElement('div');
      var t = document.createElement('span');
      t.className = 'feat-item-title';
      t.textContent = item[0];
      var s = document.createElement('span');
      s.className = 'feat-item-text';
      s.textContent = '：' + item[1];
      txt.appendChild(t);
      txt.appendChild(s);
      li.appendChild(mark);
      li.appendChild(txt);
      ul.appendChild(li);
    });
    featPanelBody.replaceChildren(ul);
  }

  window.MGAFeature = {
    data: FEATURE_DATA,
    set: function (i) {
      if (i === featIdx) return;
      featIdx = i;
      if (REDUCED) { renderFeature(i); }
      else {
        featWipe.classList.remove('go');
        void featWipe.offsetWidth;
        featWipe.classList.add('go');
        setTimeout(function () { renderFeature(i); }, 240);
      }
    }
  };
  window.MGAFeature.set(0);

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

  /* ============================================================
     Releases (GitHub API)
     ============================================================ */
  var API_URL = 'https://api.github.com/repos/haaahhhis/MultiGameAssistant/releases?per_page=20';
  var SNAPSHOT_URL = 'data/releases.json';
  var RELEASES_PAGE = 'https://github.com/haaahhhis/MultiGameAssistant/releases';
  var CACHE_KEY = 'mga_releases_v1';
  var CACHE_TTL = 10 * 60 * 1000;

  var featuredEl = document.getElementById('releasesFeatured');
  var listEl = document.getElementById('releasesList');
  var statsEl = document.getElementById('releasesStats');

  function fmtDate(iso) {
    var d = new Date(iso);
    if (isNaN(d)) return '';
    return d.getFullYear() + '.' + pad(d.getMonth() + 1) + '.' + pad(d.getDate());
  }
  function fmtSize(bytes) {
    if (!bytes && bytes !== 0) return '';
    var mb = bytes / 1048576;
    return mb >= 100 ? Math.round(mb) + ' MB' : mb.toFixed(1) + ' MB';
  }
  function assetLabel(name) {
    if (/arm64/i.test(name)) return 'Windows ARM64';
    if (/\.exe$/i.test(name)) return 'Windows x64（大多数电脑）';
    return name;
  }

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  }

  function buildAssets(assets) {
    var wrap = el('div', 'rel-assets');
    (assets || []).forEach(function (a) {
      var link = el('a', 'rel-asset');
      link.href = a.browser_download_url;
      link.target = '_blank';
      link.rel = 'noopener';
      var name = el('span', null, assetLabel(a.name));
      var meta = el('span', 'rel-asset-meta', fmtSize(a.size));
      link.appendChild(name);
      link.appendChild(meta);
      wrap.appendChild(link);
    });
    if (!wrap.children.length) {
      var none = el('a', 'rel-asset');
      none.href = RELEASES_PAGE;
      none.target = '_blank';
      none.rel = 'noopener';
      none.appendChild(el('span', null, '前往发布页下载'));
      wrap.appendChild(none);
    }
    return wrap;
  }

  function renderFeatured(rel) {
    var card = el('article', 'rel-card');
    var head = el('div', 'rel-card-head');
    head.appendChild(el('span', 'rel-tag', rel.tag_name));
    head.appendChild(el('span', rel.prerelease ? 'rel-badge pre' : 'rel-badge', rel.prerelease ? '预发布' : '最新'));
    head.appendChild(el('span', 'rel-date', fmtDate(rel.published_at)));
    card.appendChild(head);
    if (rel.name && rel.name !== rel.tag_name) {
      card.appendChild(el('p', 'rel-name', rel.name));
    }
    var notes = el('div', 'rel-notes');
    notes.innerHTML = renderMarkdown(rel.body); /* renderMarkdown 内部先转义，仅接受 http/https 链接 */
    card.appendChild(notes);
    card.appendChild(buildAssets(rel.assets));
    featuredEl.replaceChildren(card);
  }

  function renderList(releases) {
    listEl.replaceChildren();
    releases.forEach(function (rel) {
      var det = el('details', 'rel-item');
      var sum = document.createElement('summary');
      sum.appendChild(el('span', 'rel-item-tag', rel.tag_name));
      sum.appendChild(el('span', 'rel-item-name', rel.name || rel.tag_name));
      if (rel.prerelease) sum.appendChild(el('span', 'rel-badge pre', '预发布'));
      sum.appendChild(el('span', 'rel-item-date', fmtDate(rel.published_at)));
      sum.appendChild(el('span', 'rel-item-plus', '+'));
      det.appendChild(sum);
      var body = el('div', 'rel-item-body');
      var notes = el('div', 'rel-notes');
      notes.innerHTML = renderMarkdown(rel.body);
      body.appendChild(notes);
      body.appendChild(buildAssets(rel.assets));
      det.appendChild(body);
      listEl.appendChild(det);
    });
  }

  function renderStats(releases, sourceLabel) {
    statsEl.replaceChildren();
    var s1 = el('span', null);
    s1.appendChild(el('b', null, String(releases.length)));
    s1.appendChild(document.createTextNode('个已发布版本'));
    var s3 = el('span', null, 'SOURCE // ' + sourceLabel);
    statsEl.appendChild(s1);
    statsEl.appendChild(s3);
  }

  function renderState(title, msg, withBtn) {
    var box = el('div', 'rel-state');
    box.appendChild(el('strong', null, title));
    box.appendChild(el('p', null, msg));
    if (withBtn) {
      var a = el('a', 'btn btn-outline');
      a.href = RELEASES_PAGE;
      a.target = '_blank';
      a.rel = 'noopener';
      a.appendChild(el('span', 'btn-label', '前往 GitHub 发布页'));
      box.appendChild(a);
    }
    featuredEl.replaceChildren(box);
    listEl.replaceChildren();
    statsEl.replaceChildren();
  }

  function pickLatest(releases) {
    var stable = releases.filter(function (r) { return !r.prerelease; });
    return stable[0] || releases[0];
  }

  function findX64Asset(rel) {
    if (!rel || !rel.assets) return null;
    return rel.assets.find(function (a) { return /\.exe$/i.test(a.name) && !/arm64/i.test(a.name); })
        || rel.assets.find(function (a) { return /\.exe$/i.test(a.name); })
        || null;
  }

  function updateDownloadLinks(releases) {
    var latest = pickLatest(releases);
    if (!latest) return;
    var asset = findX64Asset(latest);
    var href = asset ? asset.browser_download_url : RELEASES_PAGE;
    var label = '下载最新版 ' + latest.tag_name;
    var hero = document.getElementById('heroDownload');
    hero.href = href;
    hero.querySelector('.btn-label').textContent = label;
    document.getElementById('railDownload').href = href;
    var mm = document.getElementById('mobileMenuDownload');
    mm.href = href;
    mm.textContent = label;
  }

  function handleReleases(releases, sourceLabel) {
    var visible = (releases || []).filter(function (r) { return !r.draft; });
    if (!visible.length) {
      renderState('暂无发布版本', '仓库还没有公开发布的版本，可以去 GitHub 查看进展。', true);
      return;
    }
    renderStats(visible, sourceLabel);
    var latest = pickLatest(visible);
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

  /* ============================================================
     Back to top
     ============================================================ */
  document.getElementById('backToTop').addEventListener('click', function () {
    window.scrollTo({ top: 0, behavior: REDUCED ? 'auto' : 'smooth' });
  });
})();


  /* ============================================================
    COMMAND CORE — rings, packet, countdown, terminal, tilt
     ============================================================ */
  var REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var TOUCH = window.matchMedia('(hover: none), (pointer: coarse)').matches;
  var cc = document.getElementById('cmdCore');
  if (cc && !REDUCED) {
    var ccNodes = cc.querySelectorAll('.cc-node'), ccPkt = document.getElementById('ccPacket');
    var ccCenter = 230, ccR = 188, ccAng = 0, ccIdx = 0;
    ccNodes[0].classList.add('lit');
    (function ccMove() {
      ccAng = (ccAng + 0.008) % (Math.PI * 2);
      var a = ccAng - Math.PI / 2;
      ccPkt.style.left = (ccCenter + Math.cos(a) * ccR - 4) + 'px';
      ccPkt.style.top = (ccCenter + Math.sin(a) * ccR - 4) + 'px';
      var seg = Math.floor(((ccAng + Math.PI / 4) % (Math.PI * 2)) / (Math.PI / 2)) % 4;
      if (seg !== ccIdx) { ccIdx = seg; ccNodes.forEach(function (n, j) { n.classList.toggle('lit', j === seg); }); }
      requestAnimationFrame(ccMove);
    })();
    /* countdown */
    var ccNext = document.getElementById('ccNext');
    setInterval(function () {
      var t = 630 - (Math.floor(Date.now() / 1000) % 1800);
      ccNext.textContent = 'NEXT RUN\n06:30 · ' + Math.floor(t / 60) + ':' + ('0' + t % 60).slice(-2);
    }, 1000);
    /* terminal */
    var ccTerm = document.getElementById('ccTerm');
    var LOGS = ['[06:30:00] pipeline 每天早上的日常 · start', '[06:30:02] agent · 读懂 DailyHelper → 脚本包', '[06:31:40] 桌面日常·清体力 · queued (desktop)', '[06:34:12] incident · 自动重跑 <span class="ok">✓</span>', '[06:35:01] 飞书 · 已推送日报'];
    var li = 0;
    setInterval(function () {
      var d = document.createElement('div'); d.className = 'tl in';
      d.innerHTML = LOGS[li % LOGS.length]; ccTerm.appendChild(d);
      while (ccTerm.children.length > 4) ccTerm.firstChild.remove();
      li++;
    }, 1800);
    /* tilt */
    if (!TOUCH) {
      var hero = document.getElementById('home'), tx = 0, ty = 0, traf = false;
      hero.addEventListener('pointermove', function (e) {
        tx = (e.clientX / innerWidth - .5) * 10; ty = (e.clientY / innerHeight - .5) * -8;
        if (traf) return; traf = true;
        requestAnimationFrame(function () { cc.style.transform = 'rotateY(' + tx + 'deg) rotateX(' + ty + 'deg)'; traf = false; });
      }, { passive: true });
    }
  } else if (cc) {
    document.getElementById('ccNext').textContent = 'NEXT RUN 06:30';
  }
