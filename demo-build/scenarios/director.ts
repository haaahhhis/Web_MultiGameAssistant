import { emit, world, resetWorld, lastRun } from '../gateway/fake.ts';
import { clock } from './clock.ts';

type Step = { kind: 'wait'; ms: number } | { kind: 'go'; hash: string } | { kind: 'click'; target: string } | { kind: 'type'; target: string; text: string } | { kind: 'effect'; run: () => void };
const wait = (ms: number): Step => ({ kind: 'wait', ms });
const go = (hash: string): Step => ({ kind: 'go', hash });
const click = (target: string): Step => ({ kind: 'click', target });
const type = (target: string, text: string): Step => ({ kind: 'type', target, text });
const effect = (run: () => void): Step => ({ kind: 'effect', run });
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
let current = -1, total = 0, seeking = false;
const post = (type: string, payload: object = {}) => parent.postMessage({ src: 'mga-demo', type, idx: current, ...payload }, location.origin);
const progress = () => post('progress', { frac: total ? Math.min(1, clock.time / total) : 0, elapsed: clock.time });
const nodeRun = (state: string, detail?: string) => ({ state, runIds: [], attempts: state === 'pending' ? 0 : 1, ...(detail ? { detail } : {}) });
function runPhase(nodes: Record<string, ReturnType<typeof nodeRun>>, state = 'running') {
  const run = lastRun.current;
  if (!run) throw new Error('流水线尚未启动');
  Object.assign(run, { nodes: { ...run.nodes, ...nodes }, state, ...(state === 'running' ? {} : { endedAt: Date.now() }) });
  emit('pipelines/run', run);
}
function incident(resolved: boolean) {
  const item = world.incidents[0];
  Object.assign(item, { status: resolved ? 'resolved' : 'open', updatedAt: Date.now(), detail: '画面停在活动公告弹窗',
    ...(resolved ? { resolution: 'agent 关闭活动公告，脚本已继续' } : {}),
    steps: resolved ? [...item.steps, { at: Date.now(), action: 'resolve', by: 'agent', ok: true, detail: '关闭公告弹窗，继续执行' }] : item.steps });
  emit('monitor/incident', item);
  Object.assign(world.interventions[0], { state: resolved ? 'resolved' : 'running', paused: !resolved,
    ...(resolved ? { endedAt: Date.now(), resolution: 'resolved', summary: '已关闭公告弹窗，脚本继续执行。' } : {}) });
  emit('intervene/changed', world.interventions[0]);
  Object.assign(world.runs[2], { state: 'running' });
  delete world.runs[2].endedAt;
  emit('runs/state', world.runs[2]);
}
const scenes: Step[][] = [
  [go('#/p/scripts'), wait(700), click('导入本地项目'), type('#import-path', 'D:\\Scripts\\March7thAssistant'),
    type('#import-name', '三月七小助手'), click('导入'), wait(900), click('让 AI 总结'), wait(3200)],
  [go('#/p/pipelines/morning-daily'), wait(1100), click('定时与失败'), wait(2200), click('检查'), wait(1600), click('运行'), wait(700),
    effect(() => runPhase({ emu: nodeRun('running'), clear: nodeRun('running'), farm: nodeRun('waiting', '等待桌面资源') })), wait(2200),
    effect(() => runPhase({ emu: nodeRun('succeeded'), clear: nodeRun('succeeded'), farm: nodeRun('running') })), wait(2200),
    effect(() => runPhase({ farm: nodeRun('succeeded'), done: nodeRun('succeeded') }, 'succeeded')), click('运行记录'), wait(2400)],
  [go('#/p/runs'), wait(1000), effect(() => incident(false)), wait(2400), click('.incident-title'), wait(2400),
    effect(() => incident(true)), wait(3000)],
  [go('#/p/games'), click('刷新全部'), wait(900), click('崩坏：星穹铁道'), wait(3500),
    click('更多游戏'), wait(600), click('.catalog-grid label:last-child input'), wait(1000), click('更多游戏'), click('鸣潮'), wait(3000)],
  [go('#/s/s-diag'), wait(2000), click('允许本次'), wait(4200)],
  [go('#/settings/feishu'), wait(1200), click('重新检查'), wait(9000)],
];
const duration = (s: Step) => s.kind === 'wait' ? s.ms : s.kind === 'type' ? 750 + s.text.length * 60 : s.kind === 'effect' ? 0 : 900;
function find(target: string): HTMLElement | undefined {
  const visible = (el: HTMLElement) => el.getClientRects().length > 0;
  try { const el = document.querySelector<HTMLElement>(target); if (el && visible(el)) return el; } catch { /* text target */ }
  const candidates = [...document.querySelectorAll<HTMLElement>('.main button,.main [role=tab],.main a,.main label'), ...document.querySelectorAll<HTMLElement>('button,[role=tab],a,label')];
  return candidates.find(el => visible(el) &&
    ((el.textContent ?? '').trim() === target || [...el.childNodes].filter(n => n.nodeType === Node.TEXT_NODE).map(n => n.textContent).join('').trim() === target));
}
const cursor = document.createElement('div');
cursor.id = 'demo-cursor';
cursor.innerHTML = '<svg viewBox="0 0 20 20" width="20" height="20"><path d="M4 2l12 8-6 1.5L7 18z" fill="#191919" stroke="#fff" stroke-width="1.2"/></svg>';
function point(el: HTMLElement, instant: boolean) {
  el.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' });
  if (instant) return;
  if (!cursor.isConnected) document.body.appendChild(cursor);
  const rect = el.getBoundingClientRect(); cursor.classList.add('on');
  cursor.style.left = rect.left + rect.width / 2 + 'px'; cursor.style.top = rect.top + rect.height / 2 + 'px';
}
async function execute(step: Step, generation: number, instant: boolean) {
  const delay = async (ms: number) => { await clock.wait(ms, generation, progress); clock.assert(generation); };
  await delay(0);
  if (step.kind === 'effect') { step.run(); return; }
  if (step.kind === 'wait') { await delay(step.ms); return; }
  if (step.kind === 'go') { location.hash = step.hash; await sleep(100); clock.assert(generation); await delay(900); return; }
  let el: HTMLElement | undefined;
  for (let attempt = 0; attempt < 40; attempt++) {
    clock.assert(generation); el = find(step.target);
    if (el && !(el as HTMLButtonElement).disabled) break;
    await sleep(50);
  }
  if (!el || (el as HTMLButtonElement).disabled) throw new Error('找不到演示操作：' + step.target);
  await delay(0); point(el, instant); await delay(600);
  if (step.kind === 'click') {
    el.click(); await sleep(100); clock.assert(generation); await delay(300);
  } else {
    if (!(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement)) throw new Error('不是输入框：' + step.target);
    el.focus({ preventScroll: true });
    const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, 'value')!.set!;
    setter.call(el, '');
    for (const char of step.text) { await delay(60); setter.call(el, el.value + char); el.dispatchEvent(new Event('input', { bubbles: true })); }
    el.dispatchEvent(new Event('change', { bubbles: true })); await delay(150);
  }
}
async function play(index: number, fraction = 0) {
  if (!Number.isInteger(index) || !scenes[index] || !Number.isFinite(fraction)) return;
  current = index; clock.reset(); const generation = clock.generation;
  const target = Math.max(0, Math.min(1, fraction)); seeking = target > 0;
  total = scenes[index].reduce((sum, step) => sum + duration(step), 0);
  clock.seekTo = target * total;
  cursor.classList.remove('on'); resetWorld(); post('state'); progress();
  // Unmount the previous page so React's local state cannot leak into a replay.
  location.hash = '#/chat';
  try {
    await sleep(100); clock.assert(generation);
    for (const step of scenes[index]) await execute(step, generation, clock.time < target * total);
    await clock.wait(0, generation, progress);
    clock.assert(generation); seeking = false; progress(); post('ended');
  } catch (error) {
    if (generation !== clock.generation) return;
    seeking = false; console.error('[director]', error); post('error', { message: String(error) });
  }
}
export function startDirector() {
  addEventListener('message', e => {
    if (e.source !== parent || e.origin !== location.origin || e.data?.src !== 'mga-site') return;
    const d = e.data;
    if (d.type === 'select') void play(d.idx, d.seek ?? 0);
    else if (d.type === 'seek') void play(current < 0 ? 0 : current, d.frac);
    else if (d.type === 'pause') clock.paused = true;
    else if (d.type === 'resume') clock.paused = false;
  });
  post('ready');
  (window as any).__mgaDemo = { select: play, seek: (f: number) => play(current < 0 ? 0 : current, f),
    pause: () => { clock.paused = true; }, play: () => { clock.paused = false; },
    state: () => ({ current, vt: clock.time, total, paused: clock.paused, seeking }) };
}
