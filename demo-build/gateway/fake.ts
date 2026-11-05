/* In-browser fake ADG gateway. Task/session state is simulated;
   game information and images come from the public API snapshot. */
import { Requests, Notifications, Pipeline, taskMessage, relayMessage } from '@adg/protocol';
import snapshot from '../../data/demo-games.json';
import { clock } from '../scenarios/clock.ts';
import type { RequestMethod, RequestParams, RequestResult, NotificationMethod, NotificationParams } from '@adg/protocol';

export interface RpcCall { method: string; params?: any }
/* params AND results compile-time typed; runtime zod check under ?validate=1 */
type Handler<M extends RequestMethod = RequestMethod> = (params: RequestParams<M>, push: <N extends NotificationMethod>(m: N, p: NotificationParams<N>) => void) => RequestResult<M> | Promise<RequestResult<M>>;

const VALIDATE = new URLSearchParams(location.search).has('validate');
const later = (run: () => void, ms: number) => clock.schedule(run, ms);

/* capabilities the plugins actually gate on — derived from every Requests entry's `capability` */
const CAPABILITIES = [...new Set(Object.values(Requests as Record<string, { capability: string | null }>).map(r => r.capability).filter(Boolean))].map(id => ({ id: id!, version: 1 }));

const OPT_REPLY = '脚本包有 2 处改动（草稿，等你确认）；卡住时间按日志节奏调成 60 秒；存了技能「清体力前先关活动公告」。';

