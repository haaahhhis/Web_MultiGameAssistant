#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const dest = path.join(root, 'data/demo-games.json');
const imagesDir = path.join(root, 'data/demo-images');
const api = 'https://starrailassistant.top/api/v1/activity/';
const games = [
  { id: 'startrail', sra: 'sr', name: '崩坏：星穹铁道', scripts: ['march7th'] },
  { id: 'farecho', sra: 'ak', name: '明日方舟', scripts: ['maa'] },
  { id: 'frostland', sra: 'end', name: '明日方舟：终末地', scripts: ['maaend'] },
  { id: 'sra-ww', sra: 'ww', name: '鸣潮', scripts: [] },
];
const at = Date.now();
const date = value => {
  if (typeof value !== 'string' || !value.trim()) return undefined;
  // SRA's unqualified dates are in Asia/Shanghai, not the build machine's timezone.
  const text = value.trim().replace(' ', 'T');
  const time = Date.parse(/(?:Z|[+-]\d\d:\d\d)$/.test(text) ? text : text + '+08:00');
  return Number.isFinite(time) ? time : undefined;
};
const cover = value => typeof value === 'string' && /^https:\/\//.test(value) ? value : undefined;
const dates = row => ({ startsAt: date(row.startTime), endsAt: date(row.endTime) });
let previous;
try { previous = JSON.parse(await readFile(dest, 'utf8')); } catch { /* first refresh */ }
await mkdir(imagesDir, { recursive: true });
const snapshot = { fetchedAt: at, games: [], activities: [], images: { ...previous?.images } };
for (const game of games) {
  const source = api + game.sra + '.json';
  try {
    const response = await fetch(source, { signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error('HTTP ' + response.status);
    const body = await response.json();
    if (!Array.isArray(body.activities)) throw new Error('Invalid SRA activity response');
    const activities = body.activities.filter(a => typeof a.name === 'string' && date(a.endTime) > at).map(a => ({
      id: game.id + '/' + a.name, game: game.id, name: a.name, ...dates(a), cover: cover(a.cover),
      description: typeof a.description === 'string' ? a.description.slice(0, 300) : undefined,
      kind: a.kind, todo: [], done: [], site: { source: 'sra', name: 'SRA 公共 API', at },
    }));
    snapshot.games.push({ ...game, aliases: [], timezone: 'Asia/Shanghai', builtin: game.sra !== 'ww', followed: game.sra === 'ww',
      sources: [{ id: 'sra', name: 'SRA 公共 API', homepage: 'https://starrailassistant.top/reference/public-api/', auto: true }],
      version: typeof body.version === 'string' ? { name: body.version, title: body.versionName, ...dates(body), cover: cover(body.cover), source: 'sra', at } : undefined,
      art: cover(body.cover), refreshed: { at, ok: true, count: activities.length },
      pools: (body.pools ?? []).filter(p => date(p.endTime) > at).map(p => ({ name: p.name, type: p.type, ...dates(p), cover: cover(p.cover), up: p.upCharacters ?? [] })),
    });
    snapshot.activities.push(...activities);
    console.log('[demo-games]', game.name, activities.length, 'activities');
  } catch (error) {
    const old = previous?.games.find(g => g.id === game.id);
    if (!old) throw error;
    snapshot.games.push({ ...old, refreshed: { ...old.refreshed, ok: false, detail: 'API 不可用，使用上次快照' } });
    snapshot.activities.push(...previous.activities.filter(a => a.game === game.id));
    console.warn('[demo-games] cached:', game.name, error.message);
  }
}
const urls = new Set(snapshot.games.flatMap(g => [g.art, g.version?.cover, ...(g.pools ?? []).map(p => p.cover)]).concat(snapshot.activities.map(a => a.cover)).filter(Boolean));
for (const url of urls) {
  if (snapshot.images[url]) {
    try { await readFile(path.join(root, snapshot.images[url].path)); continue; } catch { delete snapshot.images[url]; }
  }
  try {
    const referer = new URL(url).hostname.endsWith('hycdn.cn') ? 'https://ak.hypergryph.com/' : 'https://www.bilibili.com/';
    const response = await fetch(url, { signal: AbortSignal.timeout(15000), headers: { referer } });
    if (!response.ok) throw new Error('HTTP ' + response.status);
    const mediaType = response.headers.get('content-type')?.split(';')[0];
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif'].includes(mediaType)) throw new Error('Unsupported image type');
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length > 10 * 1024 * 1024) throw new Error('Image exceeds 10 MB');
    const name = createHash('sha256').update(url).digest('hex').slice(0, 20) + '.' + mediaType.split('/')[1];
    await writeFile(path.join(imagesDir, name), bytes);
    snapshot.images[url] = { path: 'data/demo-images/' + name, mediaType };
  } catch (error) { console.warn('[demo-games] image unavailable:', url, error.message); }
}
// Do not advertise a broken image; the real UI can fall back to another cover.
for (const g of snapshot.games) {
  if (!snapshot.images[g.art]) delete g.art;
  for (const item of [g.version, ...(g.pools ?? [])].filter(Boolean)) if (!snapshot.images[item.cover]) delete item.cover;
}
for (const a of snapshot.activities) if (!snapshot.images[a.cover]) delete a.cover;
snapshot.images = Object.fromEntries(Object.entries(snapshot.images).filter(([url]) => urls.has(url)));
await writeFile(dest, JSON.stringify(snapshot, null, 2) + '\n');
console.log('[demo-games] saved', snapshot.games.length, 'games,', Object.keys(snapshot.images).length, 'images');
