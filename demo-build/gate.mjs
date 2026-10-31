#!/usr/bin/env node
/* Stage-1 content gate: each URL must render the right page text with zero
   console/pageerror/reqfail/validate/unknown-method lines. Usage:
     node demo-build/gate.mjs [--shots <dir>] */
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const gate = JSON.parse(fs.readFileSync(path.join(here, 'gate.json'), 'utf8'));
gate.base = process.env.DEMO_GATE_BASE ?? gate.base;
const shotsDir = process.argv.includes('--shots') ? process.argv[process.argv.indexOf('--shots') + 1] : null;
const wait = ms => new Promise(r => setTimeout(r, ms));

/* playwright-core is resolved from PW_REQUIRE (a file inside a dir that has it
   in node_modules — e.g. the site repo's node_modules, the MGA repo, or a temp dir) */
const req = createRequire(process.env.PW_REQUIRE ?? path.resolve(here, '..', 'package.json'));
const { chromium } = req('playwright-core');

const b = await chromium.launch({ ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : { channel: 'chrome' }), headless: true, args: ['--no-proxy-server', '--no-sandbox'] });
let fails = 0;
for (const u of gate.urls) {
  const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
  const errs = [];
  p.on('console', m => { const t = m.text(); if (m.type() === 'error' || t.includes('[validate]') || t.includes('unknown method')) errs.push(t.slice(0, 140)); });
  p.on('pageerror', e => errs.push('PAGEERROR: ' + e.message.slice(0, 140)));
  p.on('requestfailed', r => errs.push('REQFAIL: ' + r.url().slice(0, 90)));
  await p.goto(gate.base + u.hash, { waitUntil: 'load' });
  await wait(3000);
  const text = await p.evaluate(() => document.body.innerText);
  const missing = [...gate.rail, ...(u.must || [])].filter(m => !text.includes(m));
  const banned = gate.banned.filter(m => text.includes(m));
  const shot = shotsDir ? path.join(shotsDir, `s2-${u.name}.png`) : null;
  if (shot) await p.screenshot({ path: shot });
  const ok = missing.length === 0 && banned.length === 0 && errs.length === 0;
  if (!ok) fails++;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${u.hash}${missing.length ? ' missing=[' + missing.join(',') + ']' : ''}${banned.length ? ' banned=[' + banned.join(',') + ']' : ''}${errs.length ? ' errs=' + errs.length + ' [' + errs.slice(0, 3).join(' | ') + ']' : ''}`);
  await p.close();
}
await b.close();
console.log(`GATE: ${gate.urls.length - fails}/${gate.urls.length} passed`);
process.exit(fails ? 1 : 0);
