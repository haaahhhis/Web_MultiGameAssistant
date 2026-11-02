import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync, mkdirSync } from 'node:fs';
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(fileURLToPath(new URL('../', import.meta.url)));
const require = createRequire(process.env.PW_REQUIRE ?? path.join(root, 'package.json'));
const { chromium } = require('playwright-core');
const base = process.env.DEMO_SITE_BASE ?? 'http://127.0.0.1:8080/';
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH, headless: true, args: ['--no-sandbox'] });
const shots = process.env.DEMO_SHOTS;
if (shots) mkdirSync(shots, { recursive: true });
let passed = 0;

async function assertStyles(page) {
  const styles = await page.evaluate(() => {
    const css = selector => getComputedStyle(document.querySelector(selector));
    return {
      spine: (() => { const s = document.getElementById('titleSpine'); return s ? s.querySelectorAll('.spine-dot').length : -1; })(),
      chapterCount: document.querySelectorAll('.chapter-head').length,
      chapterIndexes: Array.from(document.querySelectorAll('.chapter-idx'), el => el.textContent.trim()),
      chapterBarBackground: css('.chapter-bar').backgroundColor,
      chapterBarWidth: parseFloat(css('.chapter-bar').width),
      bodyBackground: css('body').backgroundColor,
      legacyPipeline: document.querySelectorAll('#pipeline, .flow-board, .rail-item[data-section=pipeline]').length,
      railCount: document.querySelectorAll('.rail-item').length,
      oldChapters: document.querySelectorAll('#start, #support, #how').length,
      oldBlocks: document.querySelectorAll('.section-bridge, .spec-table').length,
      architectureLayout: css('.download-options').display,
      architectureBorder: css('.download-options button').borderTopWidth,
      githubIconSize: css('.hero-ctas .btn-github svg').width,
      githubRail: document.querySelectorAll('.rail-gh').length,
      releasesLink: document.querySelector('.rail-item[href="releases.html"]') !== null,
      heroPipeline: document.querySelectorAll('#heroPipeline .pl-node').length,
      dayStops: Array.from(document.querySelectorAll('.day-stop'), el => el.dataset.scene).join(','),
      stagePosition: css('.day-stage').position,
      demoControls: css('.demo-top-controls').display,
      overflow: document.documentElement.scrollWidth > innerWidth
    };
  });
  assert.equal(styles.spine, 4, 'title spine must connect the four chapter titles');
  assert.equal(styles.chapterCount, 4);
  assert.deepEqual(styles.chapterIndexes, ['01 / 04', '02 / 04', '03 / 04', '04 / 04']);
  assert.equal(styles.chapterBarBackground, 'rgb(255, 250, 0)');
  assert.ok(styles.chapterBarWidth >= 10);
  assert.equal(styles.bodyBackground, 'rgb(242, 242, 242)');
  assert.equal(styles.legacyPipeline, 0);
  assert.equal(styles.railCount, 5, 'four sections plus the releases page');
  assert.equal(styles.oldChapters, 0, 'get-started, support and how-it-works chapters are gone');
  assert.ok(styles.releasesLink, 'rail must link to the releases page');
  assert.equal(styles.oldBlocks, 0, 'bridge banner and footer spec table are gone');
  assert.equal(styles.architectureLayout, 'flex');
  assert.equal(styles.architectureBorder, '1px');
  assert.equal(styles.githubIconSize, '18px');
  assert.equal(styles.githubRail, 0);
  assert.equal(styles.heroPipeline, 7, 'hero pipeline canvas draws all seven nodes');
  assert.equal(styles.dayStops, '0,1,2,5,4,3', 'timeline stops follow the day, mapped to demo scenes');
  assert.equal(styles.stagePosition, 'sticky');
  assert.equal(styles.demoControls, 'flex');
  assert.equal(styles.overflow, false);
}

