// demo-build/scenarios/director.ts
// Stage 2: virtual-clock scenario engine driving the REAL UI + fake gateway.
import { emit, world, resetWorld, lastRun } from '../gateway/fake.ts';
import type { NotificationMethod } from '@adg/protocol';

type Ctx = { wait: (ms: number) => Promise<void>; click: (q: string) => Promise<void>; type: (q: string, text: string) => Promise<void>; go: (hash: string) => Promise<void>; };
const post = (type: string, payload: any = {}) => { try { parent.postMessage({ src: 'mga-demo', type, ...payload }, '*'); } catch { } };
const q = (sel: string) => document.querySelector(sel) as HTMLElement | null;
const qi = (sel: string) => document.querySelector(sel) as HTMLInputElement | null;
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));


/* visible-element lookup: exact text first, then substring */
const visible = (e: HTMLElement) => e.offsetParent !== null || getComputedStyle(e).position === 'fixed';
function find(sel: string): HTMLElement | null {
  try { const e = q(sel); if (e && visible(e)) return e; } catch { }
  const all = [...document.querySelectorAll<HTMLElement>('button,[role=button],[role=tab],a,li,[class*=card],[class*=item]')].filter(e => visible(e) && !e.closest('nav.rail'));
  const txt = (e: HTMLElement) => (e.textContent ?? '').trim();
  if (sel === '允许本次') return all.find(e => txt(e) === '允许本次') ?? all.find(e => txt(e).includes('允许') && !txt(e).includes('已允许')) ?? null;
  return all.find(e => txt(e) === sel) ?? all.find(e => txt(e).includes(sel)) ?? null;
}
/* demo cursor (styles in demo-build/index.html) */
const cursor = document.createElement('div');
cursor.id = 'demo-cursor';
cursor.innerHTML = '<svg viewBox="0 0 20 20" width="20" height="20"><path d="M4 2l12 8-6 1.5L7 18z" fill="#191919" stroke="#fff" stroke-width="1.2"/></svg>';
const center = (el: HTMLElement) => { const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; };
async function pointAt(el: HTMLElement) {
  if (!cursor.isConnected) document.body.appendChild(cursor);
  const p = center(el);
  cursor.classList.add('on');
  cursor.style.left = p.x + 'px'; cursor.style.top = p.y + 'px';
  await sleep(600);
}
function ripple(el: HTMLElement) {
  const p = center(el), r = document.createElement('div');
  r.className = 'demo-ripple'; r.style.left = p.x + 'px'; r.style.top = p.y + 'px';
  document.body.appendChild(r); setTimeout(() => r.remove(), 700);
}

/* virtual clock: every op advances `vt`; seek() runs with zero waits until vt>=target */
let vt = 0, total = 0, fast = false, pausedFlag = false, token = 0;
function mkCtx(dry: boolean): Ctx {
  const my = token;
  const isDead = () => my !== token;
  return {
    wait: async (ms) => {
      const start = vt;
      vt += ms;
      if (dry || fast && vt < seekTo) return;
      let done = 0, last = performance.now();
      for (;;) {
        if (isDead()) throw 'dead';
        const t = performance.now();
        if (!pausedFlag) done += t - last;
        last = t;
        post('progress', { frac: Math.min(1, (start + Math.min(done, ms)) / total) });
        if (done >= ms) return;
        await sleep(50);
      }
    },
    click: async (sel) => {
      vt += 900;
      if (dry || (fast && vt < seekTo)) return;
      if (isDead()) throw 'dead';
      const el = find(sel);
      if (!el) { console.warn('[director] missing target: ' + sel); await sleep(900); return; }
      await pointAt(el);
      if (isDead()) throw 'dead';
      ripple(el); el.click(); await sleep(250);
    },
    type: async (sel, text) => {
      vt += 700 + text.length * 60;
      if (dry || (fast && vt < seekTo)) return;
      if (isDead()) throw 'dead';
      const el = qi(sel) ?? qi('textarea') ?? qi('input');
      if (!el) { console.warn('[director] missing target: ' + sel); return; }
      await pointAt(el);
      el.focus();
      const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement : HTMLInputElement;
      const setter = Object.getOwnPropertyDescriptor(proto.prototype, 'value')!.set!;
      for (const ch of text) { if (isDead()) throw 'dead'; setter.call(el, el.value + ch); el.dispatchEvent(new Event('input', { bubbles: true })); await sleep(60); }
      el.dispatchEvent(new Event('change', { bubbles: true }));
      await sleep(150);
    },
    go: async (hash) => { vt += 900; if (dry || (fast && vt < seekTo)) return; if (isDead()) throw 'dead'; location.hash = hash; await sleep(800); },
  };
}

