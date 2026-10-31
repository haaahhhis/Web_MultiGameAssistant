/* ============================================================
   FEATURE DEMOS — parent bridge: iframe with the REAL app UI
   (app-demo/, built from the real frontend + fake gateway),
   scenario tab row, progress, pause, lazy load, reduced motion.
   ============================================================ */
(function () {
  'use strict';
  var REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var clipEl = document.getElementById('appwinClip');
  var frame = document.getElementById('demoFrame');
  var tabsEl = document.getElementById('scenTabs');
  var labelEl = document.getElementById('demoLabel');
  var outer = document.getElementById('demoOuter');
  if (!clipEl || !frame || !tabsEl) return;

  var SCEN = [
    { zh: '脚本', en: 'SCRIPTS' },
    { zh: '编排与定时', en: 'PIPELINE' },
    { zh: '监控与干预', en: 'MONITOR' },
    { zh: '游戏信息', en: 'INTEL' },
    { zh: 'Agent', en: 'AGENT' },
    { zh: '飞书', en: 'FEISHU' }
  ];

  /* logical size + scale */
  var LW = 1280, LH = 800, LW_M = 1024, LH_M = 720, k = 1;
  var camera = { x: .5, y: .5, zoom: 1 }, zoomEnabled = true;
  var zoomButton = document.getElementById('demoZoom');
  function paintCamera() {
    var z = zoomEnabled ? camera.zoom : 1;
    if (clipEl.clientWidth < 900 && z > 1) z = Math.min(1.4, z + .15);
    var width = parseFloat(frame.style.width) * k * z, height = parseFloat(frame.style.height) * k * z;
    var x = Math.min(0, Math.max(clipEl.clientWidth - width, clipEl.clientWidth / 2 - camera.x * width));
    var y = Math.min(0, Math.max(clipEl.clientHeight - height, clipEl.clientHeight / 2 - camera.y * height));
    frame.style.transform = 'translate(' + x + 'px,' + y + 'px) scale(' + (k * z) + ')';
  }
  zoomButton.addEventListener('click', function () {
    zoomEnabled = !zoomEnabled;
    zoomButton.setAttribute('aria-pressed', String(zoomEnabled));
    zoomButton.textContent = '局部放大 · ' + (zoomEnabled ? '开' : '关');
    paintCamera();
  });
  function fit() {
    var w = clipEl.clientWidth, lw = w < 900 ? LW_M : LW, lh = w < 900 ? LH_M : LH;
    k = w / lw;
    frame.style.width = lw + 'px'; frame.style.height = lh + 'px';
    clipEl.style.height = (lh * k) + 'px';
    paintCamera();
  }
  window.addEventListener('resize', fit); fit();

  /* tab row */
  function mk(tag, cls, txt, parent) { var el = document.createElement(tag); if (cls) el.className = cls; if (txt != null) el.textContent = txt; if (parent) parent.appendChild(el); return el; }
  var tabBtns = [], fills = [];
  var pauseBtn = mk('button', 'scen-pause', '❚❚', tabsEl);
  pauseBtn.setAttribute('aria-label', '暂停演示');
  var paused = { manual: REDUCED, auto: false, ready: false, idx: 0 };
  function syncPause() {
    var p = paused.manual || paused.auto || document.hidden;
    pauseBtn.textContent = paused.manual ? '▶' : '❚❚';
    pauseBtn.setAttribute('aria-label', paused.manual ? '播放演示' : '暂停演示');
    send(p ? 'pause' : 'resume');
  }
  pauseBtn.addEventListener('click', function () {
    paused.manual = !paused.manual;
    pauseBtn.textContent = paused.manual ? '▶' : '❚❚';
    pauseBtn.setAttribute('aria-label', paused.manual ? '播放演示' : '暂停演示');
    syncPause();
  });
  SCEN.forEach(function (s, i) {
    var b = mk('button', 'scen-tab', null, tabsEl);
    b.setAttribute('role', 'tab');
    mk('span', null, s.zh, b);
    var tr = mk('span', 'scen-track', null, b);
    fills[i] = mk('i', 'scen-fill', null, tr);
    b.addEventListener('click', function () { select(i); });
    b.addEventListener('keydown', function (e) {
      var n = e.key === 'ArrowRight' ? (i + 1) % SCEN.length : e.key === 'ArrowLeft' ? (i - 1 + SCEN.length) % SCEN.length : -1;
      if (n >= 0) { e.preventDefault(); tabBtns[n].focus(); select(n); }
    });
    tabBtns[i] = b;
  });

  /* bridge */
  function send(type, data) {
    if (!paused.ready || !frame.contentWindow) return;
    frame.contentWindow.postMessage(Object.assign({ src: 'mga-site', type: type }, data || {}), location.origin);
  }
  function select(i) {
    if (!Number.isInteger(i) || !SCEN[i]) return;
    paused.idx = i;
    tabBtns.forEach(function (b, j) { b.classList.toggle('on', j === i); b.setAttribute('aria-selected', String(j === i)); b.tabIndex = j === i ? 0 : -1; });
    var tl = tabBtns[i].getBoundingClientRect().left - tabsEl.getBoundingClientRect().left + tabsEl.scrollLeft;
    tabsEl.scrollTo({ left: Math.max(0, tl - pauseBtn.offsetWidth - 16), behavior: 'smooth' });
    fills.forEach(function (f) { f.style.transform = 'scaleX(0)'; });
    labelEl.textContent = 'DEMO // ' + SCEN[i].en;
    camera = { x: .5, y: .5, zoom: 1 }; paintCamera();
    if (window.MGAFeature) window.MGAFeature.set(i);
    phoneShow(i === 5);
    send('select', { idx: i });
  }
  window.addEventListener('message', function (e) {
    var d = e.data;
    if (e.source !== frame.contentWindow || e.origin !== location.origin || !d || d.src !== 'mga-demo') return;
    if (d.type === 'ready') { paused.ready = true; select(paused.idx); syncPause(); }
    else if (d.idx !== paused.idx) return;
    else if (d.type === 'camera' && Number.isFinite(d.x) && Number.isFinite(d.y) && Number.isFinite(d.zoom)) {
      camera = { x: Math.max(0, Math.min(1, d.x)), y: Math.max(0, Math.min(1, d.y)), zoom: Math.max(1, Math.min(1.4, d.zoom)) }; paintCamera();
    }
    else if (d.type === 'progress' && Number.isFinite(d.frac)) {
      fills[paused.idx].style.transform = 'scaleX(' + Math.max(0, Math.min(1, d.frac)) + ')';
      if (paused.idx === 5) phoneRender(d.elapsed || 0);
    }
    else if (d.type === 'ended' && !REDUCED && !paused.manual && !paused.auto && !document.hidden) select((d.idx + 1) % SCEN.length);
    else if (d.type === 'error') { paused.manual = true; syncPause(); labelEl.textContent = 'DEMO // 演示暂时无法播放，请重新选择场景'; }
  });

  /* feishu phone mock — dark, code-drawn from the real recording */
  var phone = mk('div', 'demo-phone', null, clipEl);
  phone.setAttribute('aria-hidden', 'true');
  var CARD_FOOT = 'MultiGameAssistant · 2026/10/27';
  phone.innerHTML =
    '<div class="fs-phone dk">' +
    '<div class="fs-status"><span class="fs-st-l"><b>20:25</b><i class="fs-app"></i><i class="fs-app"></i></span><span class="fs-sig"><svg class="fs-ic" viewBox="0 0 16 16"><path d="M8 4a6 6 0 0 1 6 3"/><path d="M8 7a3.5 3.5 0 0 1 3.5 1.7"/><circle cx="8" cy="11" r="1"/></svg><svg class="fs-ic" viewBox="0 0 16 16"><rect x="6" y="2" width="4" height="9" rx="2"/><path d="M4 8a4 4 0 0 0 8 0M8 12v3"/></svg><b>5G</b><b>5G</b><svg class="fs-ic" viewBox="0 0 16 16"><path d="M1 6a11 11 0 0 1 14 0M4 9a7 7 0 0 1 8 0M7 12a3 3 0 0 1 2 0"/><circle cx="8" cy="14" r=".8"/></svg><b>49%</b></span></div>' +
    '<div class="fs-head"><span class="fs-back">‹</span><i class="fs-pill">5</i><span class="fs-ttl">MultiGameAssistant <em class="fs-bot">机器人</em></span><span class="fs-sub">325</span><span class="fs-head-r"><svg class="fs-ic" viewBox="0 0 16 16"><circle cx="8" cy="8" r="6.5"/><path d="M8 5v3l2 1.5"/></svg><b>⋯</b></span></div>' +
    '<div class="fs-chat" id="fsChat">' +
      '<div class="fs-msg"><i class="fs-av"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="11" fill="#1aa6f7"/><rect x="7" y="9" width="10" height="7" rx="2.5" fill="#fff"/><circle cx="10" cy="12" r="1.1" fill="#1aa6f7"/><circle cx="14" cy="12" r="1.1" fill="#1aa6f7"/><path d="M12 5v3" stroke="#fff" stroke-width="1.4"/></svg></i><div class="fs-card c-orange"><div class="fs-ct">三游戏日常 · 桌面任务依次运行：已取消</div><div class="fs-cb">开机后运行，0 个成功，3 个取消（已取消）<br>用时 1 分钟</div><div class="fs-cf">MultiGameAssistant · 2026/10/26 17:04:22</div></div></div>' +
      '<div class="fs-sep">今天</div><div class="fs-sep">09:39</div>' +
      '<div class="fs-msg"><i class="fs-av"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="11" fill="#1aa6f7"/><rect x="7" y="9" width="10" height="7" rx="2.5" fill="#fff"/><circle cx="10" cy="12" r="1.1" fill="#1aa6f7"/><circle cx="14" cy="12" r="1.1" fill="#1aa6f7"/><path d="M12 5v3" stroke="#fff" stroke-width="1.4"/></svg></i><div class="fs-card c-blue"><div class="fs-ct">三游戏日常 · 桌面任务依次运行</div><div class="fs-cb">三游戏日常跑完：方舟 → 终末地 → 星铁（桌面任务依次运行，不互相抢屏幕）</div><div class="fs-cf">MultiGameAssistant · 2026/10/27 09:39:34</div></div></div>' +
      '<div class="fs-msg"><i class="fs-av"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="11" fill="#1aa6f7"/><rect x="7" y="9" width="10" height="7" rx="2.5" fill="#fff"/><circle cx="10" cy="12" r="1.1" fill="#1aa6f7"/><circle cx="14" cy="12" r="1.1" fill="#1aa6f7"/><path d="M12 5v3" stroke="#fff" stroke-width="1.4"/></svg></i><div class="fs-card c-green"><div class="fs-ct">三游戏日常 · 桌面任务依次运行：已完成</div><div class="fs-cb">开机后运行，3 个成功<br>用时 49 分钟</div><div class="fs-cf">MultiGameAssistant · 2026/10/27 09:39:35</div></div></div>' +
      '<div class="fs-sep fx" data-anim="1">20:25</div>' +
      '<div class="fs-msg fx" data-anim="1"><i class="fs-av"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="11" fill="#1aa6f7"/><rect x="7" y="9" width="10" height="7" rx="2.5" fill="#fff"/><circle cx="10" cy="12" r="1.1" fill="#1aa6f7"/><circle cx="14" cy="12" r="1.1" fill="#1aa6f7"/><path d="M12 5v3" stroke="#fff" stroke-width="1.4"/></svg></i><div class="fs-card c-blue" id="fsReport"><div class="fs-ct">今日活动日报（演示）</div><div class="fs-cb fs-report" id="fsReportBody"></div><div class="fs-cf">MultiGameAssistant · 2026/10/27 20:25:24</div></div></div>' +
    '</div>' +
    '<div class="fs-input"><span>发送给 MultiGameAssistant</span><svg class="fs-ic" viewBox="0 0 16 16"><path d="M3 9l5-5 5 5"/></svg></div>' +
    '<div class="fs-iconsrow"><svg class="fs-ic2" viewBox="0 0 16 16"><circle cx="8" cy="8" r="6"/><circle cx="5.8" cy="6.5" r=".9"/><circle cx="10.2" cy="6.5" r=".9"/><path d="M5.5 10.5a3.5 3.5 0 0 0 5 0"/></svg><svg class="fs-ic2" viewBox="0 0 16 16"><text x="4" y="12" font-size="11">@</text></svg><svg class="fs-ic2" viewBox="0 0 16 16"><rect x="6" y="2" width="4" height="9" rx="2"/><path d="M4 8a4 4 0 0 0 8 0M8 12v3"/></svg><svg class="fs-ic2" viewBox="0 0 16 16"><rect x="2" y="3" width="12" height="10" rx="1.5"/><circle cx="5.5" cy="6.5" r="1.2"/><path d="M2 11l4-3 3 2 3-3 2 2"/></svg><svg class="fs-ic2" viewBox="0 0 16 16"><text x="2" y="12" font-size="9" font-family="serif">Aa</text></svg><svg class="fs-ic2" viewBox="0 0 16 16"><circle cx="8" cy="8" r="6.5"/><path d="M8 4.5v7M4.5 8h7"/></svg><svg class="fs-ic2 send" viewBox="0 0 16 16"><path d="M2 8l12-5-4 5 4 5z" fill="#1aa6f7"/></svg></div>' +
    '</div>';
var REPORT_LINES = ['主人，今天的日报来啦喵～', '【明日方舟】打捞方案和恒远津梁都只剩 2 天，10/30 03:59 就结束了，其中恒远津梁活动页那份「点击领取」的奖励还没领，记得去点一下喵～2026「感谢庆典」的前瞻签到和特别招募已经在 10/24 21:30 开始了，这两项可以顺手做起来。', '【明日方舟：终末地】「危机筹备」限时活动 10/29 04:00 开始，「百趣演武」挑战活动 10/29 12:00 开始，这两天留意一下就好喵～', '【崩坏：星穹铁道】日常已完成；版本活动和剩余时间可在游戏页查看喵～'];
  function phoneFit() {
    var narrow = window.matchMedia('(max-width: 768px)').matches;
    phone.style.transform = (narrow ? 'translate(50%, -50%)' : 'translateY(-50%)') + ' scale(' + Math.min((clipEl.clientHeight - (narrow ? 12 : 36)) / 792, (clipEl.clientWidth * (narrow ? 0.9 : 0.44)) / 360) + ')';
  }
  window.addEventListener('resize', phoneFit);
  function phoneRender(elapsed) {
    var chat = phone.querySelector('#fsChat'), body = phone.querySelector('#fsReportBody');
    var count = Math.max(0, Math.min(REPORT_LINES.length, Math.floor((elapsed - 3200) / 450) + 1));
    chat.querySelectorAll('.fx').forEach(function (n) { n.classList.toggle('in', elapsed >= 2600); });
    if (body.childElementCount !== count) {
      body.replaceChildren();
      REPORT_LINES.slice(0, count).forEach(function (t) { mk('div', 'fs-rl in', t, body); });
    }
    chat.scrollTop = elapsed >= 1400 ? chat.scrollHeight : 0;
  }
  function phoneShow(on) {
    phone.classList.toggle('on', on);
    if (!on) return;
    phoneFit(); phoneRender(0);
  }

  /* lazy iframe src + offscreen/hidden pause */
  var srcSet = false;
  function ensureSrc() { if (!srcSet) { srcSet = true; frame.src = 'app-demo/index.html' + (new URLSearchParams(location.search).has('validate') ? '?validate=1' : ''); } }
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (en) {
      if (en[0].isIntersecting) ensureSrc();
      paused.auto = !en[0].isIntersecting;
      syncPause();
    }, { threshold: 0.15, rootMargin: '200px' }).observe(outer);
  } else ensureSrc();
  document.addEventListener('visibilitychange', syncPause);

  select(0);
  syncPause();

  window.__mgaDemo = {
    select: select,
    pause: function () { if (!paused.manual) pauseBtn.click(); },
    play: function (v) { if (typeof v === 'number') select(v); else if (paused.manual) pauseBtn.click(); },
    seek: function (f) { send('seek', { frac: f }); },
    state: function () { return { idx: paused.idx, paused: paused.manual, ready: paused.ready, fill: fills[paused.idx] ? fills[paused.idx].style.transform : '' }; },
    idx: function () { return paused.idx; },
    fill: function () { return fills[paused.idx] ? fills[paused.idx].style.transform : ''; },
    setManual: function (v) { paused.manual = v; pauseBtn.textContent = v ? '▶' : '❚❚'; syncPause(); }
  };
})();