/* ----- world state ----- */
export const world = {
  sessions: [
    { id: 's-home', title: '助手', updatedAt: Date.now() - 60e3, running: false, blank: false, live: false, home: 'main' },
    { id: 's-scripts', title: '优化脚本：三月七小助手', updatedAt: Date.now() - 300e3, running: false, blank: false, live: false, role: 'scripts', requestedBy: '助手', home: 'scripts' },
    { id: 's-daily', title: '排每天早上的日常', updatedAt: Date.now() - 3600e3, running: false, blank: false, live: false, cwd: 'D:\\MGA\\workspace', role: 'pipelines', requestedBy: '你', home: 'pipelines' },
    { id: 's-emu', title: '看模拟器是否在运行', updatedAt: Date.now() - 7200e3, running: false, blank: false, live: false },
    { id: 's-diag', title: '诊断昨晚失败', updatedAt: Date.now() - 200e3, running: false, blank: false, live: false, role: 'intervene', requestedBy: '监控', home: 'intervene' },
    { id: 's-game', title: '游戏信息：崩坏：星穹铁道', updatedAt: Date.now() - 400e3, running: false, blank: false, live: false, role: 'games', requestedBy: '定时', home: 'games' },
  ] as any[],
  scripts: [
    { id: 'emu-daily', name: 'MAA', packId: 'maa', source: { kind: 'local' as const, path: 'D:\\MGA\\tools\\emu-daily' }, current: 'local', dir: 'D:\\MGA\\tools\\emu-daily', versions: [{ version: '1.2.0', dir: 'D:\\MGA\\tools\\emu-daily', installedAt: Date.now() - 30 * 864e5, current: true }], channels: {}, addedAt: Date.now() - 30 * 864e5, enabled: true, summary: { state: 'done' as const, at: Date.now() - 20 * 864e5, text: '模拟器上的每日任务，自动领取奖励。' } },
    { id: 'desk-daily', name: 'MaaEnd', packId: 'maaend', source: { kind: 'local' as const, path: 'D:\\MGA\\tools\\desk-daily' }, current: 'local', dir: 'D:\\MGA\\tools\\desk-daily', versions: [{ version: '1.0.4', dir: 'D:\\MGA\\tools\\desk-daily', installedAt: Date.now() - 60 * 864e5, current: true }], channels: {}, addedAt: Date.now() - 60 * 864e5, enabled: true, summary: { state: 'done' as const, at: Date.now() - 20 * 864e5, text: '桌面上的每日任务合集。' } },
    { id: 'daily-helper', name: '三月七小助手', packId: 'march7th', optimize: { runs: 5, due: 'runs' as const }, source: { kind: 'local' as const, path: 'D:\\Scripts\\March7thAssistant' }, current: 'local', dir: 'D:\\Scripts\\March7thAssistant', versions: [{ version: '1.1.0', dir: 'D:\\Scripts\\March7thAssistant', installedAt: Date.now() - 10 * 864e5, current: true }], channels: {}, addedAt: Date.now() - 10 * 864e5, enabled: true, summary: { state: 'done' as const, at: Date.now() - 20 * 864e5, text: '配置驱动的桌面自动化脚本。' } },
  ] as any[],
  runs: [
    { id: 'run-1', scriptId: 'emu-daily', scriptName: 'MAA', taskId: 'daily', taskTitle: '日常任务', params: {}, state: 'succeeded', startedAt: Date.now() - 5000e3, endedAt: Date.now() - 4800e3, command: ['MAA.exe', '--task', 'daily'], resources: ['adb'], tags: [], warnings: [], kind: 'task', outcome: '成功' },
    { id: 'run-2', scriptId: 'desk-daily', scriptName: 'MaaEnd', taskId: 'clear', taskTitle: '清体力', params: {}, state: 'succeeded', startedAt: Date.now() - 4800e3, endedAt: Date.now() - 4600e3, command: ['MaaEnd.exe', '--task', 'clear'], resources: ['desktop'], tags: [], warnings: [], kind: 'task', outcome: '成功' },
    { id: 'run-3', scriptId: 'daily-helper', scriptName: '三月七小助手', taskId: 'farm', taskTitle: '材料速刷', params: {}, state: 'failed', startedAt: Date.now() - 1200e3, endedAt: Date.now() - 1100e3, command: ['March7thAssistant.exe', '--task', 'farm'], resources: ['desktop'], tags: ['unknown-screen'], warnings: [], kind: 'task', outcome: '遇到了不认识的界面' },
    { id: 'run-4', scriptId: 'desk-daily', scriptName: 'MaaEnd', taskId: 'claim', taskTitle: '领奖励', params: {}, state: 'running', startedAt: Date.now() - 100e3, command: ['MaaEnd.exe', '--task', 'claim'], resources: ['desktop'], tags: [], warnings: [], kind: 'task' },
  ] as any[],
  incidents: [
    {
      id: 'inc-1', runId: 'run-3', scriptId: 'daily-helper', scriptName: '三月七小助手', taskId: 'farm', taskTitle: '材料速刷',
      kind: 'error' as const, severity: 'error' as const, tag: 'unknown-screen',
      title: '三月七小助手 · 材料速刷：出错 — 遇到了不认识的界面',
      detail: '出错：遇到了不认识的界面',
      lines: ['[09:00:12] 第 2 次作战完成', '[09:00:14] 第 3 次作战开始', '[09:00:21] 出错：遇到了不认识的界面'],
      status: 'open' as const, createdAt: Date.now() - 900e3, updatedAt: Date.now() - 900e3,
      steps: [
        { at: Date.now() - 890e3, action: 'restart' as const, by: 'rule' as const, ok: false, detail: '按脚本包的办法重新运行' },
        { at: Date.now() - 880e3, action: 'intervene' as const, by: 'rule' as const, ok: true, detail: '截图，交给 agent 处理' },
      ],
      screenshot: false,
    },
    {
      id: 'inc-0', runId: 'run-2', scriptId: 'desk-daily', scriptName: 'MaaEnd', taskId: 'clear', taskTitle: '清体力',
      kind: 'stalled' as const, severity: 'warning' as const, tag: 'link-lost',
      title: 'MaaEnd · 清体力：断线',
      detail: '连接中断，长时间没有新日志',
      lines: ['[08:12:04] 正在结算…', '[08:19:51] 无新日志'],
      status: 'resolved' as const, resolution: '自动重跑成功', createdAt: Date.now() - 20000e3, updatedAt: Date.now() - 19000e3,
      steps: [
        { at: Date.now() - 19900e3, action: 'restart' as const, by: 'rule' as const, ok: true, detail: '按脚本包的办法重新运行' },
      ],
      screenshot: false,
    },
  ] as any[],
  interventions: [
    { id: 'iv-1', incidentId: 'inc-1', runId: 'run-3', sessionId: 's-iv', title: '干预：三月七小助手 · 材料速刷', mode: 'act' as const, state: 'running' as const, paused: true, startedAt: Date.now() - 880e3 },
  ] as any[],
  pipeline: Pipeline.parse({
    id: 'morning-daily', name: '每天早上的日常',
    nodes: [
      { id: 'emu', kind: 'script-task', title: 'MAA · 日常任务', scriptId: 'emu-daily', taskId: 'daily', params: {}, position: { x: 60, y: 60 } },
      { id: 'clear', kind: 'script-task', title: 'MaaEnd · 清体力', scriptId: 'desk-daily', taskId: 'clear', params: {}, position: { x: 60, y: 190 } },
      { id: 'farm', kind: 'script-task', title: '三月七小助手 · 材料速刷', scriptId: 'daily-helper', taskId: 'farm', params: {}, position: { x: 60, y: 320 } },
      { id: 'done', kind: 'notify', title: '发消息', text: '日常都跑完了', position: { x: 360, y: 190 } },
    ],
    edges: ['emu', 'clear', 'farm'].map((f: string) => ({ from: f, to: 'done', when: 'always' })),
    schedule: { enabled: true, times: ['06:30'], days: [], catchUpMinutes: 30 },
  }),
  /* work 助手 handed on, and 监控's hand-off to 干预 */
  handOffs: [
    { id: 'h-opt', fromSession: 's-home', callId: 'd1', by: '助手', to: 'scripts', toSession: 's-scripts', title: '优化脚本：三月七小助手',
      task: '最近 5 次都跑通了：按这些运行重新总结脚本包，调卡住时间，把走通的步骤存成技能。', state: 'done' as const,
      reply: OPT_REPLY, startedAt: Date.now() - 420e3, endedAt: Date.now() - 300e3 },
    { id: 'h-iv', fromSession: 's-home', by: '监控', to: 'intervene', toSession: 's-diag', title: '三月七小助手 · 材料速刷：遇到了不认识的界面',
      task: '脚本停在一个不认识的界面，看看画面，能处理就处理。', state: 'running' as const, startedAt: Date.now() - 200e3 },
  ] as any[],
  /* the homepage canvas's pipeline, as the app draws it */
  early: Pipeline.parse({
    id: 'early-daily', name: '早间日常',
    nodes: [
      { id: 'maa', kind: 'script-task', title: 'MAA · 日常', scriptId: 'emu-daily', taskId: 'daily', params: {}, position: { x: 140, y: 40 } },
      { id: 'm7d', kind: 'script-task', title: '三月七 · 日常', scriptId: 'daily-helper', taskId: 'daily', params: {}, position: { x: 140, y: 260 } },
      { id: 'm7s', kind: 'script-task', title: '三月七 · 清体力', scriptId: 'daily-helper', taskId: 'clear', params: {}, position: { x: 440, y: 260 } },
      { id: 'agent', kind: 'agent', title: '查活动进度', prompt: '进游戏看看各活动还有哪些没做完，记下快结束的', waitForAll: true, position: { x: 440, y: 40 } },
      { id: 'feishu', kind: 'notify', title: '发飞书', text: '早间日常跑完了，附上各游戏进度', position: { x: 740, y: 150 } },
    ],
    edges: [
      { from: 'maa', to: 'agent', when: 'always' }, { from: 'm7d', to: 'm7s', when: 'always' }, { from: 'm7s', to: 'agent', when: 'always' },
      { from: 'agent', to: 'feishu', when: 'always' },
    ],
    schedule: { enabled: true, times: ['09:00'], days: [1, 2, 3, 4, 5], catchUpMinutes: 30 },
  }),
  feishu: { appId: 'cli_a1b2c3d4e5f60718', enabled: true, connected: true, bot: 'MGA 助手', users: [{ openId: 'ou_demo', name: '演示用户' }] },
};