let seekTo = 0;
type SCEN = { setup: () => Promise<void>; run: (ctx: Ctx) => Promise<void>; };
const SCEN: SCEN[] = [];

const now = () => Date.now();

/* 1. 脚本 — import DailyHelper via the real import flow, then open it */
SCEN.push({
  setup: async () => { resetWorld(); emit('scripts/changed', {}); location.hash = '#/p/scripts'; await sleep(500); },
  run: async (c) => {
    await c.go('#/p/scripts');
    await c.wait(700);
    await c.click('导入本地项目');
    await c.wait(300);
    const field = qi('input[placeholder]'); if (field) field.placeholder = '例如 D:\\Scripts\\DailyHelper';
    await c.type('input[type=text],input:not([type])', 'D:\\Scripts\\DailyHelper');
    await c.wait(300);
    await c.click('导入');
    await c.wait(1400);
    await c.click('DailyHelper');
    await c.wait(900);
    await c.click('让 AI 总结');
    await c.wait(3600);
  },
});

/* 2. 编排与定时 — 运行 → node states progress → 运行记录 */
const nodeRun = (state: string, detail?: string) => ({ state, runIds: [], attempts: state === 'pending' ? 0 : 1, ...(detail ? { detail } : {}) });
function runPhase(nodes: Record<string, any>, state = 'running') {
  const r = lastRun.current;
  if (!r) return;
  r.nodes = { ...r.nodes, ...nodes }; r.state = state;
  if (state !== 'running') r.endedAt = now();
  emit('pipelines/run', { ...r } as any);
}
SCEN.push({
  setup: async () => { resetWorld(); location.hash = '#/p/pipelines/morning-daily'; await sleep(600); },
  run: async (c) => {
    await c.go('#/p/pipelines/morning-daily');
    await c.wait(1400);
    await c.click('运行');
    await c.wait(900);
    runPhase({ emu: nodeRun('running'), clear: nodeRun('running'), farm: nodeRun('waiting', '等桌面空出来') });
    await c.wait(2200);
    runPhase({ emu: nodeRun('succeeded'), clear: nodeRun('succeeded'), farm: nodeRun('running') });
    await c.wait(2200);
    runPhase({ farm: nodeRun('succeeded'), done: nodeRun('succeeded') }, 'succeeded');
    await c.wait(1200);
    await c.click('运行记录');
    await c.wait(2200);
  },
});

/* 3. 监控与干预 — log error → incident → intervention → resolved */
SCEN.push({
  setup: async () => { location.hash = '#/p/runs'; await sleep(600); },
  run: async (c) => {
    await c.go('#/p/runs');
    await c.wait(900);
    for (const [i, t] of ['[09:00:02] 材料速刷 第 1 次完成', '[09:00:12] 第 2 次完成', '[09:00:21] 出错：画面停在活动公告弹窗'].entries()) {
      await c.wait(1400);
      emit('runs/log' as NotificationMethod, { runId: 'run-3', lines: [{ runId: 'run-3', at: now(), source: 'script', text: t }] } as any);
      if (i === 2) {
        await c.wait(600);
        emit('monitor/incident' as NotificationMethod, { id: 'inc-1', runId: 'run-3', scriptId: 'inspect-daily', scriptName: '每日巡检', taskId: 'farm', taskTitle: '材料速刷', kind: 'error', state: 'open', title: '每日巡检 · 材料速刷：出错', reason: '画面停在活动公告弹窗', severity: 'error', tag: 'error', detail: '画面停在活动公告弹窗', lines: ['[09:00:21] 出错：画面停在活动公告弹窗'], status: 'open', createdAt: now(), updatedAt: now(), screenshot: true, steps: [{ at: now(), action: 'screenshot', by: 'rule', ok: true, detail: '截图已存' }] } as any);
        await c.wait(1000);
        emit('intervene/changed' as NotificationMethod, { id: 'iv-1', incidentId: 'inc-1', runId: 'run-3', sessionId: 's-iv', title: '干预：材料速刷', mode: 'act', state: 'running', paused: true, startedAt: now() } as any);
      }
    }
    await c.wait(2000);
    emit('intervene/changed' as NotificationMethod, { id: 'iv-1', incidentId: 'inc-1', runId: 'run-3', sessionId: 's-iv', title: '干预：材料速刷', mode: 'act', state: 'resolved', paused: false, startedAt: now() - 90000, endedAt: now(), resolution: 'resolved', summary: '画面停在活动公告弹窗，我点右上角关掉它。' } as any);
    emit('monitor/incident', { id: 'inc-1', runId: 'run-3', scriptId: 'daily-helper', scriptName: '每日巡检', taskId: 'farm', taskTitle: '材料速刷', kind: 'error', severity: 'error', tag: 'error', detail: '画面停在活动公告弹窗', lines: ['[09:00:21] 出错：画面停在活动公告弹窗'], status: 'resolved', resolution: 'agent 关掉了活动公告弹窗，脚本已继续', createdAt: now() - 60000, updatedAt: now(), screenshot: true, steps: [{ at: now() - 50000, action: 'screenshot', by: 'rule', ok: true, detail: '截图已存' }, { at: now() - 40000, action: 'intervene', by: 'rule', ok: true, detail: '交给 agent 处理' }, { at: now() - 5000, action: 'resolve', by: 'agent', ok: true, detail: '画面停在活动公告弹窗，我点右上角关掉它。' }, { at: now(), action: 'notify', by: 'rule', ok: true, detail: '已推送（飞书）' }] } as any);
    emit('notify/changed', {});
    await c.wait(2200);
  },
});

