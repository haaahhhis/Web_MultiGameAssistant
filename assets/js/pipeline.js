/* Hero pipeline canvas + run log — replays one morning of the 「早间日常」 pipeline.
   The markup is the finished run (what no-JS and reduced-motion visitors see);
   this script rewinds it and plays the run in compressed time, then loops. */
(function () {
  'use strict';

  var svg = document.getElementById('heroPipeline');
  if (!svg) return;
  var log = document.getElementById('heroLog');
  var logState = document.getElementById('heroLogState');
  var lines = log ? log.querySelectorAll('.hero-log-list li') : [];
  var clock = document.getElementById('plClock');
  var stateLabel = document.getElementById('plState');
  var countLabel = document.getElementById('plCount');
  var fill = document.getElementById('plFill');

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var MS_PER_MIN = 260;   // one simulated minute
  var LAST_MIN = 49;      // 09:00 → 09:49
  var HOLD_MS = 4200;     // finished state stays up before the replay
  var WORK = ['maa', 'm7d', 'm7s', 'agent', 'feishu'];

  function node(id, state, badge) {
    var g = svg.querySelector('[data-node="' + id + '"]');
    g.setAttribute('data-state', state);
    var b = g.querySelector('.pl-badge');
    if (b) b.textContent = badge || '';
  }
  function edge(id, state) {
    svg.querySelector('[data-edge="' + id + '"]').setAttribute('data-state', state);
  }
  function line(i) {
    lines.forEach(function (li, k) { li.classList.toggle('is-cur', k === i); });
    if (lines[i]) lines[i].classList.add('on');
  }
  function progress() {
    var done = WORK.filter(function (id) {
      return svg.querySelector('[data-node="' + id + '"]').getAttribute('data-state') === 'ok';
    }).length;
    countLabel.textContent = done + ' / ' + WORK.length + ' 个节点';
    fill.setAttribute('width', String(150 * done / WORK.length));
  }

  // what happens at each simulated minute (matches the run log lines)
  var STEPS = [
    [0, function () {
      node('start', 'ok'); edge('e1', 'run'); edge('e2', 'run');
      node('maa', 'run', '运行中'); node('m7d', 'run', '运行中'); line(0);
    }],
    [21, function () {
      node('m7d', 'ok', '✓ 21 分钟'); edge('e2', 'done'); edge('e4', 'run');
      node('m7s', 'run', '运行中'); line(1);
    }],
    [24, function () { node('m7s', 'warn', '! 被公告挡住'); line(2); }],
    [26, function () { node('m7s', 'fix', '干预处理中'); }],
    [28, function () { node('m7s', 'run', '重试中'); }],
    [31, function () {
      node('m7s', 'ok', '✓ 重试 1 次'); edge('e4', 'done'); edge('e5', 'done');
      node('agent', 'wait', '等另一条分支'); line(3);
    }],
    [38, function () {
      node('maa', 'ok', '✓ 38 分钟'); edge('e1', 'done'); edge('e3', 'done');
      node('agent', 'run', '运行中'); line(4);
    }],
    [47, function () {
      node('agent', 'ok', '✓ 2 个活动快结束'); edge('e6', 'run');
      node('feishu', 'run', '发送中'); line(5);
    }],
    [49, function () {
      node('feishu', 'ok', '✓ 已发送'); edge('e6', 'done'); edge('e7', 'done');
      node('end', 'ok'); line(6);
    }]
  ];

  function rewind() {
    ['start', 'maa', 'm7d', 'm7s', 'agent', 'feishu', 'end'].forEach(function (id) { node(id, 'idle'); });
    ['e1', 'e2', 'e3', 'e4', 'e5', 'e6', 'e7'].forEach(function (id) { edge(id, 'idle'); });
    lines.forEach(function (li) { li.classList.remove('on', 'is-cur'); });
    progress();
  }

  function setClock(min, finished) {
    clock.textContent = '09:' + (min < 10 ? '0' : '') + min;
    stateLabel.textContent = finished ? '已完成' : '运行中';
    svg.classList.toggle('is-finished', finished);
    clock.parentNode.classList.toggle('is-running', !finished);
    if (logState) logState.textContent = finished ? '示例 · 已完成' : '示例 · 运行中';
  }

  /* the clock only advances while the canvas is on screen and the tab is visible */
  var PREROLL_MS = 1200;  // a beat of the idle canvas before 09:00
  var elapsed = -PREROLL_MS, next = 0, last = 0, raf = 0, visible = false;
  function frame(now) {
    raf = 0;
    if (!visible || document.hidden) { last = 0; return; }
    if (last) elapsed += Math.min(now - last, 100);
    last = now;
    var min = Math.max(0, Math.min(LAST_MIN, Math.floor(elapsed / MS_PER_MIN)));
    while (next < STEPS.length && STEPS[next][0] <= min) { STEPS[next][1](); next++; progress(); }
    setClock(min, next === STEPS.length);
    if (elapsed >= LAST_MIN * MS_PER_MIN + HOLD_MS) { elapsed = -PREROLL_MS; next = 0; rewind(); }
    raf = requestAnimationFrame(frame);
  }
  function wake() {
    if (!raf && visible && !document.hidden) { last = 0; raf = requestAnimationFrame(frame); }
  }

  log && log.classList.add('is-live');
  svg.classList.add('is-live');
  rewind();
  setClock(0, false);

  new IntersectionObserver(function (entries) {
    visible = entries[0].isIntersecting;
    wake();
  }).observe(svg);
  document.addEventListener('visibilitychange', wake);
})();