/* session event fixtures (valid SessionEvent records) */
let seq = 0;
const ev = (type: string, extra: any = {}) => ({ type, seq: seq++, time: Date.now() - (60 - seq) * 1000, turn: 1, step: 1, timing: { tokenChunks: 4 }, ...extra });
const text = (t: string) => [{ type: 'text' as const, text: t }];
export const sessionEvents: Record<string, any[]> = {
  's-home': [
    ev('turn/start'),
    ev('user/message', { messageId: 'h1', content: text('三月七小助手这周都跑通了，帮我优化一下脚本'), origin: { kind: 'user', human: true } }),
    ev('step/start', { step: 1 }),
    ev('assistant/message', { messageId: 'h2', content: [{ type: 'other', kind: 'tool-call', callId: 'd1', name: 'agent_delegate', arguments: '{"agent":"脚本","task":"优化脚本：三月七小助手"}' }] }),
    ev('tool/call', { callId: 'd1', name: 'agent_delegate', arguments: '{"agent":"脚本","task":"优化脚本：三月七小助手"}' }),
    ev('tool/result', { callId: 'd1', isError: false, content: text('已交给「脚本」') }),
    ev('assistant/message', { messageId: 'h3', content: text('交给「脚本」了，它做完会回到这里。') }),
    ev('step/end', { step: 1 }),
    ev('turn/end', { reason: { kind: 'completed' } }),
    ev('turn/start', { turn: 2 }),
    ev('user/message', { turn: 2, messageId: 'h4', content: text(relayMessage({ agent: '脚本', asker: '你', title: '优化脚本：三月七小助手', ok: true, reply: OPT_REPLY })), origin: { kind: 'handoff', human: false } }),
    ev('step/start', { turn: 2, step: 1 }),
    ev('assistant/message', { turn: 2, messageId: 'h5', content: text('优化好了：脚本包有 2 处改动等你确认，卡住时间调成 60 秒，还存了一个技能「清体力前先关活动公告」。') }),
    ev('step/end', { turn: 2, step: 1 }),
    ev('turn/end', { turn: 2, reason: { kind: 'completed' } }),
  ],
  's-scripts': [
    ev('turn/start'),
    ev('user/message', { messageId: 'o1', content: text(taskMessage('助手', '优化脚本：三月七小助手', '最近 5 次都跑通了：按这些运行重新总结脚本包，调卡住时间，把走通的步骤存成技能。', true)), origin: { kind: 'handoff', human: false } }),
    ev('step/start', { step: 1 }),
    ev('assistant/message', { messageId: 'o2', content: text(OPT_REPLY) }),
    ev('step/end', { step: 1 }),
    ev('turn/end', { reason: { kind: 'completed' } }),
  ],
  's-diag': [
    ev('turn/start'),
    ev('user/message', { messageId: 'm1', content: text(taskMessage('监控', '三月七小助手 · 材料速刷：遇到了不认识的界面', '昨晚的日常为什么失败？脚本停在一个不认识的界面，看看画面，能处理就处理。', true)), origin: { kind: 'handoff', human: false } }),
    ev('step/start', { step: 1 }),
    ev('assistant/message', { messageId: 'm2', content: [{ type: 'other', kind: 'tool-call', callId: 'c1', name: 'read_log', arguments: '{"path":"logs/run.log"}' }] }),
    ev('tool/call', { callId: 'c1', name: 'read_log', arguments: '{"path":"logs/run.log"}' }),
    ev('tool/result', { callId: 'c1', isError: false, content: text('[09:00:21] 模拟器卡在启动页，等待超时') }),
    ev('assistant/message', { messageId: 'm2b', content: text('模拟器卡在启动页，需要重启才能恢复。') }),
    ev('step/end', { step: 1 }),
    ev('step/start', { step: 2 }),
    ev('tool/call', { callId: 'c2', name: 'pwsh', arguments: '{\"cmd\":\"Restart-Emulator\"}' }),
    ev('approval/asked', { approvalId: 'ap-1', toolName: 'pwsh', callId: 'c2', reason: '需要你的批准：重启模拟器' }),
  ],
  's-daily': [
    ev('turn/start'),
    ev('user/message', { messageId: 'm1', content: text('把日常跑一下'), origin: { kind: 'user', human: true } }),
    ev('step/start', { step: 1 }),
    ev('assistant/message', { messageId: 'm2', content: text('已排进今天 06:30 的流水线，3 个任务，预计 4 分钟。') }),
    ev('step/end', { step: 1 }),
    ev('turn/end', { reason: { kind: 'completed' } }),
  ],
  's-emu': [
    ev('turn/start'),
    ev('user/message', { messageId: 'm1', content: text('看看模拟器现在是不是在运行'), origin: { kind: 'user', human: true } }),
    ev('step/start', { step: 1 }),
    ev('assistant/message', { messageId: 'm2', content: text('查过了：没有找到模拟器进程，现在没在运行。') }),
    ev('step/end', { step: 1 }),
    ev('turn/end', { reason: { kind: 'completed' } }),
  ],
  's-game': [
    ev('turn/start'),
    ev('system/message', { text: '游戏信息读取会话' }),
    ev('assistant/message', { messageId: 'm2', content: text('API 活动信息：' + snapshot.activities.filter(a => a.game === 'startrail').slice(0, 3).map(a => a.name).join('、') + '。这里只演示读取流程，不读取真实游戏进度。') }),
    ev('turn/end', { reason: { kind: 'completed' } }),
  ],
};

