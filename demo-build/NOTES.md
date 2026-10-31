# Stage 1 progress notes

## Architecture
- `gateway/fake.ts`: handlers typed `{ [M in RequestMethod]?: (p: RequestParams<M>, push) => RequestResult<M> | Promise<RequestResult<M>> }` — params+results compile-checked. `?validate=1` → every result `Requests[m].result.safeParse`, every notification `Notifications[m].safeParse`, printing `path: message`.
- Typecheck: `node ../MultiGameAssistant/node_modules/typescript/bin/tsc -p demo-build/tsconfig.json` → **0 errors**.
- Real method names come from `packages/protocol/src/{methods,games,scripts,monitor,runs,notify,intervene,pipelines,skills,emulators,permissions,tools}.ts` (`XxxRequests` maps). Invented names removed: session/live, session/title, session/queue, scripts/job, scripts/settings/get, monitor/settings/get (it's `monitor/settings`), incidents/list (it's `monitor/incidents`), feishu/settings/get (it's `feishu/settings`), feishu/users/list, games/get, games/add.
- SessionEvent fixtures live in `sessionEvents` (s-diag has tool/call+result+approval/asked+turn/end reason.kind).

## Per-page status (gate: plausible text, zero error/PAGEERROR/REQFAIL/validate/unknown lines)
| URL | status |
|---|---|
| #/p/scripts | PASS |
| #/p/scripts/daily-helper | PASS |
| #/p/pipelines | PASS |
| #/p/pipelines/morning-daily | PASS |
| #/p/runs | PASS |
| #/p/games | PASS |
| #/p/games/startrail | PASS |
| #/chat | PASS |
| #/s/s-diag | PASS |
| #/p/skills | PASS |
| #/settings/feishu | PASS |
| #/settings | PASS |

## Known remaining gaps
- `as any` casts still on: games/list|refresh|activities|add-removed, games/report/send, skills/install, settings/get, emulator/list, approval/list, monitor/act, session/prompt|cancel|close, pipelines/cancel — shapes unverified vs schema; runtime safeParse will flag.
- monitor/incidents items: `world.incidents` is `[]` — runs page may need a populated Incident (id, runId, title, state...) — check Incident schema if the page probes thin.
