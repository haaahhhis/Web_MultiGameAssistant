#!/usr/bin/env node
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs/promises';

const root = fileURLToPath(new URL('../', import.meta.url));
const req = createRequire(process.env.PW_REQUIRE ?? path.join(root, 'package.json'));
const { chromium } = req('playwright-core');
const base = process.env.DEMO_SITE_BASE ?? 'http://127.0.0.1:8080/';
const browser = await chromium.launch({ ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : { channel: 'chrome' }), headless: true, args: ['--no-sandbox', '--no-proxy-server'] });
const shots = process.env.DEMO_SHOTS;
if (shots) await fs.mkdir(shots, { recursive: true });
let passed = 0, failed = 0;
async function check(name, run) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  // Releases are outside the feature demo; keep the test independent of GitHub rate limits.
  await page.route('https://api.github.com/**', route => route.fulfill({ json: [] }));
  page.on('console', m => { if (m.type() === 'error' || m.text().includes('[validate]') || m.text().includes('unknown method')) errors.push(m.text()); });
  page.on('pageerror', e => errors.push(e.message));
  page.on('websocket', s => errors.push('Unexpected backend connection: ' + s.url()));
  page.on('request', r => {
    if (r.method() !== 'GET') errors.push('Non-static request: ' + r.method() + ' ' + r.url());
    if (r.url().startsWith('http') && !r.url().startsWith(base) && !r.url().startsWith('https://api.github.com/')) errors.push('Unexpected external request: ' + r.url());
  });
  page.on('requestfailed', r => { if (!r.failure()?.errorText.includes('ERR_ABORTED')) errors.push(r.url()); });
  try {
    await run(page);
    assert.deepEqual(errors, [], 'browser errors');
    console.log('PASS', name); passed++;
  } catch (error) {
    console.error('FAIL', name, error.message, errors);
    console.error('STATE', await page.evaluate(() => ({ hash: location.hash, parent: window.__mgaDemo?.state(), text: document.body.innerText.slice(-2400) })));
    failed++;
  } finally {
    if (shots) await page.screenshot({ path: path.join(shots, name + '.png'), fullPage: true });
    await page.close();
  }
}
const ends = ['三月七小助手是崩坏：星穹铁道的日常助手', '已关闭公告弹窗', '崩坏：星穹铁道', '已重启并重跑成功', 'MGA 助手'];
try {
  for (let index = 0; index < ends.length; index++) await check('scene-' + index, async page => {
    await page.goto(base + 'app-demo/index.html?validate=1');
    await page.waitForFunction(() => window.__mgaDemo);
    await page.evaluate(index => { void window.__mgaDemo.select(index); }, index);
    if (index === 2) {
      for (const game of ['明日方舟', '明日方舟：终末地', '崩坏：星穹铁道']) {
        await page.waitForFunction(name => document.querySelector('.games-page .breadcrumb h1')?.textContent === name, game);
        await page.waitForFunction(() => { const image = document.querySelector('.version-art'); return image?.complete && image.naturalWidth > 0; });
      }
    }
    await page.waitForFunction(text => document.body.innerText.includes(text), ends[index]);
    await page.waitForFunction(() => { const s = window.__mgaDemo.state(); return s.total > 0 && Math.abs(s.vt - s.total) < 1; }, null, { timeout: 30000 });
    const state = await page.evaluate(() => window.__mgaDemo.state());
    assert.ok(Math.abs(state.vt - state.total) < 1, JSON.stringify(state));
    if (index === 2) {
      await page.waitForFunction(() => [...document.images].some(i => i.src.startsWith('data:image/') && i.complete && i.naturalWidth > 0));
      assert.ok(await page.locator('.game-tab[aria-selected="true"]').innerText().then(t => t.includes('崩坏：星穹铁道')));
      assert.ok(!(await page.locator('.games-page').innerText()).includes('鸣潮'));
    }
  });
  await check('pause-switch-seek', async page => {
    await page.goto(base + 'app-demo/index.html?validate=1');
    await page.waitForFunction(() => window.__mgaDemo);
    await page.evaluate(() => { void window.__mgaDemo.select(0); });
    await page.waitForFunction(() => document.querySelector('#import-path')?.value.length > 3);
    await page.evaluate(() => window.__mgaDemo.pause());
    await page.waitForTimeout(100);
    const before = await page.evaluate(() => ({ time: window.__mgaDemo.state().vt, value: document.querySelector('#import-path')?.value }));
    await page.waitForTimeout(400);
    assert.deepEqual(await page.evaluate(() => ({ time: window.__mgaDemo.state().vt, value: document.querySelector('#import-path')?.value })), before);
    await page.evaluate(() => { void window.__mgaDemo.select(4); void window.__mgaDemo.select(1); void window.__mgaDemo.select(2); window.__mgaDemo.play(); });
    await page.waitForFunction(() => document.querySelector('.games-page'));
    await page.evaluate(() => { window.__mgaDemo.pause(); void window.__mgaDemo.seek(0.5); });
    await page.waitForFunction(() => { const s = window.__mgaDemo.state(); return s.vt > 0 && Math.abs(s.vt - s.total * 0.5) < 1; });
    const state = await page.evaluate(() => window.__mgaDemo.state());
    await page.waitForTimeout(300);
    assert.equal((await page.evaluate(() => window.__mgaDemo.state())).vt, state.vt);
    await page.evaluate(() => window.__mgaDemo.play());
    await page.waitForFunction(() => { const s = window.__mgaDemo.state(); return s.vt === s.total; }, null, { timeout: 25000 });
  });
  await check('parent-feishu-replay', async page => {
    await page.goto(base + '?validate=1#day');
    await page.locator('#demoOuter').scrollIntoViewIfNeeded();
    await page.waitForFunction(() => window.__mgaDemo?.state().ready);
    await page.getByRole('tab', { name: /飞书$/ }).click();
    await page.waitForFunction(() => document.querySelectorAll('#fsReportBody > div').length === 4);
    await page.getByRole('button', { name: '暂停演示', exact: true }).click();
    const frame = page.frames().find(f => f.url().includes('/app-demo/'));
    await frame.waitForFunction(() => window.__mgaDemo.state().paused);
    const time = await frame.evaluate(() => window.__mgaDemo.state().vt);
    await page.waitForTimeout(400);
    assert.equal(await frame.evaluate(() => window.__mgaDemo.state().vt), time);
    await page.evaluate(() => window.__mgaDemo.seek(0.5));
    await page.waitForFunction(() => document.querySelectorAll('#fsReportBody > div').length === 4);
    await page.getByRole('tab', { name: /脚本$/ }).click();
    await page.getByRole('tab', { name: /飞书$/ }).click();
    assert.equal(await page.locator('#fsReportBody > div').count(), 0);
    await page.getByRole('button', { name: '播放演示', exact: true }).click();
    await page.waitForFunction(() => document.querySelectorAll('#fsReportBody > div').length === 4);
    assert.equal(await page.locator('#fsReportBody > div').count(), 4);
    await page.getByRole('button', { name: '暂停演示', exact: true }).click();
  });
  await check('reduced-motion-mobile', async page => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(base + '?validate=1#day');
    await page.locator('#demoOuter').scrollIntoViewIfNeeded();
    await page.waitForFunction(() => window.__mgaDemo?.state().ready);
    assert.equal((await page.evaluate(() => window.__mgaDemo.state())).paused, true);
    const frame = page.frames().find(f => f.url().includes('/app-demo/'));
    await page.waitForTimeout(400);
    assert.equal(await frame.evaluate(() => window.__mgaDemo.state().vt), 0);
    await page.getByRole('tab', { name: /飞书$/ }).click();
    await page.getByRole('button', { name: '播放演示', exact: true }).click();
    await page.waitForFunction(() => document.querySelectorAll('#fsReportBody > div').length === 4);
    await page.getByRole('button', { name: '暂停演示', exact: true }).click();
    const box = await page.locator('#demoOuter').boundingBox();
    assert.ok(box.x >= 0 && box.x + box.width <= 391, JSON.stringify(box));
  });
} finally { await browser.close(); }
console.log(`PLAYBACK: ${passed}/${passed + failed} passed`);
process.exitCode = failed ? 1 : 0;