/* each script's stall time is learned from its own successful runs */
const monitorSettings = {
  defaultStallSeconds: 60, notifyWarnings: true, screenshot: false, intervene: 'act' as const, interventionsPerDay: 200,
  scriptStall: {
    'emu-daily': { seconds: 150, by: 'learned' as const, samples: [92, 118, 131, 140, 126], at: Date.now() - 2 * 864e5 },
    'desk-daily': { seconds: 90, by: 'learned' as const, samples: [48, 61, 70, 55, 66], at: Date.now() - 3 * 864e5 },
    'daily-helper': { seconds: 60, by: 'agent' as const, samples: [], at: Date.now() - 864e5, note: '加载关卡时最多安静 50 秒' },
  },
};
/* skills filed under their game and script, as the 技能 page groups them */
const demoSkills = [
  { name: 'startrail-events', description: '进入活动页，按剩余天数查看各活动的进度。', source: 'custom', provider: 'runtime', path: 'D:\\MGA\\skills\\startrail-events', modelInvocable: true, userInvocable: true, owner: { games: ['startrail'] } },
  { name: 'farecho-base-shift', description: '基建换班前先看干员心情，避免排班冲突。', source: 'custom', provider: 'runtime', path: 'D:\\MGA\\skills\\farecho-base-shift', modelInvocable: true, userInvocable: true, owner: { games: ['farecho'] } },
  { name: 'frostland-weekly', description: '终末地每周任务的入口和领取顺序。', source: 'custom', provider: 'runtime', path: 'D:\\MGA\\skills\\frostland-weekly', modelInvocable: true, userInvocable: true, owner: { games: ['frostland'] } },
  { name: 'close-event-notice', description: '清体力前先关闭活动公告弹窗，再继续执行。', source: 'custom', provider: 'runtime', path: 'D:\\MGA\\skills\\close-event-notice', modelInvocable: true, userInvocable: true, owner: { scripts: ['daily-helper'], games: ['startrail'] }, removable: true },
  { name: 'maa-copilot', description: '用 MAA 自动战斗打指定关卡。', source: 'custom', provider: 'runtime', path: 'D:\\MGA\\skills\\maa-copilot', modelInvocable: true, userInvocable: true, owner: { scripts: ['emu-daily'], games: ['farecho'] } },
  { name: 'pipeline-planning', description: '把多个脚本任务排成流水线，处理资源冲突。', source: 'custom', provider: 'runtime', path: 'D:\\MGA\\skills\\pipeline-planning', modelInvocable: true, userInvocable: true },
  { name: 'script-analysis', description: '读懂一个陌生脚本，写出脚本包草稿。', source: 'custom', provider: 'runtime', path: 'D:\\MGA\\skills\\script-analysis', modelInvocable: true, userInvocable: true },
];
/* the QQ official bot, connected beside Feishu */
const qqChecks = [{ id: 'config', label: 'AppID 和 AppSecret', ok: true }, { id: 'bot', label: '机器人信息', ok: true, detail: 'MGA 助手' }, { id: 'ws', label: 'WebSocket 连接', ok: true }, { id: 'users', label: '已允许用户', ok: true }];
const qqView = () => ({ settings: { enabled: true, appId: '102458731', allowedUsers: [{ openId: 'D3A1F07C9B2E4D61', name: '演示用户', addedAt: Date.now() - 2 * 864e5 }] }, secretConfigured: true, pending: [] });
export const lastRun: { current: any } = { current: null };
const initialWorld = structuredClone(world);
const initialEvents = structuredClone(sessionEvents);
const followed = new Set<string>();
export function resetWorld() {
  Object.assign(world, structuredClone(initialWorld));
  for (const key of Object.keys(sessionEvents)) delete sessionEvents[key];
  Object.assign(sessionEvents, structuredClone(initialEvents));
  followed.clear();
  lastRun.current = null;
  emit('approval/resolved', { approvalId: 'ap-1', outcome: 'rejected' });
}
export { ev, text };

