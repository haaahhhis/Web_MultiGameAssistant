import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(process.env.PW_REQUIRE ?? new URL('../package.json', import.meta.url));
const { chromium } = require('playwright-core');
const base = process.env.DEMO_SITE_BASE ?? 'http://127.0.0.1:8080/';
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH, headless: true, args: ['--no-sandbox'] });
const asset = (version, arch) => ({ name: `MultiGameAssistant-Setup-${version}${arch === 'arm64' ? '-arm64' : ''}.exe`, size: 1024, browser_download_url: `https://github.com/haaahhhis/MultiGameAssistant/releases/download/v${version}/setup-${arch}.exe` });
const release = (version = '2.0.0', arches = ['x64', 'arm64']) => ({ tag_name: 'v' + version, published_at: '2026-10-31T10:00:00Z', body: 'Release notes', assets: arches.map(a => asset(version, a)) });
let passed = 0;
async function check(name, options, run) {
  const context = await browser.newContext({ viewport: options.mobile ? { width: 390, height: 844 } : { width: 1280, height: 900 } });
  await context.addInitScript(({ arch, platform }) => {
    Object.defineProperty(navigator, 'platform', { value: platform });
    Object.defineProperty(navigator, 'userAgentData', { value: { platform, getHighEntropyValues: async () => ({ architecture: arch, bitness: '64' }) } });
  }, { arch: options.arch ?? 'x86', platform: options.platform ?? 'Windows' });
  const page = await context.newPage(), errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.route('https://api.github.com/**', r => options.offline ? r.fulfill({ status: 503, json: {} }) : r.fulfill({ json: options.releases ?? [release()] }));
  if (options.offline) await page.route('**/data/releases.json', r => r.fulfill({ json: [release()] }));
  try {
    await page.goto(base);
    await page.waitForFunction(() => document.querySelector('#heroDownload').textContent.includes('v2.0.0'));
    await run(page);
    assert.deepEqual(errors, []);
    passed++; console.log('PASS', name);
  } finally { await context.close(); }
}
const href = page => page.locator('#heroDownload').getAttribute('href');
try {
  await check('Windows x64 automatic', {}, async p => assert.match(await href(p), /setup-x64\.exe$/));
  await check('Windows ARM64 automatic', { arch: 'arm' }, async p => assert.match(await href(p), /setup-arm64\.exe$/));
  await check('unrecognized architecture defaults x64', { arch: '' }, async p => assert.match(await href(p), /setup-x64\.exe$/));
  await check('non-Windows defaults Windows x64', { platform: 'macOS', arch: 'arm' }, async p => assert.match(await href(p), /setup-x64\.exe$/));
  await check('missing ARM64 falls back x64', { arch: 'arm', releases: [release('2.0.0', ['x64'])] }, async p => {
    assert.match(await href(p), /setup-x64\.exe$/);
    assert.match(await p.locator('#downloadHint').innerText(), /回退/);
  });
  await check('missing installer never selects an old release', { releases: [release('1.0.0'), release('2.0.0', [])].map(r => r.tag_name === 'v1.0.0' ? { ...r, published_at: '2026-01-01' } : r) }, async p => assert.equal(await href(p), 'https://github.com/haaahhhis/MultiGameAssistant/releases'));
  await check('manual override and restore automatic', {}, async p => {
    await p.locator('[data-download-arch=arm64]').click();
    assert.match(await href(p), /setup-arm64\.exe$/);
    await p.locator('[data-download-arch=auto]').click();
    assert.match(await href(p), /setup-x64\.exe$/);
    assert.equal(await p.locator('#mobileMenuDownload').getAttribute('href'), await href(p));
  });
  await check('new stable release supersedes old and preview', { releases: [{ ...release('3.0.0-beta'), prerelease: true }, { ...release('1.0.0'), published_at: '2026-01-01' }, release()] }, async p => {
    assert.match(await href(p), /v2\.0\.0/);
    assert.equal(await p.locator('#releasesFeatured .rel-tag').innerText(), 'v2.0.0');
  });
  await check('API unavailable uses static snapshot', { offline: true }, async p => assert.match(await p.locator('#releasesStats').innerText(), /本站快照/));
  await check('removed sidebar buttons and mobile layout', { mobile: true }, async p => {
    assert.equal(await p.locator('.rail-logo, .rail-dl, #railDownload').count(), 0);
    assert.ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await p.locator('#burger').click();
    assert.equal(await p.locator('#burger').getAttribute('aria-expanded'), 'true');
    await p.keyboard.press('Escape');
    assert.equal(await p.locator('#burger').getAttribute('aria-expanded'), 'false');
  });
} finally { await browser.close(); }
console.log(`SITE: ${passed}/10 passed`);
