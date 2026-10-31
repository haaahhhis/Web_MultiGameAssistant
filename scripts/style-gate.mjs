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
      architectureLayout: css('.download-options').display,
      architectureBorder: css('.download-options button').borderTopWidth,
      githubIconSize: css('.rail-gh svg').width,
      demoControls: css('.demo-top-controls').display,
      overflow: document.documentElement.scrollWidth > innerWidth
    };
  });
  const channels = styles.nodeFill.match(/\d+/g)?.map(Number);
  assert.ok(channels?.[0] >= 245 && channels[1] >= 245 && channels[2] >= 150, `nodes must stay light throughout the active-state transition: ${JSON.stringify(styles)}`);
  assert.equal(styles.edgeFill, 'none', 'connections must be lines, not solid black polygons');
  assert.notEqual(styles.edgeStroke, 'none');
  assert.ok(styles.wordmarkSize >= 54, 'transition must display the oversized wordmark');
  assert.equal(styles.architectureLayout, 'flex');
  assert.equal(styles.architectureBorder, '1px');
  assert.equal(styles.githubIconSize, '22px');
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
      console.log('PASS computed styles:', name);
      passed++;
    } finally { await page.close(); }
  }
  await warmCache();
} finally { await browser.close(); }
console.log(`STYLES: ${passed}/4 passed`);