/* 4. 游戏信息 — open 星轨行动, add 潮汐边境 */
SCEN.push({
  setup: async () => { location.hash = '#/p/games'; await sleep(500); },
  run: async (c) => {
    await c.go('#/p/games');
    await c.wait(800);
    await c.click('星轨行动');
    await c.wait(1600);
    await c.go('#/p/games');
    await c.wait(700);
    await c.click('更多游戏');
    await c.wait(900);
    await c.click('潮汐边境');
    await c.wait(500);
    emit('games/changed', { game: 'tides' });
    await c.wait(2000);
  },
});

/* 5. Agent — /诊断 → tool step → approval → reply → skill offer */
SCEN.push({
  setup: async () => { resetWorld(); location.hash = '#/chat'; await sleep(400); },
  run: async (c) => {
    await c.go('#/s/s-diag');
    await c.wait(1200);
    /* the approval already pending in s-diag: respond it */
    await c.click('允许本次');
    await c.wait(3800);
  },
});

/* 6. 飞书 — settings page; the parent phone mock drives the beat */
SCEN.push({
  setup: async () => { location.hash = '#/settings/feishu'; await sleep(500); },
  run: async (c) => {
    await c.go('#/settings/feishu');
    await c.wait(9000); // parent phone: cards → scroll → report
  },
});

let current = -1, total2 = 0;
function onMsg(e: MessageEvent) {
  const d = (e.data ?? {}) as any;
  if (d.src !== 'mga-site') return;
  if (d.type === 'select') play(d.idx ?? 0, d.seek ?? 0);
  else if (d.type === 'pause') pausedFlag = true;
  else if (d.type === 'resume') pausedFlag = false;
  else if (d.type === 'seek') play(current < 0 ? 0 : current, d.frac ?? 0);
  else if (d.type === 'feishu-continue') emit('runs/state' as NotificationMethod, { ...world.runs[3], state: 'running' } as any);
}
async function play(i: number, f = 0) {
  current = i; token++; vt = 0; fast = f > 0; seekTo = 0;
  post('state', { idx: i });
  const dry = mkCtx(true); vt = 0;
  try { await SCEN[i].run(dry); } catch { }
  total = vt; vt = 0; seekTo = f * total;
  await SCEN[i].setup();
  const ctx = mkCtx(false);
  try { await SCEN[i].run(ctx); } catch { return; }
  fast = false;
  post('progress', { frac: 1 });
  post('ended', { idx: i });
}
export function startDirector() {
  addEventListener('message', onMsg);
  post('ready', {});
  (window as any).__mgaDemo = { select: (i: number) => play(i), seek: (f: number) => play(current < 0 ? 0 : current, f), pause: () => { pausedFlag = true; }, play: () => { pausedFlag = false; }, state: () => ({ current, vt, total, paused: pausedFlag }) };
}