/* ----- responders ----- */
const ok = <T>(r: T) => r;
const handlers: { [M in RequestMethod]?: Handler<M> } = {
  'initialize': () => ok({
    protocolVersion: 1,
    server: { name: 'adg-demo', version: '1.0.0-demo' },
    capabilities: CAPABILITIES,
  }),
  'sessions/list': () => ok({ items: world.sessions }),
  'roles/list': () => ok({ items: [
    { id: 'intervene', name: '干预', description: '脚本出问题时看画面、动手排除', order: 1 },
    { id: 'games', name: '游戏', description: '读活动日历，进游戏看你的进度', order: 2 },
    { id: 'scripts', name: '脚本', description: '安装、读懂和优化脚本', order: 3 },
    { id: 'pipelines', name: '编排', description: '把脚本排成流水线、设定时', order: 4 },
  ] }),
  'agents/home': (p) => ok({ sessionId: world.sessions.find(s => s.home === p.agentId)?.id ?? 's-home' }),
  'sessions/lastReplies': (p) => ok({ items: p.sessionIds.map(id => {
    const said = (sessionEvents[id] ?? []).filter(e => e.type === 'assistant/message').flatMap(e => e.content).filter((c: any) => c.type === 'text').at(-1);
    return { sessionId: id, text: said ? said.text.slice(0, 80) : null };
  }) }),
  'handoffs/list': (p) => ok({ items: world.handOffs.filter(h => h.fromSession === p.sessionId || h.toSession === p.sessionId) }),
  'handoffs/get': (p) => ok(world.handOffs.find(h => h.id === p.id) ?? world.handOffs[0]),
  'reminders/list': (p) => ok({ items: [
    { id: 'rem-report', agent: 'main', sessionId: 's-home', title: '每日日报', prompt: '总结今天各游戏的日常和活动进度，发到飞书和 QQ', rule: '每天 21:00', repeats: true, next: Date.now() + 6 * 3600e3 },
    { id: 'rem-events', agent: 'games', sessionId: 's-game', title: '看活动进度', prompt: '进游戏看看各活动还有哪些没做完', rule: '每天 09:40', repeats: true, next: Date.now() + 20 * 3600e3 },
  ].filter(r => p.agent === undefined || r.agent === p.agent) }),
  'reminders/remove': () => ok({}),
  'instances/others': () => ok({ others: [] }),
  'notify/notices': () => ok({ items: [] }),
  'models/roleModel': () => ok({ model: null }),
  'models/setRoleModel': () => ok({}),
  'sessions/create': () => {
    const s = { id: 's-' + Math.random().toString(36).slice(2, 8), title: null, updatedAt: Date.now(), running: false, blank: true, live: false, cwd: 'D:\\MGA\\workspace' };
    world.sessions.unshift(s);
    pushAll('sessions/changed', {});
    return ok({ sessionId: s.id });
  },
  'session/open': (p, push) => {
    const events = sessionEvents[p.sessionId] ?? [];
    if (p.sessionId === 's-diag') {
      // unresolved approval re-announces itself to whoever opens the session
      push('approval/requested', { approvalId: 'ap-1', sessionId: 's-diag', toolName: 'pwsh', callId: 'c2', reason: '需要你的批准：重启模拟器' });
    }
    return ok({
      subscriptionId: 'sub-demo', cursor: events.length, hasMore: false,
      title: world.sessions.find(s => s.id === p.sessionId)?.title ?? null,
      header: { id: p.sessionId, createdAt: Date.now() - 3600e3, cwd: 'D:\\MGA\\workspace', agentPreset: 'standard' },
      events, queued: [], live: null,
    });
  },
  'session/history': (p: any) => ok({ events: (sessionEvents[p.sessionId] ?? []).slice(0, p.throughSeq ?? 0), hasMore: false }),
  'session/model': () => ok({ lastUsed: { provider: 'demo', model: 'demo-1' }, next: null }),
  'session/selectModel': (p) => ok({ selected: { provider: p.provider ?? 'demo', model: p.model ?? 'demo-1' } }),
  'session/cancel': () => ok({ accepted: true } as any),
  'session/compact': () => ok({ compacted: true, message: '已压缩' }),
  'scripts/jobs': () => ok({ items: [] }),
  'session/prompt': () => ok({ accepted: true } as any),
  'session/close': () => ok({} as any),
  'sessions/archive': (p: any) => ok({ sessionIds: [p.sessionId] }),
  'scripts/list': () => ok({ scripts: world.scripts, packs: [], known: [], setups: [], toolsDir: 'D:\\MGA\\tools' } as any),
  'scripts/get': (p: any) => ok(world.scripts.find(s => s.id === p.id) ?? world.scripts[0]),
  'scripts/import': (p: any, push) => {
    const s: any = { id: 'm9a', name: p.name || 'M9A', source: { kind: 'local' as const, path: p.path }, current: 'local', dir: p.path, versions: [], channels: {}, addedAt: Date.now(), enabled: true };
    world.scripts.push(s);
    push('scripts/changed', {});
    return ok(s);
  },
  'configs/profiles': () => ok({ current: 'main', items: [{ id: 'main', name: '大号', createdAt: Date.now() - 20 * 864e5 }, { id: 'alt', name: '小号', createdAt: Date.now() - 6 * 864e5 }] }),
  'configs/launch': (p) => ok(p.scriptId === 'emu-daily'
    ? { settings: { mode: 'auto' as const, androidPackage: 'com.hypergryph.arknights' }, game: { name: '明日方舟', androidPackage: 'com.hypergryph.arknights', selfLaunch: '脚本会自己在模拟器里打开游戏' }, uses: { adb: true, desktop: false } }
    : { settings: { mode: 'auto' as const }, game: { name: p.scriptId === 'desk-daily' ? '明日方舟：终末地' : '崩坏：星穹铁道', selfLaunch: '脚本会自己启动游戏' }, uses: { adb: false, desktop: true } }),
  'configs/status': (p) => ok({ importedAt: Date.now() - 10 * 864e5, dir: 'D:\\MGA\\configs\\' + p.scriptId, profile: { id: 'main', name: '大号' }, files: [{ file: 'config.yaml', local: true, original: true, changed: false }], drift: [] }),
  'scripts/optimize': (p) => ok(p.decision === 'run' ? { sessionId: 's-scripts' } : {}),
  'scripts/summarize': (p, push) => {
    const sc = world.scripts.find((x: any) => x.id === p.id);
    if (sc) {
      sc.summary = { state: 'running', at: Date.now(), sessionId: 's-sum' };
      later(() => push('scripts/changed', { id: p.id }), 50);
      later(() => { sc.summary = { state: 'done', at: Date.now(), sessionId: 's-sum', text: 'M9A 是重返未来：1999 的日常助手，可自动完成每日荒原、意志解析和奖励领取。导入后不移动原目录，选好任务就能加入每天定时运行的流水线。（本页为模拟演示）' }; push('scripts/changed', { id: p.id }); }, 2200);
    }
    return ok({ sessionId: 's-sum' });
  },
  'scripts/install': () => ok({ jobId: 'job-1', scriptId: 'daily-helper' }),
  'scripts/update': () => ok({ upToDate: false, jobId: 'job-2' }),
  'scripts/settings/set': () => ok({ apiBase: 'https://api.github.com', downloadMirror: '', mirrorFallback: true, tokenRef: '', keepVersions: 3, includePrereleases: false, cdkRef: '' }),
  'pipelines/list': () => ok({ items: [world.pipeline, world.early].map(p => ({ id: p.id, name: p.name, nodes: p.nodes.length, draft: false, schedule: p.schedule })) }),
  'pipelines/get': (p: any) => ok(p.id === world.early.id ? world.early : world.pipeline),
  'pipelines/save': (p) => { Object.assign(world.pipeline, p.pipeline); return ok({ pipeline: world.pipeline, check: { ok: true, issues: [], serialized: [] } }); },
  'pipelines/check': (p) => p.pipeline.id === world.early.id ? ok({ ok: true, issues: [], serialized: [], estimateMinutes: 49 }) : ok({ ok: true, issues: [{ level: 'info' as const, message: '「MaaEnd·清体力」和「三月七小助手·材料速刷」都要用桌面鼠标键盘，会自动排队依次运行。' }], serialized: [{ a: 'clear', b: 'farm', resource: 'desktop' }], estimateMinutes: 4 }),
  'pipelines/run': (p, push) => {
    const pending = { state: 'pending' as const, runIds: [], attempts: 0 };
    const run: any = { id: 'prun-' + Date.now(), pipelineId: world.pipeline.id, pipelineName: world.pipeline.name, trigger: { kind: 'manual' as const }, state: 'running' as const, startedAt: Date.now(), nodes: Object.fromEntries(world.pipeline.nodes.map((n: any) => [n.id, { ...pending }])) };
    lastRun.current = run;
    push('pipelines/run', run);
    return ok(run);
  },
  'pipelines/runs': () => ok({ items: lastRun.current ? [lastRun.current] : [] }),
  'pipelines/cancel': () => ok({} as any),
  'runs/list': () => ok({ items: world.runs }),
  'runs/start': (p) => { const r = { id: 'run-' + Date.now(), scriptId: p.scriptId, scriptName: '三月七小助手', taskId: p.taskId, taskTitle: '材料速刷', params: p.params ?? {}, state: 'running' as const, startedAt: Date.now(), command: ['March7thAssistant.exe', '--task', p.taskId], resources: ['desktop'], tags: [], warnings: [], kind: 'task' as const }; world.runs.push(r); return ok(r); },
  'runs/stop': () => ok({}),
  'monitor/settings': () => ok(monitorSettings),
  'monitor/settings/set': () => ok(monitorSettings),
  'monitor/incidents': () => ok({ items: world.incidents }),
  'monitor/act': () => ok(world.incidents[0] ?? {} as any),
  'monitor/screenshot': () => ok({ mime: 'image/png' as const, data: '' }),
  'runs/tasks': (p: any) => ok({ tasks: [
    { id: 'daily', title: '每日任务', input: 'desktop' as const, utterances: ['跑日常'], params: {} },
    { id: 'farm', title: '材料速刷', input: 'desktop' as const, utterances: ['刷材料'], params: {} },
    { id: 'clear', title: '清体力', input: 'desktop' as const, utterances: ['清体力'], params: {} },
    { id: 'claim', title: '领奖励', input: 'desktop' as const, utterances: ['领奖励'], params: {} },
  ] as any, runnable: true }),
  'runs/logs': (p: any) => ok({ lines: [
    { runId: p.runId ?? 'run-3', at: Date.now() - 2000e3, source: 'script' as const, text: '[09:00:02] 第 1 次作战完成' },
    { runId: p.runId ?? 'run-3', at: Date.now() - 1900e3, source: 'script' as const, text: '[09:00:12] 第 2 次作战完成' },
    { runId: p.runId ?? 'run-3', at: Date.now() - 1800e3, source: 'script' as const, text: '[09:00:21] 出错：遇到了不认识的界面' },
  ] as any }),
  'sessions/archived': () => ok({ sessionIds: [] } as any),
  'schedule/status': () => ok({ settings: { autostart: false, autostartPipelines: [], autostartDelaySeconds: 0, skipIfRanToday: true, firstStartOnly: false, wakeToRun: false, powerCountdownSeconds: 60 }, autostart: { available: false, registered: false }, autostarted: false, wake: { available: false, registered: false }, power: { awake: false }, upcoming: [{ pipelineId: world.pipeline.id, pipelineName: world.pipeline.name, at: Date.now() + 12 * 3600e3 }], history: [] } as any),
  'schedule/settings/set': () => ok({} as any),
  'schedule/power': () => ok({ awake: false } as any),
  'packs/drafts': () => ok({ items: [] } as any),
  'guard/grants': () => ok({ items: [], blocked: 0 } as any),
  'schedule/power/cancel': () => ok({} as any),
  'games/catalog': () => ok({ games: snapshot.games.map(g => ({ sra: g.sra, name: g.name, followed: g.builtin || followed.has(g.sra), ...(g.builtin ? { pack: g.id } : {}) })) }),
  'games/discover': () => ok({ items: [] } as any),
  'games/follow': (p, push) => { if (p.follow) followed.add(p.sra); else followed.delete(p.sra); push('games/changed', {}); return ok({}); },
  'games/evidence': () => ok({ items: [] } as any),
  'games/image': async (p) => {
    const image = snapshot.images[p.url as keyof typeof snapshot.images];
    if (!image) throw new Error('图片不在 API 快照中');
    const response = await fetch(new URL('../' + image.path, location.href));
    if (!response.ok) throw new Error('图片加载失败');
    const bytes = new Uint8Array(await response.arrayBuffer());
    let binary = '';
    for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
    return { mediaType: image.mediaType, data: btoa(binary) };
  },
  'games/mirrorchyan': () => ok({ items: [], from: 'mirrorchyan' } as any),
  'skills/get': (p: any) => { const skill = demoSkills.find(k => k.name === p.name) ?? demoSkills[0]!; return ok({ ...skill, content: `# ${skill.name}\n\n${skill.description}` } as any); },
  'intervene/takeover': () => ok({} as any),
  'intervene/release': () => ok({} as any),
  'emulators/status': () => ok({ items: [] } as any),
  'emulators/start': () => ok({} as any),
  'emulators/stop': () => ok({} as any),
  'emulators/settings/set': () => ok({} as any),
  'permissions/get': () => ok({ mode: 'ask', recent: [] } as any),
  'permissions/set': () => ok({} as any),
  'persona/get': () => ok({ items: [] } as any),
  'persona/set': () => ok({} as any),
  'compaction/get': () => ok({ enabled: false } as any),
  'compaction/set': () => ok({} as any),
  'intervene/list': () => ok({ items: world.interventions }),
  'games/list': () => {
    const games = snapshot.games.filter(g => g.builtin || followed.has(g.sra));
    return ok({ games, activities: snapshot.activities.filter(a => games.some(g => g.id === a.game)), settings: { report: { enabled: true, at: '09:00', games: [], soonDays: 3, ai: true }, followed: [...followed] }, report: { next: Date.now() + 14 * 3600e3 } } as any);
  },
  'notify/conversations': () => ok({ items: [] } as any),
  'games/refresh': (p, push) => { push('games/changed', {}); return ok({ results: snapshot.games.filter(g => (!p.game || g.id === p.game) && (g.builtin || followed.has(g.sra))).map(g => ({ game: g.id, ok: g.refreshed.ok, count: snapshot.activities.filter(a => a.game === g.id).length, detail: 'API 图片快照；构建前刷新' })) }); },
  'games/read': () => ok({ sessionId: 's-game' }),
  'games/report/preview': () => ok({ title: '今日活动日报（演示）', text: snapshot.games.filter(g => g.builtin || followed.has(g.sra)).map(g => g.name + '：' + snapshot.activities.filter(a => a.game === g.id).slice(0, 3).map(a => a.name).join('、')).join('\n') }),
  'games/report/send': () => ok({ channels: ['飞书（演示）'], text: '演示日报，不发送真实消息。' }),
  'notify/status': () => ok({ channels: [{ id: 'feishu', name: '飞书', state: 'ready' as const, recipients: 1, checks: [{ id: 'config', label: '凭证已配置', ok: true }, { id: 'bot', label: '机器人信息', ok: true, detail: 'MGA 助手' }, { id: 'ws', label: '长连接', ok: true }, { id: 'users', label: '已允许用户', ok: true }] }, { id: 'qq', name: 'QQ', state: 'ready' as const, recipients: 1, checks: qqChecks }] }),
  'feishu/settings': () => ok({ settings: { enabled: true, appId: world.feishu.appId, domain: 'feishu' as const, allowedUsers: [{ openId: 'ou_demo', name: '演示用户', addedAt: Date.now() - 30 * 864e5 }], otherApprovals: true }, secretConfigured: true, pending: [] }),
  'feishu/settings/set': () => ok({ settings: { enabled: true, appId: world.feishu.appId, domain: 'feishu' as const, allowedUsers: [{ openId: 'ou_demo', name: '演示用户', addedAt: Date.now() - 30 * 864e5 }], otherApprovals: true }, secretConfigured: true, pending: [] }),
  'feishu/users/allow': (p) => ok({ settings: { enabled: true, appId: world.feishu.appId, domain: 'feishu' as const, allowedUsers: [{ openId: 'ou_demo', name: '演示用户', addedAt: Date.now() - 30 * 864e5 }, { openId: p.openId, name: p.name, addedAt: Date.now() }], otherApprovals: true }, secretConfigured: true, pending: [] }),
  'qqbot/settings': () => ok(qqView()),
  'qqbot/settings/set': () => ok(qqView()),
  'qqbot/users/allow': () => ok(qqView()),
  'qqbot/users/remove': () => ok(qqView()),
  'qqbot/check': () => ok({ checks: qqChecks }),
  'feishu/check': () => ok({ checks: [{ id: 'config', label: '凭证已配置', ok: true }, { id: 'bot', label: '机器人信息', ok: true, detail: 'MGA 助手' }, { id: 'ws', label: '长连接', ok: true }, { id: 'users', label: '已允许用户', ok: true }] }),
  'providers/list': () => ok({ revision: 1, providers: [{ id: 'demo', displayName: '演示模型', models: [{ id: 'demo-1', name: '演示模型 v1' }], api: 'openai-completions', baseURL: 'http://demo.local/v1', declared: true, active: true, credential: { kind: 'apiKey', configured: true, writable: true } }], writable: false, protocols: ['openai-completions'], taken: ['demo'] } as any),
  'models/catalog': () => ok({
    default: { provider: 'demo', model: 'demo-1' },
    groups: [
      { id: 'demo', name: '演示模型', models: [{ id: 'demo-1', name: '演示模型 v1', efforts: [{ id: 'none', name: '无' }] }] },
      { id: 'deepseek', name: 'DeepSeek', models: [{ id: 'deepseek-chat', name: 'DeepSeek V3', efforts: [{ id: 'none', name: '无' }] }] },
      { id: 'claude', name: 'Claude', models: [{ id: 'claude-sonnet', name: 'Claude Sonnet', efforts: [{ id: 'none', name: '无' }] }] },
      { id: 'chatgpt', name: 'ChatGPT', models: [{ id: 'gpt-4o', name: 'GPT-4o', efforts: [{ id: 'none', name: '无' }] }] },
      { id: 'gemini', name: 'Gemini', models: [{ id: 'gemini-pro', name: 'Gemini Pro', efforts: [{ id: 'none', name: '无' }] }] },
      { id: 'qwen', name: '通义千问', models: [{ id: 'qwen-max', name: 'Qwen Max', efforts: [{ id: 'none', name: '无' }] }] },
      { id: 'ollama', name: '本机 Ollama', models: [{ id: 'qwen3:8b', name: 'qwen3:8b', efforts: [{ id: 'none', name: '无' }] }] },
    ],
    failures: [],
  }),
  'models/setDefault': () => ok({}),
  'skills/list': () => ok({ skills: demoSkills }),
  'credentials/describe': () => ok({ items: {} }),
  'credentials/set': () => ok({}),
  'approval/respond': (p: any, push) => {
    push('approval/resolved', { approvalId: p.approvalId ?? 'ap-1', outcome: 'allowed-once' });
    const tail = [
      ev('approval/decided', { approvalId: 'ap-1', outcome: 'allowed-once' }),
      ev('tool/result', { step: 2, callId: 'c2', isError: false, content: text('模拟器已重启，日常任务重跑成功。') }),
      ev('assistant/message', { step: 2, messageId: 'm3', content: text('模拟器卡在启动页，已重启并重跑成功。下次遇到同样的情况我会直接这样处理，要把这次的做法存成技能吗？') }),
      ev('step/end', { step: 2 }),
      ev('turn/end', { reason: { kind: 'completed' } }),
    ];
    tail.forEach((e, i) => later(() => { sessionEvents['s-diag'].push(e); push('session/event', { subscriptionId: 'sub-demo', event: e } as any); }, 400 + i * 700));
    return ok({});
  },
};