async function warmCache() {
  const html = readFileSync(path.join(root, 'index.html'), 'utf8');
  const legacy = html.replace(/(assets\/[^"?]+\.(?:css|js))\?v=[a-f0-9]+/g, '$1');
  const prefix = '/Web_MultiGameAssistant-/';
  let published = false, unversionedRequests = 0, versionedRequests = 0;
  const server = createServer((request, response) => {
    const url = new URL(request.url, 'http://localhost');
    if (!url.pathname.startsWith(prefix)) { response.writeHead(404).end(); return; }
    const relative = decodeURIComponent(url.pathname.slice(prefix.length)) || 'index.html';
    const file = path.resolve(root, relative);
    if (!file.startsWith(root + path.sep)) { response.writeHead(404).end(); return; }
    try {
      const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml' };
      const headers = { 'Content-Type': types[path.extname(file)] ?? 'application/octet-stream', 'Cache-Control': relative === 'index.html' ? 'no-store' : 'public, max-age=3600' };
      let body = relative === 'index.html' ? (published ? html : legacy) : readFileSync(file);
      if (relative === 'assets/css/style.css') {
        if (url.searchParams.has('v')) versionedRequests++;
        else {
          unversionedRequests++;
          if (!published) body = 'body { margin: 0; }';
        }
      }
      response.writeHead(200, headers).end(body);
    } catch { response.writeHead(404).end(); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  // Playwright routing disables HTTP caching; stub only the API at the fetch boundary.
  await page.addInitScript(() => {
    const fetch = window.fetch;
    window.fetch = (url, options) => String(url).startsWith('https://api.github.com/')
      ? Promise.resolve(new Response('[]', { headers: { 'Content-Type': 'application/json' } }))
      : fetch.call(window, url, options);
  });
  try {
    const url = `http://127.0.0.1:${server.address().port}${prefix}`;
    await page.goto(url);
    assert.equal(await page.locator('.chapter-title').first().evaluate(el => getComputedStyle(el).backgroundColor), 'rgba(0, 0, 0, 0)');
    await page.goto(url);
    assert.equal(unversionedRequests, 1, 'legacy CSS must actually be cached');
    published = true;
    await page.goto(url);
    await assertStyles(page);
    assert.equal(unversionedRequests, 1, 'upgrade must not reuse or re-fetch the legacy CSS URL');
    assert.equal(versionedRequests, 1, 'new HTML must load the content-versioned stylesheet');
    console.log('PASS warm HTTP cache upgrades without a hard refresh');
    passed++;
  } finally {
    await page.close();
    await new Promise(resolve => server.close(resolve));
  }
}

try {
  for (const [name, width, reducedMotion] of [['desktop', 1440, 'no-preference'], ['mobile', 390, 'no-preference'], ['reduced-motion', 1440, 'reduce']]) {
    const page = await browser.newPage({ viewport: { width, height: 1000 }, reducedMotion });
    await page.route('https://api.github.com/**', route => route.fulfill({ json: [] }));
    try {
      await page.goto(base);
      await assertStyles(page);
      await page.waitForSelector('.loader', { state: 'hidden' });
      if (shots) {
        await page.screenshot({ path: path.join(shots, `${name}-hero.png`), animations: 'disabled' });
      }
      await page.locator('#dayStage').scrollIntoViewIfNeeded();
      await page.waitForFunction(() => window.__mgaDemo && window.__mgaDemo.state().ready, null, { polling: 100 });
      // scrolling a timeline stop up to the reading line selects its scene in the sticky demo
      for (let pass = 0; pass < 2; pass++) {
        await page.evaluate(() => {
          const stop = document.querySelector('.day-stop[data-scene="2"]');
          const stageBottom = document.getElementById('dayStage').getBoundingClientRect().bottom;
          const line = matchMedia('(max-width: 1099px)').matches ? stageBottom + (innerHeight - stageBottom) * .35 : innerHeight * .45;
          window.scrollBy(0, stop.getBoundingClientRect().top - line + 10);
        });
        await page.waitForTimeout(150);
      }
      await page.waitForFunction(() => document.querySelector('.day-stop.is-current').dataset.scene === '2' && window.__mgaDemo.state().idx === 2, null, { polling: 100 });
      // a scenario tab brings its stop into view
      await page.locator('.scen-tab', { hasText: '飞书' }).click();
      await page.waitForFunction(() => document.querySelector('.day-stop.is-current').dataset.scene === '5' && document.getElementById('demoLabel').textContent === 'DEMO // FEISHU', null, { polling: 100 });
      // the current stop gets a yellow marker and an ink time once its .3s transition settles
      await page.waitForFunction(() => {
        const el = document.querySelector('.day-stop.is-current');
        return getComputedStyle(el, '::before').backgroundColor === 'rgb(255, 250, 0)' && getComputedStyle(el.querySelector('.day-time span')).color === 'rgb(25, 25, 25)';
      }, null, { polling: 100, timeout: 3000 });
      // where the title spine shows, the stop markers sit on it
      if (width > 768) {
        const offset = await page.evaluate(() => {
          const spine = document.getElementById('titleSpine').getBoundingClientRect();
          const stop = document.querySelector('.day-stop.is-current');
          const marker = getComputedStyle(stop, '::before');
          return Math.abs(stop.getBoundingClientRect().left + parseFloat(marker.left) + parseFloat(marker.width) / 2 - (spine.left + 1));
        });
        assert.ok(offset < 1.5, `timeline markers must sit on the title spine (off by ${offset}px)`);
      }
      if (shots) await page.screenshot({ path: path.join(shots, `${name}-feishu.png`), animations: 'disabled' });
      console.log('PASS computed styles:', name);
      passed++;
    } finally { await page.close(); }
  }
  await warmCache();
} finally { await browser.close(); }
console.log(`STYLES: ${passed}/4 passed`);
