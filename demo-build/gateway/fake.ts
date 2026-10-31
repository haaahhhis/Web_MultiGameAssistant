/* In-browser fake ADG gateway. Implements the SocketLike surface the real
   AdgClient expects; all data is fictional demo content. */
import { Requests, Notifications } from '@adg/protocol';
import type { RequestMethod, RequestParams, RequestResult, NotificationMethod, NotificationParams } from '@adg/protocol';

export interface RpcCall { method: string; params?: any }
/* params AND results compile-time typed; runtime zod check under ?validate=1 */
type Handler<M extends RequestMethod = RequestMethod> = (params: RequestParams<M>, push: <N extends NotificationMethod>(m: N, p: NotificationParams<N>) => void) => RequestResult<M> | Promise<RequestResult<M>>;

const VALIDATE = new URLSearchParams(location.search).has('validate');

/* capabilities the plugins actually gate on — derived from every Requests entry's `capability` */
const CAPABILITIES = [...new Set(Object.values(Requests as Record<string, { capability: string | null }>).map(r => r.capability).filter(Boolean))].map(id => ({ id: id!, version: 1 }));

/* ----- world state ----- */
export const world = {
  sessions: [
    { id: 's-daily', title: '排每天早上的日常', updatedAt: Date.now() - 3600e3, running: false, blank: false, live: false, cwd: 'D:\\MGA\\workspace' },
    { id: 's-emu', title: '看模拟器是否在运行', updatedAt: Date.now() - 7200e3, running: false, blank: false, live: false },
    { id: 's-diag', title: '诊断昨晚失败', updatedAt: Date.now() - 200e3, running: false, blank: false, live: false },
    { id: 's-game', title: '游戏信息：星轨行动', updatedAt: Date.now() - 400e3, running: false, blank: false, live: false },
  ] as any[],
  scripts: [
    { id: 'emu-daily', name: '模拟器日常', source: { kind: 'local' as const, path: 'D:\\MGA\\tools\\emu-daily' }, current: 'local', dir: 'D:\\MGA\\tools\\emu-daily', versions: [{ version: '1.2.0', dir: 'D:\\MGA\\tools\\emu-daily', installedAt: Date.now() - 30 * 864e5, current: true }], channels: {}, addedAt: Date.now() - 30 * 864e5, enabled: true, summary: { state: 'done' as const, at: Date.now() - 20 * 864e5, text: '模拟器上的每日任务，自动领取奖励。' } },
    { id: 'desk-daily', name: '桌面日常', source: { kind: 'local' as const, path: 'D:\\MGA\\tools\\desk-daily' }, current: 'local', dir: 'D:\\MGA\\tools\\desk-daily', versions: [{ version: '1.0.4', dir: 'D:\\MGA\\tools\\desk-daily', installedAt: Date.now() - 60 * 864e5, current: true }], channels: {}, addedAt: Date.now() - 60 * 864e5, enabled: true, summary: { state: 'done' as const, at: Date.now() - 20 * 864e5, text: '桌面上的每日任务合集。' } },
    { id: 'daily-helper', name: '每日巡检', source: { kind: 'local' as const, path: 'D:\\Scripts\\DailyHelper' }, current: 'local', dir: 'D:\\Scripts\\DailyHelper', versions: [{ version: '1.1.0', dir: 'D:\\Scripts\\DailyHelper', installedAt: Date.now() - 10 * 864e5, current: true }], channels: {}, addedAt: Date.now() - 10 * 864e5, enabled: true, summary: { state: 'done' as const, at: Date.now() - 20 * 864e5, text: '配置驱动的桌面自动化脚本。' } },
  ] as any[],
  runs: [
    { id: 'run-1', scriptId: 'emu-daily', scriptName: '模拟器日常', taskId: 'daily', taskTitle: '日常任务', params: {}, state: 'succeeded', startedAt: Date.now() - 5000e3, endedAt: Date.now() - 4800e3, command: ['EmuDaily.exe', '--task', 'daily'], resources: ['adb'], tags: [], warnings: [], kind: 'task', outcome: '成功' },
    { id: 'run-2', scriptId: 'desk-daily', scriptName: '桌面日常', taskId: 'clear', taskTitle: '清体力', params: {}, state: 'succeeded', startedAt: Date.now() - 4800e3, endedAt: Date.now() - 4600e3, command: ['DeskDaily.exe', '--task', 'clear'], resources: ['desktop'], tags: [], warnings: [], kind: 'task', outcome: '成功' },
    { id: 'run-3', scriptId: 'daily-helper', scriptName: '每日巡检', taskId: 'farm', taskTitle: '材料速刷', params: {}, state: 'failed', startedAt: Date.now() - 1200e3, endedAt: Date.now() - 1100e3, command: ['DailyHelper.exe', '--task', 'farm'], resources: ['desktop'], tags: ['unknown-screen'], warnings: [], kind: 'task', outcome: '遇到了不认识的界面' },
    { id: 'run-4', scriptId: 'desk-daily', scriptName: '桌面日常', taskId: 'claim', taskTitle: '领奖励', params: {}, state: 'running', startedAt: Date.now() - 100e3, command: ['DeskDaily.exe', '--task', 'claim'], resources: ['desktop'], tags: [], warnings: [], kind: 'task' },
  ] as any[],
  incidents: [
    {
      id: 'inc-1', runId: 'run-3', scriptId: 'daily-helper', scriptName: '每日巡检', taskId: 'farm', taskTitle: '材料速刷',
      kind: 'error' as const, severity: 'error' as const, tag: 'unknown-screen',
      title: '每日巡检 · 材料速刷：出错 — 遇到了不认识的界面',
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
      id: 'inc-0', runId: 'run-2', scriptId: 'desk-daily', scriptName: '桌面日常', taskId: 'clear', taskTitle: '清体力',
      kind: 'stalled' as const, severity: 'warning' as const, tag: 'link-lost',
      title: '桌面日常 · 清体力：断线',
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
    { id: 'iv-1', incidentId: 'inc-1', runId: 'run-3', sessionId: 's-iv', title: '干预：每日巡检 · 材料速刷', mode: 'act' as const, state: 'running' as const, paused: true, startedAt: Date.now() - 880e3 },
  ] as any[],
  pipeline: {
    id: 'morning-daily', name: '每天早上的日常',
    nodes: [
      { id: 'emu', kind: 'script-task', title: '模拟器日常 · 日常任务', scriptId: 'emu-daily', taskId: 'daily', params: {}, position: { x: 60, y: 60 } },
      { id: 'clear', kind: 'script-task', title: '桌面日常 · 清体力', scriptId: 'desk-daily', taskId: 'clear', params: {}, position: { x: 60, y: 190 } },
      { id: 'farm', kind: 'script-task', title: '每日巡检 · 材料速刷', scriptId: 'daily-helper', taskId: 'farm', params: {}, position: { x: 60, y: 320 } },
      { id: 'done', kind: 'notify', title: '发消息', text: '日常都跑完了', position: { x: 360, y: 190 } },
    ],
    edges: ['emu', 'clear', 'farm'].map((f: string) => ({ from: f, to: 'done', when: 'always' })),
    schedule: { enabled: true, times: ['06:30'], days: [], catchUpMinutes: 30 },
  } as any,
  games: [
    { id: 'startrail', name: '星轨行动', activities: [{ name: '曙光前线', end: Date.now() + 2 * 864e5 }, { name: '联合补给 · 二期', end: Date.now() + 5 * 864e5 }] },
    { id: 'farecho', name: '远空回响', activities: [{ name: '深空远征', end: Date.now() + 5 * 864e5 }] },
    { id: 'frostland', name: '霜原纪行', activities: [{ name: '冰原试炼', end: Date.now() + 12 * 864e5 }, { name: '常驻委托', end: Date.now() + 400 * 864e5 }] },
  ] as any[],
  feishu: { appId: 'cli_a1b2c3d4e5f60718', enabled: true, connected: true, bot: 'MGA 助手', users: [{ openId: 'ou_demo', name: '演示用户' }] },
};

/* session event fixtures (valid SessionEvent records) */
let seq = 0;
const ev = (type: string, extra: any = {}) => ({ type, seq: seq++, time: Date.now() - (60 - seq) * 1000, turn: 1, step: 1, timing: { tokenChunks: 4 }, ...extra });
const text = (t: string) => [{ type: 'text' as const, text: t }];
export const sessionEvents: Record<string, any[]> = {
  's-diag': [
    ev('turn/start'),
    ev('user/message', { messageId: 'm1', content: text('昨晚的日常为什么失败？'), origin: { kind: 'user', human: true } }),
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
    ev('assistant/message', { messageId: 'm2', content: text('「曙光前线」还剩 2 天，商店还有 2 项没换；「联合补给」今天的部分已经做完。') }),
    ev('turn/end', { reason: { kind: 'completed' } }),
  ],
};

export const lastRun: { current: any } = { current: null };
const diagBase = sessionEvents['s-diag'].slice();
export function resetWorld() {
  sessionEvents['s-diag'] = diagBase.slice();
  world.scripts = world.scripts.filter((x: any) => x.id !== 'daily-helper-2');
  lastRun.current = null;
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
      setTimeout(() => push('approval/requested', { approvalId: 'ap-1', sessionId: 's-diag', toolName: 'pwsh', callId: 'c2', reason: '需要你的批准：重启模拟器' }), 50);
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
    const s: any = { id: 'daily-helper-2', name: 'DailyHelper', source: { kind: 'local' as const, path: p.path ?? 'D:\\Scripts\\DailyHelper' }, current: 'local', dir: p.path ?? 'D:\\Scripts\\DailyHelper', versions: [{ version: '1.0.0', dir: p.path ?? 'D:\\Scripts\\DailyHelper', installedAt: Date.now(), current: true }], channels: {}, addedAt: Date.now(), enabled: true };
    world.scripts.push(s);
    push('scripts/changed', {});
    return ok(s);
  },
  'scripts/summarize': (p, push) => {
    const sc = world.scripts.find((x: any) => x.id === p.id);
    if (sc) {
      sc.summary = { state: 'running', at: Date.now(), sessionId: 's-sum' };
      setTimeout(() => push('scripts/changed', { id: p.id }), 50);
      setTimeout(() => { sc.summary = { state: 'done', at: Date.now(), sessionId: 's-sum', text: 'DailyHelper 是一个配置驱动的桌面自动化脚本：按任务列表依次完成每日任务、材料速刷和领奖励，配置在 config/settings.json，日志写在 logs/run.log。适合每天定时运行。' }; push('scripts/changed', { id: p.id }); }, 2200);
    }
    return ok({ sessionId: 's-sum' });
  },
  'scripts/install': () => ok({ jobId: 'job-1', scriptId: 'daily-helper' }),
  'scripts/update': () => ok({ upToDate: false, jobId: 'job-2' }),
  'scripts/settings/set': () => ok({ apiBase: 'https://api.github.com', downloadMirror: '', mirrorFallback: true, tokenRef: '', keepVersions: 3, includePrereleases: false, cdkRef: '' }),
  'pipelines/list': () => ok({ items: [{ id: world.pipeline.id, name: world.pipeline.name, nodes: world.pipeline.nodes.length, draft: false, schedule: world.pipeline.schedule }] }),
  'pipelines/get': () => ok(world.pipeline),
  'pipelines/save': (p) => { Object.assign(world.pipeline, p.pipeline ?? {}); return ok(world.pipeline); },
  'pipelines/check': () => ok({ ok: true, issues: [{ level: 'info' as const, message: '「桌面日常·清体力」和「每日巡检·材料速刷」都要用桌面鼠标键盘，会自动排队依次运行。' }], serialized: [{ a: 'clear', b: 'farm', resource: 'desktop' }], estimateMinutes: 4 }),
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
  'runs/start': (p) => { const r = { id: 'run-' + Date.now(), scriptId: p.scriptId, scriptName: '每日巡检', taskId: p.taskId, taskTitle: '材料速刷', params: p.params ?? {}, state: 'running' as const, startedAt: Date.now(), command: ['DailyHelper.exe', '--task', p.taskId], resources: ['desktop'], tags: [], warnings: [], kind: 'task' as const }; world.runs.push(r); return ok(r); },
  'runs/stop': () => ok({}),
  'monitor/settings': () => ok({ defaultStallMinutes: 10, notifyWarnings: true, screenshot: false, intervene: 'act' as const, interventionsPerDay: 200 }),
  'monitor/settings/set': () => ok({ defaultStallMinutes: 10, notifyWarnings: true, screenshot: false, intervene: 'act' as const, interventionsPerDay: 200 }),
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
  'games/catalog': () => ok({ games: [{ sra: 'xt', name: '星轨行动', followed: true, pack: 'startrail' }, { sra: 'ye', name: '远空回响', followed: true, pack: 'echo' }, { sra: 'sr', name: '霜原纪行', followed: true, pack: 'frost' }, { sra: 'cx', name: '潮汐边境', followed: false }] } as any),
  'games/discover': () => ok({ items: [] } as any),
  'games/follow': () => ok({} as any),
  'games/evidence': () => ok({ items: [] } as any),
  'games/image': () => ok({ mime: 'image/png' as const, data: '' } as any),
  'games/mirrorchyan': () => ok({ items: [], from: 'mirrorchyan' } as any),
  'skills/get': () => ok({ name: 'pipeline-planning', description: '把多个脚本任务排成流水线。', source: 'custom', provider: 'runtime', path: 'D:\MGA\skills\pipeline-planning', modelInvocable: true, userInvocable: true, content: '# pipeline-planning' } as any),
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
  'games/list': () => ok({ games: world.games.map(g => ({ id: g.id, name: g.name, aliases: [], scripts: [], timezone: 'Asia/Shanghai', sources: [], builtin: false, followed: true })), activities: world.games.flatMap((g: any) => g.activities.map((a: any) => ({ id: g.id + '/' + a.name, name: a.name, game: g.id, endsAt: a.end, todo: [], done: [] }))), settings: { report: { enabled: true, at: '09:00', games: [], soonDays: 3, ai: true }, followed: [] }, report: { next: Date.now() + 14 * 3600e3 } } as any),
  'notify/conversations': () => ok({ items: [] } as any),
  'games/refresh': () => ok({ results: world.games.map(g => ({ game: g.id, ok: true, count: g.activities.length })) } as any),
  'games/read': () => ok({ sessionId: 's-game' }),
  'games/report/send': () => ok({ accepted: true } as any),
  'notify/status': () => ok({ channels: [{ id: 'feishu', name: '飞书', state: 'ready' as const, recipients: 1, checks: [{ id: 'config', label: '凭证已配置', ok: true }, { id: 'bot', label: '机器人信息', ok: true, detail: 'MGA 助手' }, { id: 'ws', label: '长连接', ok: true }, { id: 'users', label: '已允许用户', ok: true }] }] }),
  'feishu/settings': () => ok({ settings: { enabled: true, appId: world.feishu.appId, domain: 'feishu' as const, allowedUsers: [{ openId: 'ou_demo', name: '演示用户', addedAt: Date.now() - 30 * 864e5 }], otherApprovals: true }, secretConfigured: true, pending: [] }),
  'feishu/settings/set': () => ok({ settings: { enabled: true, appId: world.feishu.appId, domain: 'feishu' as const, allowedUsers: [{ openId: 'ou_demo', name: '演示用户', addedAt: Date.now() - 30 * 864e5 }], otherApprovals: true }, secretConfigured: true, pending: [] }),
  'feishu/users/allow': (p) => ok({ settings: { enabled: true, appId: world.feishu.appId, domain: 'feishu' as const, allowedUsers: [{ openId: 'ou_demo', name: '演示用户', addedAt: Date.now() - 30 * 864e5 }, { openId: p.openId, name: p.name, addedAt: Date.now() }], otherApprovals: true }, secretConfigured: true, pending: [] }),
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
  'skills/list': () => ok({ skills: [
    { name: 'pipeline-planning', description: '把多个脚本任务排成流水线，处理资源冲突。', source: 'custom', provider: 'runtime', path: 'D:\\MGA\\skills\\pipeline-planning', modelInvocable: true, userInvocable: true },
    { name: 'script-analysis', description: '读懂一个陌生脚本，写出脚本包草稿。', source: 'custom', provider: 'runtime', path: 'D:\\MGA\\skills\\script-analysis', modelInvocable: true, userInvocable: true },
    { name: '诊断日常失败', description: '查看运行日志，找出失败原因并处理。', source: 'custom', provider: 'runtime', path: 'D:\\MGA\\skills\\diagnose-daily', modelInvocable: true, userInvocable: true },
  ] }),
  'credentials/describe': () => ok({ items: {} }),
  'credentials/set': () => ok({}),
  'approval/respond': (p: any, push) => {
    push('approval/resolved', { approvalId: p.approvalId ?? 'ap-1', outcome: 'allowed-once' });
    const tail = [
      ev('tool/result', { step: 2, callId: 'c2', isError: false, content: text('模拟器已重启，日常任务重跑成功。') }),
      ev('assistant/message', { step: 2, messageId: 'm3', content: text('模拟器卡在启动页，已重启并重跑成功。下次遇到同样的情况我会直接这样处理，要把这次的做法存成技能吗？') }),
      ev('step/end', { step: 2 }),
      ev('turn/end', { reason: { kind: 'completed' } }),
    ];
    tail.forEach((e, i) => setTimeout(() => { sessionEvents['s-diag'].push(e); push('session/event', { subscriptionId: 'sub-demo', event: e } as any); }, 400 + i * 700));
    return ok({});
  },
};

/* ----- socket ----- */
let pushAll: (m: string, p: any) => void = () => {};
const pendingMessages: any[] = [];

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
    queueMicrotask(() => {
      if (!h) {
        console.warn('[fake-gw] unknown method:', method);
        this.#deliver({ jsonrpc: '2.0', id, error: { code: -32601, message: 'unknown method ' + method } });
        return;
      }
      try {
        const result = h(params ?? {}, (m: any, p: any) => this.#notify(m, p));
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
