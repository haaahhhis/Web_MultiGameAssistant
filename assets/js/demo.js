/* ============================================================
   CODE-DRAWN FEATURE DEMOS — fake app window + scripted timeline
   Virtual clock: totals measured by dry-run; seek(f) supported.
   ============================================================ */
(function () {
  'use strict';
  var REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var scaleEl = document.getElementById('appwinScale');
  var clipEl = document.getElementById('appwinClip');
  var tabsEl = document.getElementById('scenTabs');
  var labelEl = document.getElementById('demoLabel');
  var outer = document.getElementById('demoOuter');
  if (!scaleEl || !tabsEl || !window.MGAFeature) return;

  var LW = 1120, LH = 680, k = 1;
  function fit() {
    var w = clipEl.clientWidth, lw = w < 640 ? 680 : LW;
    k = w / lw;
    scaleEl.style.width = lw + 'px'; scaleEl.style.height = LH + 'px';
    scaleEl.style.transform = 'scale(' + k + ')';
    scaleEl.classList.toggle('narrow', lw === 680);
    clipEl.style.height = (LH * k) + 'px';
  }

  function mk(tag, cls, txt, parent) {
    var el = document.createElement(tag);
    if (cls) el.className = cls;
    if (txt != null) el.textContent = txt;
    if (parent) parent.appendChild(el);
    return el;
  }
  function chip(txt, kind, parent) { return mk('span', 'chip chip-' + kind, txt, parent); }
  function icon(name) {
    var p = { 游戏: 'M3 6h18v12H3zM8 10h2m4 0h2M8 14h8', 对话: 'M4 5h16v10H8l-4 4z', 脚本: 'M8 4l-5 8 5 8m8-16l5 8-5 8', 编排: 'M4 6h6m4 0h6M4 12h10m2 0h4M4 18h6m4 0h6', 运行: 'M6 4l14 8-14 8z', 技能: 'M12 3l2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5z', 设置: 'M12 8a4 4 0 100 8 4 4 0 000-8zm8 4h2M2 12h2m8-8v2m0 12v2' }[name] || 'M4 4h16v16H4z';
    return '<svg viewBox="0 0 24 24"><path d="' + p + '" stroke-linejoin="round" stroke-linecap="round"/></svg>';
  }

  /* app chrome */
  var aw = mk('div', 'aw', null, scaleEl);
  var rail = mk('div', 'aw-rail', null, aw);
  mk('div', 'aw-logo', 'MGA', rail);
  var railItems = {};
  ['游戏', '对话', '脚本', '编排', '运行', '技能'].forEach(function (n) {
    railItems[n] = mk('div', 'aw-rail-item', null, rail);
    railItems[n].innerHTML = icon(n) + '<span>' + n + '</span>';
  });
  mk('div', 'aw-rail-sp', null, rail);
  var set = mk('div', 'aw-rail-item', null, rail);
  set.innerHTML = icon('设置') + '<span>设置</span>';
  var main = mk('div', 'aw-main', null, aw);
  var head = mk('div', 'aw-head', null, main);
  var body = mk('div', 'aw-body', null, main);
  var cursor = mk('div', 'aw-cursor', null, aw);
  cursor.innerHTML = '<svg viewBox="0 0 20 20"><path d="M4 2l12 8-6 1.5L7 18z" fill="#191919" stroke="#fff" stroke-width="1"/></svg>';

  /* engine */
  var state = { token: 0, manual: false, auto: false, idx: 0, total: [] };
  function isPaused() { return state.manual || state.auto || document.hidden; }
  function dead(t) { return t !== state.token; }
  function wait(t, ms) {
    return new Promise(function (res, rej) {
      var done = 0;
      (function tick() {
        if (dead(t)) return rej('cancel');
        if (!isPaused()) done += 50;
        if (done >= ms) return res();
        setTimeout(tick, 50);
      })();
    });
  }
  function rectOf(target) {
    var r = target.getBoundingClientRect(), s = aw.getBoundingClientRect();
    return { x: (r.left + r.width / 2 - s.left) / k, y: (r.top + r.height / 2 - s.top) / k };
  }
  var fill = null;
  function ctxFor(t, total, target) {
    var clock = 0, fast = target > 0;
    function step(ms) {
      clock += ms;
      if (fill) fill.style.transform = 'scaleX(' + Math.min(1, clock / total) + ')';
      if (fast && clock >= target) fast = false;
    }
    var ctx = {
      fast: function () { return fast; },
      wait: function (ms) { step(ms); return fast || REDUCED ? Promise.resolve() : wait(t, ms); },
      show: function (e, ms) { e.classList.add('in'); return ctx.wait(ms == null ? 170 : ms); },
      type: function (e, text, cps) {
        var ms = Math.ceil(text.length * 1000 / (cps || 14));
        if (fast || REDUCED) { e.textContent += text; step(ms); return Promise.resolve(); }
        var i = 0;
        return (function next() {
          if (i >= text.length) return Promise.resolve();
          e.textContent += text[i++];
          step(Math.ceil(1000 / (cps || 14)));
          return wait(t, Math.ceil(1000 / (cps || 14))).then(next);
        })();
      },
      move: function (target2) {
        var ms = 520;
        if (fast || REDUCED) { step(ms); return Promise.resolve(); }
        var p = target2.x != null ? target2 : rectOf(target2);
        cursor.style.left = p.x + 'px'; cursor.style.top = p.y + 'px';
        cursor.classList.add('on');
        return ctx.wait(ms);
      },
      click: function (target2) {
        if (fast || REDUCED) { step(740); return Promise.resolve(); }
        return ctx.move(target2).then(function () {
          if (dead(t)) throw 'cancel';
          var p = target2.x != null ? target2 : rectOf(target2);
          var rip = mk('div', 'aw-ripple', null, aw);
          rip.style.left = p.x + 'px'; rip.style.top = p.y + 'px';
          if (target2.classList) { target2.classList.add('is-pressed'); setTimeout(function () { target2.classList.remove('is-pressed'); }, 350); }
          setTimeout(function () { rip.remove(); }, 700);
          return ctx.wait(220);
        });
      },
      cursorOff: function () { cursor.classList.remove('on'); }
    };
    return ctx;
  }
  /* dry-run totals: same ops, no DOM/clock side effects */
  function measure(i, refs) {
    var acc = 0, dc = {
      wait: function (m) { acc += m; return Promise.resolve(); },
      show: function (e, m) { acc += (m == null ? 170 : m); return Promise.resolve(); },
      type: function (e, txt, cps) { acc += Math.ceil(txt.length * 1000 / (cps || 14)); return Promise.resolve(); },
      move: function () { acc += 520; return Promise.resolve(); },
      click: function () { acc += 740; return Promise.resolve(); },
      cursorOff: function () {}
    };
    return Promise.resolve(SCEN[i].run(dc, refs)).then(function () { return acc; }).catch(function () { return acc; });
  }

  /* scenario tab row */
  var SCEN = [], tabBtns = [], fills = [];
  var pauseBtn = mk('button', 'scen-pause', '❚❚', tabsEl);
  pauseBtn.setAttribute('aria-label', '暂停演示');
  pauseBtn.addEventListener('click', function () {
    state.manual = !state.manual;
    pauseBtn.textContent = state.manual ? '▶' : '❚❚';
    pauseBtn.setAttribute('aria-label', state.manual ? '播放演示' : '暂停演示');
  });

  /* ================= scenarios ================= */

  /* 1 脚本 */
  SCEN[0] = {
    zh: '脚本', en: 'SCRIPTS',
    build: function () {
      body.innerHTML = '';
      head.innerHTML = '脚本<i>/</i><b>脚本库</b>';
      railItems['脚本'].classList.add('on');
      var side = mk('div', 'aw-side', null, body);
      mk('div', 'aw-list-item', '<b>已安装 · 3</b>', side).innerHTML = '<b>已安装 · 3</b>';
      ['模拟器日常', '桌面日常', '每日巡检'].forEach(function (n, i) { mk('div', 'aw-list-item' + (i === 2 ? ' on' : ''), n, side); });
      var btn1 = mk('button', 'aw-btn aw-btn-p', '＋ 导入本地项目', side);
      mk('button', 'aw-btn aw-btn-s', '从 Mirror酱 安装', side);
      var panel = mk('div', 'aw-panel', null, body);
      panel.style.cssText = 'flex:1;margin:14px;padding:14px;overflow:hidden;';
      mk('div', 'aw-panel', null, panel).outerHTML = '';
      var sc = mk('div', 'aw-panel', null, panel); sc.style.cssText = 'padding:12px;margin-bottom:10px';
      mk('b', null, '每日巡检', sc).style.fontSize = '14px';
      mk('div', null, '配置驱动的桌面自动化脚本，按任务列表依次执行，日志写在 logs/run.log。', sc).style.cssText = 'font-size:11.5px;color:#8a8a8e;margin-top:4px;line-height:1.5';
      var tk = mk('div', 'aw-panel', null, panel); tk.style.cssText = 'padding:12px;margin-bottom:10px';
      mk('b', null, '任务 · 3', tk).style.fontSize = '12px';
      ['每日任务 · 约 2 分钟', '材料速刷 · 约 10 分钟', '领奖励 · 约 1 分钟'].forEach(function (t) {
        var r2 = mk('div', 'aw-toggle', null, tk);
        mk('span', null, t, r2).style.fontSize = '12px';
        mk('button', 'aw-btn aw-btn-s', '运行', r2).style.cssText = 'padding:3px 12px;font-size:11px';
      });
      var cf = mk('div', 'aw-panel', null, panel); cf.style.cssText = 'padding:12px';
      mk('b', null, '配置副本', cf).style.fontSize = '12px';
      var cfr = mk('div', null, null, cf); cfr.style.cssText = 'display:flex;gap:8px;margin-top:8px';
      chip('大号 · 当前', 'run', cfr); chip('小号', 'grey', cfr); chip('＋ 新建副本', 'grey', cfr);
      var modal = mk('div', 'aw-modal aw-el', null, body);
      mk('h4', null, '选择脚本目录', modal);
      var path = mk('div', 'aw-field', '', modal);
      var mrow = mk('div', 'aw-modal-row', null, modal);
      var ok = mk('button', 'aw-btn aw-btn-p', '确定', mrow);
      var steps = mk('div', 'aw-el', null, body);
      steps.style.cssText = 'position:absolute;left:250px;top:80px;width:420px;background:#fff;border:1px solid #e9e9e6;border-radius:10px;padding:14px;box-shadow:0 12px 36px rgba(0,0,0,.12)';
      mk('h4', null, 'agent 正在读懂这个脚本…', steps).style.cssText = 'font-size:13px;margin-bottom:8px';
      var card = mk('div', 'aw-el', null, body);
      card.style.cssText = 'position:absolute;left:250px;top:320px;width:420px;background:#fff;border:1px solid #e9e9e6;border-radius:10px;padding:14px;display:flex;justify-content:space-between;align-items:center;box-shadow:0 12px 36px rgba(0,0,0,.12)';
      var ct = mk('div', null, null, card);
      mk('b', null, '脚本包草稿 · DailyHelper', ct).style.fontSize = '13px';
      mk('div', null, '3 个任务 · 配置与日志已定位', ct).style.cssText = 'font-size:11px;color:#8a8a8e;margin-top:3px';
      var confirm = mk('button', 'aw-btn aw-btn-p', '确认', card);
      var toast = mk('div', 'aw-toast aw-el', '已添加：DailyHelper，可以像内置脚本一样使用', body);
      var newItem = mk('div', 'aw-list-item aw-el', null, side);
      newItem.innerHTML = 'DailyHelper <span class="chip chip-new">新</span>';
      return { btn1: btn1, modal: modal, path: path, ok: ok, steps: steps, card: card, confirm: confirm, toast: toast, newItem: newItem };
    },
    run: async function (c, r) {
      await c.wait(500);
      await c.click(r.btn1);
      await c.show(r.modal, 300);
      await c.move(r.path);
      await c.type(r.path, 'D:\\Scripts\\DailyHelper', 16);
      await c.wait(300);
      await c.click(r.ok);
      r.modal.classList.remove('in');
      await c.show(r.steps, 350);
      var lines = ['读了 README.md', '启动方式：DailyHelper.exe --task <任务>', '找到 3 个任务：每日任务 / 材料速刷 / 领奖励', '配置在 config/settings.json', '日志在 logs/run.log'];
      for (var i = 0; i < lines.length; i++) { var s = mk('div', 'aw-step', null, r.steps); s.innerHTML = '<i>✓</i><span>' + lines[i] + '</span>'; await c.wait(430); }
      await c.show(r.card, 400);
      await c.click(r.confirm);
      r.card.classList.remove('in');
      r.newItem.classList.add('in');
      await c.show(r.toast, 1800);
      r.toast.classList.remove('in');
    }
  };

  /* 2 编排与定时 */
  SCEN[1] = {
    zh: '编排与定时', en: 'PIPELINE',
    build: function () {
      body.innerHTML = '';
      head.innerHTML = '编排<i>/</i><b>流水线 · 每天早上的日常</b>';
      railItems['编排'].classList.add('on');
      var pal = mk('div', 'aw-side', null, body); pal.style.width = '140px';
      mk('div', null, '节点', pal).style.cssText = 'font-size:11px;color:#8a8a8e';
      ['脚本任务', 'agent 步骤', '等待', '发消息', '人工确认'].forEach(function (n) { mk('div', 'aw-list-item', '＋ ' + n, pal); });
      var canvas = mk('div', 'pl-canvas', null, body);
      var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('class', 'pl-edge-svg'); svg.setAttribute('viewBox', '0 0 880 560');
      canvas.appendChild(svg);
      function node(id, x, y, title, sub) {
        var n = mk('div', 'pl-node aw-el', null, canvas);
        n.style.left = x + 'px'; n.style.top = y + 'px'; n.dataset.nid = id;
        mk('div', null, title, n); if (sub) mk('small', null, sub, n);
        mk('div', 'pl-chip', null, n);
        return n;
      }
      var n0 = node('start', 20, 240, '开始'); n0.classList.add('term');
      var n1 = node('a', 150, 80, '模拟器日常', '日常任务');
      var n2 = node('b', 150, 230, '桌面日常', '清体力');
      var n3 = node('c', 150, 380, '每日巡检', '材料速刷');
      var n4 = node('msg', 370, 230, '发消息', '「日常都跑完了」');
      var n5 = node('end', 540, 240, '结束'); n5.classList.add('term');
      function edge(a, b) {
        var na = canvas.querySelector('[data-nid="' + a + '"]'), nb = canvas.querySelector('[data-nid="' + b + '"]');
        var p1 = { x: parseFloat(na.style.left) + (na.classList.contains('term') ? 62 : 130), y: parseFloat(na.style.top) + 24 };
        var p2 = { x: parseFloat(nb.style.left), y: parseFloat(nb.style.top) + 24 };
        var e = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        e.setAttribute('d', 'M' + p1.x + ' ' + p1.y + ' C' + (p1.x + 50) + ' ' + p1.y + ',' + (p2.x - 50) + ' ' + p2.y + ',' + p2.x + ' ' + p2.y);
        e.setAttribute('class', 'pl-edge'); svg.appendChild(e); return e;
      }
      var edges = [edge('start', 'a'), edge('start', 'b'), edge('start', 'c'), edge('a', 'msg'), edge('b', 'msg'), edge('c', 'msg'), edge('msg', 'end')];
      var check = mk('div', 'pl-check aw-panel aw-el', null, body);
      check.innerHTML = '<h5>运行前检查</h5><div>预计约 4 分钟</div><div style="margin:4px 0">ⓘ「桌面日常·清体力」和「每日巡检·材料速刷」都要用桌面鼠标键盘，会自动排队依次运行。</div><span class="chip chip-ok">可以运行</span>';
      var gear = mk('button', 'aw-btn aw-btn-s aw-el', '⏱ 定时与自启', body);
      gear.style.cssText = 'position:absolute;right:14px;bottom:14px;';
      var zoom = mk('div', 'aw-el', null, body);
      zoom.style.cssText = 'position:absolute;left:14px;bottom:14px;display:flex;gap:4px';
      zoom.innerHTML = '<button class="aw-btn aw-btn-s" style="padding:3px 9px">−</button><button class="aw-btn aw-btn-s" style="padding:3px 9px">100%</button><button class="aw-btn aw-btn-s" style="padding:3px 9px">＋</button>';
      var pop = mk('div', 'aw-pop aw-el', null, body);
      pop.style.cssText = 'right:14px;bottom:56px;width:250px;';
      var tr = mk('div', 'aw-toggle', null, pop);
      mk('span', null, '每天', tr);
      var time = mk('div', 'aw-field', '', tr); time.style.cssText = 'width:80px;display:inline-block';
      ['错过后宽限内补跑', '开机自启', '跑完后睡眠'].forEach(function (t2) {
        var tg = mk('div', 'aw-toggle', null, pop);
        mk('span', null, t2, tg);
        mk('span', 'aw-sw', null, tg);
      });
      var runBtn = mk('button', 'aw-btn aw-btn-p aw-el', '▶ 运行', body);
      runBtn.style.cssText = 'position:absolute;right:130px;bottom:14px;';
      return { nodes: [n0, n1, n2, n3, n4, n5], edges: edges, check: check, gear: gear, zoom: zoom, pop: pop, time: time, runBtn: runBtn };
    },
    run: async function (c, r) {
      for (var i = 0; i < r.nodes.length; i++) { await c.show(r.nodes[i], 200); }
      await c.wait(200);
      r.edges.forEach(function (e, j) { setTimeout(function () { e.classList.add('draw'); }, j * 120); });
      await c.wait(900);
      await c.show(r.check, 900);
      await c.show(r.zoom, 100);
      await c.show(r.gear, 200);
      await c.click(r.gear);
      await c.show(r.pop, 300);
      await c.move(r.time);
      await c.type(r.time, '06:30', 6);
      var sws = r.pop.querySelectorAll('.aw-sw');
      for (var j = 0; j < sws.length; j++) { await c.wait(350); sws[j].classList.add('on'); }
      await c.wait(400);
      r.pop.classList.remove('in');
      await c.show(r.runBtn, 200);
      await c.click(r.runBtn);
      function st(n, txt, kind) { n.querySelector('.pl-chip').innerHTML = ''; chip(txt, kind, n.querySelector('.pl-chip')); }
      st(r.nodes[1], '运行中', 'run'); await c.wait(500);
      st(r.nodes[2], '运行中', 'run'); st(r.nodes[3], '排队', 'wait'); await c.wait(1400);
      st(r.nodes[1], '成功', 'ok'); await c.wait(700);
      st(r.nodes[2], '成功', 'ok'); st(r.nodes[3], '运行中', 'run'); await c.wait(1300);
      st(r.nodes[3], '成功', 'ok'); st(r.nodes[4], '成功', 'ok'); await c.wait(500);
      st(r.nodes[5], '完成', 'ok');
    }
  };

  /* 3 监控与干预 */
  SCEN[2] = {
    zh: '监控与干预', en: 'MONITOR',
    build: function () {
      body.innerHTML = '';
      head.innerHTML = '运行<i>/</i><b>运行记录</b>';
      railItems['运行'].classList.add('on');
      var col = mk('div', null, null, body); col.style.cssText = 'flex:1;display:flex;flex-direction:column;min-width:0';
      var strip = mk('div', 'aw-panel', null, col);
      strip.style.cssText = 'margin:10px 12px 0;padding:8px 14px;display:flex;align-items:center;gap:14px;font-size:12px';
      strip.innerHTML = '<b>每天早上的日常</b><span class="chip chip-run">运行中</span><span style="color:#8a8a8e">2/4 完成</span><span style="color:#8a8a8e;margin-left:auto">已用 06:12</span>';
      var row = mk('div', null, null, col); row.style.cssText = 'flex:1;display:flex;min-height:0';
      var side = mk('div', 'aw-side', null, row); side.style.width = '160px'; side.style.borderRight = '0'; side.style.padding = '12px 8px';
      [['每日任务', '成功', 'ok'], ['清体力', '成功', 'ok'], ['材料速刷', '出错', 'err'], ['领奖励', '等待', 'wait']].forEach(function (r2, i) {
        var it = mk('div', 'aw-list-item' + (i === 2 ? ' on' : ''), null, side);
        it.innerHTML = r2[0] + ' <span class="chip chip-' + r2[2] + '" style="margin-left:auto">' + r2[1] + '</span>';
      });
      var log = mk('div', 'mn-log', null, row);
      var right = mk('div', 'mn-right', null, row);
      var inc = mk('div', 'mn-incident aw-panel aw-el', null, right);
      inc.innerHTML = '<h4>每日巡检 · 材料速刷：出错</h4>';
      var steps = mk('div', null, null, inc);
      var mini = mk('div', 'mn-mini aw-el', null, right); mini.style.height = '170px';
      mini.innerHTML = '<div class="gm-bar" style="left:0;top:0;width:100%;height:9%;background:#3a4453"></div>' +
        '<div class="gm-bar" style="left:0;top:9%;width:12%;height:91%"></div>' +
        '<div class="gm-bar" style="left:18%;top:18%;width:26%;height:14%"></div>' +
        '<div class="gm-bar" style="left:18%;top:38%;width:36%;height:10%"></div>' +
        '<div class="gm-bar" style="left:62%;top:18%;width:28%;height:56%;background:#5a6a86"></div>' +
        '<div class="gm-bar" style="left:66%;top:24%;width:20%;height:12%;background:#7c8db0"></div>' +
        '<div class="gm-modal"><b>活动公告</b><div style="margin-top:5px;color:#888">新活动「曙光前线」开启</div><div class="gm-x">×</div></div>';
      var msgs = mk('div', 'aw-el', null, right);
      msgs.style.cssText = 'display:flex;flex-direction:column;gap:8px';
      var prefill = ['[08:58:40] 流水线「每天早上的日常」开始', '[08:58:41] 模拟器日常 · 日常任务 启动', '[08:59:02] 桌面日常 · 清体力 启动', '[08:59:30] 模拟器日常 · 日常任务 完成', '[08:59:31] 桌面日常 · 清体力 完成', '[08:59:32] 每日巡检 · 材料速刷 启动', '[08:59:35] 进入关卡选择', '[08:59:40] 读取任务列表', '[08:59:46] 第 1 次作战开始', '[09:00:02] 第 1 次作战完成', '[09:00:06] 第 2 次作战开始', '[09:00:12] 第 2 次作战完成', '[09:00:14] 第 3 次作战开始', '[09:00:18] 等待界面返回…'];
      prefill.forEach(function (t) { mk('div', 'mn-line dim', t, log); });
      return { log: log, inc: inc, steps: steps, mini: mini, msgs: msgs };
    },
    run: async function (c, r) {
      var le = mk('div', 'mn-line err', '[09:00:21] 出错：遇到了不认识的界面', r.log); await c.wait(600);
      await c.show(r.inc, 400);
      var s1 = mk('div', 'aw-step', null, r.steps); s1.innerHTML = '<i>①</i><span>按脚本包的办法重新运行</span>'; await c.wait(700);
      s1.innerHTML = '<i>①</i><span>按脚本包的办法重新运行 <b style="color:#b33a2e">✗</b></span>'; await c.wait(500);
      var s2 = mk('div', 'aw-step', null, r.steps); s2.innerHTML = '<i>②</i><span>截图，交给 agent 处理</span>'; await c.wait(600);
      await c.show(r.mini, 500);
      var m1 = mk('div', 'mn-msg aw-el', '画面停在活动公告弹窗，我点右上角关掉它。', r.msgs); await c.show(m1, 600);
      var mx = r.mini.querySelector('.gm-modal'); var mxr = mx.getBoundingClientRect(), mwr = r.mini.getBoundingClientRect();
      var ring = mk('div', 'mn-ring', null, r.mini);
      ring.style.cssText = 'left:' + (mxr.right - mwr.left - 22) + 'px;top:' + (mxr.top - mwr.top + 6) + 'px;width:16px;height:16px';
      await c.move(mx); await c.wait(400);
      mx.style.transition = 'opacity .4s'; mx.style.opacity = '0'; ring.remove();
      await c.wait(500);
      var m2 = mk('div', 'mn-msg aw-el', '已关闭弹窗，让脚本继续。', r.msgs); await c.show(m2, 600);
      ['[09:00:34] 已恢复，继续材料速刷', '[09:00:39] 第 3 次作战完成', '[09:00:43] 全部任务完成'].forEach(function (t) { mk('div', 'mn-line', t, r.log); });
      await c.wait(600);
      var done = mk('div', 'aw-step', null, r.steps); done.innerHTML = '<i>✓</i><span>已解决 <span class="chip chip-ok">已解决</span> <span class="chip chip-grey">已推送到飞书</span></span>';
      await c.wait(800);
    }
  };

  /* 4 游戏信息 */
  SCEN[3] = {
    zh: '游戏信息', en: 'INTEL',
    build: function () {
      body.innerHTML = '';
      head.innerHTML = '游戏<i>/</i><b>全部活动</b>';
      railItems['游戏'].classList.add('on');
      var wrap = mk('div', 'it-wrap', null, body);
      var tabs = mk('div', 'it-tabs', null, wrap);
      mk('span', 'it-tab on', '全部活动', tabs);
      var add = mk('span', 'it-tab', '＋ 更多游戏', tabs);
      var top = mk('div', null, null, wrap); top.style.cssText = 'position:relative;flex:0 0 auto';
      mk('div', 'it-today', null, top).style.left = '55%';
      var games = [{ n: '星轨行动', bars: [['曙光前线', 20, 58, '#4c8dff', '剩 2 天'], ['联合补给', 55, 30, '#8a7dff', '剩 5 天']] },
        { n: '远空回响', bars: [['深空远征', 30, 66, '#2fbf8f', '剩 5 天']] },
        { n: '霜原纪行', bars: [['冰原试炼', 45, 45, '#e08a3c', '剩 12 天'], ['常驻委托', 8, 12, '#9a9a94', '常驻']] },
        { n: '潮汐边境', bars: [] }];
      var rows = games.map(function (g) {
        var row = mk('div', 'it-row', null, top);
        mk('div', 'it-name', g.n, row);
        var bw = mk('div', 'it-bar-wrap', null, row);
        var bars = g.bars.map(function (b) {
          var bar = mk('div', 'it-bar', b[4], bw);
          bar.style.cssText = 'left:' + b[1] + '%;width:' + b[2] + '%;background:' + b[3];
          return bar;
        });
        return { row: row, bars: bars };
      });
      var stats = mk('div', 'it-stats', null, wrap);
      stats.innerHTML = '<b style="font-size:12px">我的状态</b><span class="chip chip-run">进行中 2</span><span class="chip chip-wait">快结束 1</span><span class="chip chip-ok">已做完 3</span><span class="chip chip-grey">做了一部分 1</span>';
      var cards = mk('div', 'it-cards', null, wrap);
      [['曙光前线 · 星轨行动', '剩 2 天 5 小时', 'wait', '#4c8dff', 82], ['联合补给 · 星轨行动', '剩 5 天', 'run', '#8a7dff', 55], ['冰原试炼 · 霜原纪行', '剩 12 天', 'run', '#e08a3c', 30]].forEach(function (cdata) {
        var cd = mk('div', 'it-card', null, cards);
        cd.innerHTML = '<div style="font-size:12px;font-weight:600">' + cdata[0] + '</div><div style="height:5px;border-radius:3px;background:#eee;margin:8px 0"><i style="display:block;height:100%;width:' + cdata[4] + '%;border-radius:3px;background:' + cdata[3] + '"></i></div>';
        chip(cdata[1], cdata[2], cd);
      });
      var pop = mk('div', 'aw-pop aw-el', null, body);
      pop.style.cssText = 'left:110px;top:80px;width:300px';
      mk('h4', null, '添加游戏', pop).style.cssText = 'font-size:12px;margin-bottom:8px';
      var inp = mk('div', 'aw-field', '', pop);
      var steps = mk('div', 'aw-el', null, wrap);
      var newbar = mk('div', 'it-bar', '月汐节 · 剩 7 天', rows[3].row.querySelector('.it-bar-wrap'));
      newbar.style.cssText = 'left:38%;width:52%;background:#3ba8c9';
      var daily = mk('div', 'aw-el', null, wrap);
      daily.innerHTML = '<span class="chip chip-grey">每日日报 09:00 → 飞书</span>';
      daily.style.marginTop = '8px';
      return { add: add, pop: pop, inp: inp, rows: rows, steps: steps, newbar: newbar, daily: daily, stats: stats, cards: cards };
    },
    run: async function (c, r) {
      for (var i = 0; i < r.rows.length; i++) { r.rows[i].bars.forEach(function (b) { b.classList.add('in'); }); await c.wait(400); }
      var badge = chip('快结束', 'wait', r.rows[0].row); badge.classList.add('aw-el', 'in');
      await c.show(r.stats, 400);
      await c.show(r.cards, 500);
      await c.click(r.add);
      await c.show(r.pop, 300);
      await c.move(r.inp);
      await c.type(r.inp, '潮汐边境', 8);
      await c.wait(400);
      r.pop.classList.remove('in');
      await c.show(r.steps, 300);
      ['找到官方 Wiki', '找到官网公告', '读到 3 个活动'].forEach(function (t) {
        var s = mk('div', 'aw-step', null, r.steps); s.innerHTML = '<i>✓</i><span>' + t + '</span>';
      });
      await c.wait(1100);
      r.newbar.classList.add('in');
      await c.show(r.daily, 700);
    }
  };

  /* 5 Agent */
  SCEN[4] = {
    zh: 'Agent', en: 'AGENT',
    build: function () {
      body.innerHTML = '';
      head.innerHTML = '对话<i>/</i><b>诊断昨晚失败</b>';
      railItems['对话'].classList.add('on');
      var side = mk('div', 'aw-side', null, body); side.style.width = '190px';
      mk('div', null, '今天', side).style.cssText = 'font-size:10px;color:#a9a9ad';
      ['排每天早上的日常', '看模拟器是否在运行', '诊断昨晚失败'].forEach(function (n, i) { mk('div', 'aw-list-item' + (i === 2 ? ' on' : ''), n, side); });
      mk('div', null, '昨天', side).style.cssText = 'font-size:10px;color:#a9a9ad;margin-top:8px';
      ['导入 DailyHelper', '曙光前线还剩几天'].forEach(function (n) { mk('div', 'aw-list-item', n, side); });
      var wrap = mk('div', 'ag-wrap', null, body);
      var scroll = mk('div', 'ag-scroll', null, wrap);
      mk('div', 'ag-msg ag-u aw-el in', '把日常跑一下', scroll);
      mk('div', 'ag-msg ag-b aw-el in', '已排进今天 06:30 的流水线，3 个任务，预计 4 分钟。', scroll);
      var comp = mk('div', 'ag-composer', null, wrap);
      var model = mk('span', 'ag-model', '模型 · DeepSeek ▾', comp);
      var input = mk('div', 'ag-input', '', comp);
      var picker = mk('div', 'ag-picker aw-el', null, body);
      picker.style.cssText = 'left:230px;bottom:150px';
      ['DeepSeek', 'Claude', 'ChatGPT', 'Gemini', '通义千问', '本机 Ollama'].forEach(function (m, i) { mk('div', i === 5 ? 'on' : '', m, picker); });
      var menu = mk('div', 'ag-menu aw-el', null, body);
      menu.style.cssText = 'left:220px;bottom:150px';
      ['/技能', '/资讯', '/编排', '/诊断'].forEach(function (m) { mk('div', '', m, menu); });
      var approval = mk('div', 'ag-approval aw-panel aw-el', null, scroll);
      approval.innerHTML = '<h4>需要你的批准：重启模拟器</h4><div class="row"><button class="aw-btn aw-btn-p" data-a="ok">允许本次</button><button class="aw-btn aw-btn-s">拒绝</button></div>';
      return { scroll: scroll, model: model, input: input, picker: picker, menu: menu, approval: approval };
    },
    run: async function (c, r) {
      await c.wait(400);
      await c.click(r.model);
      await c.show(r.picker, 300);
      await c.click(r.picker.children[5]);
      r.picker.classList.remove('in');
      r.model.textContent = '模型 · 本机 Ollama ▾';
      await c.wait(300);
      await c.move(r.input);
      await c.type(r.input, '/', 10);
      await c.show(r.menu, 300);
      await c.click(r.menu.children[3]);
      r.menu.classList.remove('in');
      r.input.textContent = '';
      await c.type(r.input, '昨晚的日常为什么失败？', 14);
      await c.wait(300);
      var um = mk('div', 'ag-msg ag-u aw-el', '昨晚的日常为什么失败？', r.scroll); await c.show(um, 300);
      r.input.textContent = '';
      var steps = mk('div', 'ag-steps aw-el', '读取运行记录 · 查看 logs/run.log', r.scroll); await c.show(steps, 800);
      await c.show(r.approval, 400);
      r.scroll.scrollTop = r.scroll.scrollHeight;
      await c.click(r.approval.querySelector('[data-a=ok]'));
      r.approval.classList.remove('in');
      var rep = mk('div', 'ag-msg ag-b aw-el', '模拟器卡在启动页，已重启并重跑成功。', r.scroll); await c.show(rep, 500);
      var off = mk('div', 'ag-msg ag-b aw-el', null, r.scroll); off.innerHTML = '要把这次的做法存成技能吗？ <button class="aw-btn aw-btn-s" style="padding:3px 10px;font-size:11px">存成技能</button>'; await c.show(off, 400);
      r.scroll.scrollTop = r.scroll.scrollHeight;
      await c.click(off.querySelector('button'));
      var toast = mk('div', 'aw-toast aw-el', '已存为技能：诊断日常失败', body); await c.show(toast, 1600);
      toast.classList.remove('in');
    }
  };

  /* 6 飞书 */
  SCEN[5] = {
    zh: '飞书', en: 'FEISHU',
    build: function () {
      body.innerHTML = '';
      head.innerHTML = '运行<i>/</i><b>运行记录</b>';
      railItems['运行'].classList.add('on');
      var wrap = mk('div', 'fs-wrap', null, body);
      var app = mk('div', 'fs-app', null, wrap);
      var strip = mk('div', 'aw-panel', null, app);
      strip.style.cssText = 'padding:8px 12px;display:flex;gap:10px;align-items:center;font-size:12px';
      strip.innerHTML = '<b>每天早上的日常</b><span class="chip chip-run">运行中</span><span style="color:#8a8a8e">2/4 完成</span>';
      mk('div', null, '今日运行', app).style.cssText = 'font-size:11px;color:#8a8a8e;margin-top:4px';
      var ri = mk('div', 'fs-run-item', null, app);
      mk('span', null, '每日巡检 · 材料速刷', ri);
      var st = chip('出错 · 已暂停', 'err', ri);
      [['每日任务', '成功', 'ok'], ['清体力', '成功', 'ok'], ['领奖励', '等待', 'wait']].forEach(function (r2) {
        var it = mk('div', 'fs-run-item', null, app);
        mk('span', null, r2[0], it); chip(r2[1], r2[2], it);
      });
      var mini = mk('div', 'aw-panel', null, app);
      mini.style.cssText = 'padding:8px 12px;font-family:var(--font-mono);font-size:10px;color:#a9a9ad;line-height:1.7';
      mini.innerHTML = '[09:00:02] 第 1 次作战完成<br>[09:00:12] 第 2 次作战完成<br><span style="color:#b33a2e">[09:00:21] 出错：遇到了不认识的界面</span>';
      var phone = mk('div', 'fs-phone aw-el', null, wrap);
      mk('div', 'fs-phone-head', '🤖 MGA 助手', phone);
      var chat = mk('div', 'fs-chat', null, phone);
      var card = mk('div', 'fs-card aw-el', null, chat);
      card.innerHTML = '<div class="fs-card-t">每日巡检 · 材料速刷：出错</div><div class="fs-card-img"></div><div class="fs-card-btns"><b>停止</b><b class="go">继续</b><b>重试</b><b>忽略</b></div>';
      return { st: st, ri: ri, mini: mini, phone: phone, chat: chat, card: card };
    },
    run: async function (c, r) {
      await c.wait(400);
      await c.show(r.phone, 400);
      await c.show(r.card, 600);
      var go = r.card.querySelector('.go');
      await c.click(go);
      go.classList.add('on');
      r.st.textContent = '运行中'; r.st.className = 'chip chip-run';
      r.mini.innerHTML += '<br>[09:00:34] 已恢复，继续材料速刷';
      await c.wait(800);
      var um = mk('div', 'fs-msg fs-u aw-el', '', r.chat); await c.show(um, 200);
      await c.type(um, '现在什么状态', 9);
      await c.wait(600);
      var rep = mk('div', 'fs-msg fs-b aw-el', '3 个任务完成，1 个还在跑，预计 5 分钟后结束。', r.chat); await c.show(rep, 1000);
      var card2 = mk('div', 'fs-card aw-el', null, r.chat);
      card2.innerHTML = '<div class="fs-card-t">今日日报 · 星轨行动</div><div style="padding:8px 10px;color:#555;font-size:10.5px">活动「曙光前线」还剩 2 天；材料速刷 3/4 完成。</div>';
      await c.show(card2, 1000);
    }
  };

  /* ---------- orchestration ---------- */
  SCEN.forEach(function (s, i) {
    var b = mk('button', 'scen-tab', null, tabsEl);
    b.setAttribute('role', 'tab');
    mk('span', null, s.zh, b);
    var tr = mk('span', 'scen-track', null, b);
    fills[i] = mk('i', 'scen-fill', null, tr);
    b.addEventListener('click', function () { play(i); });
    b.addEventListener('keydown', function (e) {
      var n = e.key === 'ArrowRight' ? (i + 1) % SCEN.length : e.key === 'ArrowLeft' ? (i - 1 + SCEN.length) % SCEN.length : -1;
      if (n >= 0) { e.preventDefault(); tabBtns[n].focus(); play(n); }
    });
    tabBtns[i] = b;
  });

  async function play(i, seekFrac) {
    state.token++;
    var t = state.token;
    state.idx = i;
    cursor.classList.remove('on');
    tabBtns.forEach(function (b, j) { b.classList.toggle('on', j === i); });
    if (tabBtns[i].scrollIntoView) tabBtns[i].scrollIntoView({ block: 'nearest', inline: 'nearest' });
    fills.forEach(function (f) { f.style.transform = 'scaleX(0)'; });
    labelEl.textContent = 'DEMO // ' + SCEN[i].en;
    window.MGAFeature.set(i);
    Object.keys(railItems).forEach(function (n) { railItems[n].classList.remove('on'); });
    /* measure exact total via dry run */
    var refs0 = SCEN[i].build();
    if (!state.total[i]) state.total[i] = await measure(i, refs0);
    if (dead(t)) return;
    var refs = SCEN[i].build();
    fill = fills[i];
    var c = ctxFor(t, state.total[i] + 1200, (seekFrac || 0) * (state.total[i] + 1200));
    try {
      await SCEN[i].run(c, refs);
      await c.wait(1200);           // hold
      if (dead(t) || REDUCED || seekFrac >= 1) return;
      play((i + 1) % SCEN.length);
    } catch (e) { /* cancelled */ }
  }

  function seek(f) {
    var i = state.idx;
    play(i, f);
  }

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (en) { state.auto = !en[0].isIntersecting; }, { threshold: 0.2 }).observe(outer);
  }
  window.addEventListener('resize', fit);
  fit();
  play(0);

  window.__mgaDemo = window.__demo = {
    select: function (i) { play(i); },
    seek: seek,
    pause: function () { state.manual = true; },
    play: function (v) { if (typeof v === 'number') play(v); else state.manual = false; },
    state: function () { return { idx: state.idx, paused: state.manual, fill: fills[state.idx] ? fills[state.idx].style.transform : '' }; },
    setManual: function (v) { state.manual = v; },
    fill: function () { return fills[state.idx] ? fills[state.idx].style.transform : ''; },
    idx: function () { return state.idx; }
  };
})();
