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
      nodeFill: css('.flow-node rect').fill,
      edgeFill: css('.flow-edges').fill,
      edgeStroke: css('.flow-edges').stroke,
      wordmarkSize: parseFloat(css('.bridge-wordmark').fontSize),
      wordmark: document.querySelector('.bridge-wordmark').textContent,
      wordmarkFits: (() => {
        const mark = document.querySelector('.bridge-wordmark');
        const bridge = document.querySelector('.section-bridge');
        const style = getComputedStyle(bridge);
        return mark.scrollWidth <= bridge.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight) + 1;
      })(),
      architectureLayout: css('.download-options').display,
      architectureBorder: css('.download-options button').borderTopWidth,
      githubIconSize: css('.hero-ctas .btn-github svg').width,
      githubRail: document.querySelectorAll('.rail-gh').length,
      featureGrid: getComputedStyle(document.querySelector('.feat-panel-wrap'), '::before').backgroundImage,
      demoControls: css('.demo-top-controls').display,
      overflow: document.documentElement.scrollWidth > innerWidth
    };
  });
  const channels = styles.nodeFill.match(/\d+/g)?.map(Number);
  assert.ok(channels?.[0] >= 245 && channels[1] >= 245 && channels[2] >= 150, `nodes must stay light throughout the active-state transition: ${JSON.stringify(styles)}`);
  assert.equal(styles.edgeFill, 'none', 'connections must be lines, not solid black polygons');
  assert.notEqual(styles.edgeStroke, 'none');
  assert.ok(styles.wordmarkSize >= 27, 'transition must display the complete wordmark');
  assert.equal(styles.wordmark, '// MultiGameAssistant');
  assert.ok(styles.wordmarkFits, 'complete name must fit in the bridge at this viewport');
  assert.equal(styles.architectureLayout, 'flex');
  assert.equal(styles.architectureBorder, '1px');
  assert.equal(styles.githubIconSize, '18px');
  assert.equal(styles.githubRail, 0);
  assert.notEqual(styles.featureGrid, 'none');
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
    assert.equal(await page.locator('.flow-node rect').first().evaluate(el => getComputedStyle(el).fill), 'rgb(0, 0, 0)');
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
      await page.locator('.section-bridge').scrollIntoViewIfNeeded();
      await page.waitForFunction(() => {
        const bridge = document.querySelector('.section-bridge');
        const clip = getComputedStyle(bridge.querySelector('.bridge-wordmark')).clipPath;
        return bridge.classList.contains('in') && (clip === 'none' || clip === 'inset(0px)');
      });
      if (shots) await page.screenshot({ path: path.join(shots, `${name}-bridge.png`), animations: 'disabled' });
      const shift = () => page.locator('.bridge-wordmark').evaluate(el => new DOMMatrixReadOnly(getComputedStyle(el).transform).m41);
      const before = await shift();
      await page.evaluate(() => window.scrollBy(0, 180));
      if (reducedMotion !== 'reduce') {
        await page.waitForFunction(previous => new DOMMatrixReadOnly(getComputedStyle(document.querySelector('.bridge-wordmark')).transform).m41 < previous - 4, before);
      }
      const after = await shift();
      if (reducedMotion === 'reduce') assert.equal(after, before, 'reduced motion must not move the wordmark');
      else {
        assert.ok(after < before - 4, 'downward scroll must move the wordmark left');
        await page.evaluate(() => window.scrollBy(0, -180));
        await page.waitForFunction(previous => Math.abs(new DOMMatrixReadOnly(getComputedStyle(document.querySelector('.bridge-wordmark')).transform).m41 - previous) < 2, before);
      }
      await page.locator('.feat-panel-wrap').scrollIntoViewIfNeeded();
      await page.waitForFunction(() => document.querySelector('.feat-panel-wrap').classList.contains('is-visible'));
      await page.evaluate(() => window.MGAFeature.set(5));
      await page.waitForFunction(() => document.querySelector('#featPanelZh').textContent === '飞书');
      const motion = await page.locator('.feat-item').first().evaluate(el => getComputedStyle(el).animationName);
      assert.equal(motion, reducedMotion === 'reduce' ? 'none' : 'featureArrive');
      const heading = await page.locator('#featPanelZh').evaluate(el => getComputedStyle(el).animationName);
      assert.equal(heading, reducedMotion === 'reduce' ? 'none' : 'featureHeading');
      if (shots) {
        await page.locator('.feat-panel-wrap').evaluate(el => window.scrollTo(0, window.scrollY + el.getBoundingClientRect().top - 90));
        await page.screenshot({ path: path.join(shots, `${name}-feishu.png`), animations: 'disabled' });
      }
      console.log('PASS computed styles:', name);
      passed++;
    } finally { await page.close(); }
  }
  await warmCache();
} finally { await browser.close(); }
console.log(`STYLES: ${passed}/4 passed`);