/* ----- socket ----- */
let pushAll: (m: string, p: any) => void = () => {};

export class FakeGatewaySocket extends EventTarget {
  static OPEN = 1;
  readyState = 1;
  constructor(public url: string) {
    super();
    pushAll = (method, params) => this.#notify(method, params);
    queueMicrotask(() => this.dispatchEvent(new Event('open')));
  }
  send(data: string) {
    let msg: any;
    try { msg = JSON.parse(data); } catch { return; }
    const { id, method, params } = msg;
    const h = (handlers as Record<string, Handler>)[method];
    queueMicrotask(async () => {
      if (!h) {
        console.warn('[fake-gw] unknown method:', method);
        this.#deliver({ jsonrpc: '2.0', id, error: { code: -32601, message: 'unknown method ' + method } });
        return;
      }
      try {
        const result = await h(params ?? {}, (m: any, p: any) => this.#notify(m, p));
        if (VALIDATE && id !== undefined) {
          const schema = (Requests as any)[method]?.result;
          if (schema) {
            const r = schema.safeParse(result);
            if (!r.success) console.error('[validate]', method, r.error.issues.map((i: any) => i.path.join('.') + ': ' + i.message));
          }
        }
        if (id !== undefined) this.#deliver({ jsonrpc: '2.0', id, result });
      } catch (e) {
        if (id !== undefined) this.#deliver({ jsonrpc: '2.0', id, error: { code: -32000, message: String(e) } });
      }
    });
  }
  close() { this.readyState = 3; this.dispatchEvent(new Event('close')); }
  addEventListener(t: string, l: any) { super.addEventListener(t, l); }
  #deliver(msg: any) {
    this.dispatchEvent(new MessageEvent('message', { data: JSON.stringify(msg) }));
  }
  #notify(method: string, params: any) {
    if (VALIDATE) {
      const schema = (Notifications as any)[method];
      if (schema) {
        const r = schema.safeParse(params);
        if (!r.success) console.error('[validate]', method, r.error.issues.map((i: any) => i.path.join('.') + ': ' + i.message));
      }
    }
    this.#deliver({ jsonrpc: '2.0', method, params });
  }
}

/** Push a notification to all open sockets (director uses this). */
export function emit(method: string, params: any) { pushAll(method, params); }
