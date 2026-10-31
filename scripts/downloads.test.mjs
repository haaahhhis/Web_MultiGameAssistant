import test from 'node:test';
import assert from 'node:assert/strict';
import '../assets/js/downloads.js';

const { assetArchitecture, latest, chooseAsset, detect } = globalThis.MGADownloads;
const x64 = { name: 'MultiGameAssistant-Setup-2.0.exe', browser_download_url: 'https://github.com/test/x64.exe' };
const arm64 = { name: 'MultiGameAssistant-Setup-2.0-arm64.exe', browser_download_url: 'https://github.com/test/arm64.exe' };

test('only Windows installers are matched as an architecture', () => {
  assert.equal(assetArchitecture(x64.name), 'x64');
  assert.equal(assetArchitecture(arm64.name), 'arm64');
  assert.equal(assetArchitecture('app-x86_64.exe'), 'x64');
  assert.equal(assetArchitecture('app-x86-64.exe'), 'x64');
  for (const name of ['latest.yml', 'setup.exe.blockmap', 'app-arm64.dmg', 'app-ia32.exe', 'app-arm32.exe', 'app-x86.exe', 'app-i386.exe']) assert.equal(assetArchitecture(name), null);
});
test('newest published stable release wins over drafts and prereleases', () => {
  const old = { tag_name: 'v1', published_at: '2026-01-01' };
  const current = { tag_name: 'v2', published_at: '2026-02-01' };
  const preview = { tag_name: 'v3-beta', published_at: '2026-03-01', prerelease: true };
  assert.equal(latest([old, preview, current, { tag_name: 'v4', draft: true }]), current);
  assert.equal(latest([preview]), preview);
  assert.equal(latest([]), undefined);
});
test('matching assets, x64 fallback and missing installers', () => {
  assert.equal(chooseAsset({ assets: [x64, arm64] }, 'arm64'), arm64);
  assert.equal(chooseAsset({ assets: [x64] }, 'arm64'), x64);
  assert.equal(chooseAsset({ assets: [arm64] }, 'x64'), null);
  assert.equal(chooseAsset({}, 'x64'), null);
  assert.equal(chooseAsset({ assets: [{ ...x64, browser_download_url: 'javascript:alert(1)' }] }, 'x64'), null);
});
test('Client Hints detects Windows ARM64 and x64', async () => {
  for (const [architecture, expected] of [['arm', 'arm64'], ['x86', 'x64']]) {
    assert.deepEqual(await detect({ userAgentData: { platform: 'Windows', getHighEntropyValues: async () => ({ architecture, bitness: '64' }) } }), { arch: expected, detected: true });
  }
});
test('unknown, non-Windows and refused hints default to Windows x64', async () => {
  assert.deepEqual(await detect({ userAgent: 'Macintosh; ARM64' }), { arch: 'x64', detected: false });
  assert.deepEqual(await detect({ userAgent: 'Windows', userAgentData: { platform: 'Windows', getHighEntropyValues: async () => { throw Error('denied'); } } }), { arch: 'x64', detected: false });
  assert.deepEqual(await detect({}), { arch: 'x64', detected: false });
});
test('legacy Windows ARM64 user agents are recognized', async () => {
  assert.deepEqual(await detect({ userAgent: 'Mozilla/5.0 (Windows NT 10.0; ARM64)' }), { arch: 'arm64', detected: true });
});
