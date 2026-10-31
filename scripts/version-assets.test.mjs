import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { versionAssets, syncAssets } from './version-assets.mjs';

const html = '<link href="assets/css/style.css"><script src="assets/js/main.js"></script>';
const files = { 'assets/css/style.css': 'body { color: black; }', 'assets/js/main.js': 'console.log(1);' };
const version = body => createHash('sha256').update(body).digest('hex').slice(0, 12);

test('CSS and JS URLs are bound to their content without changing relative paths', () => {
  const output = versionAssets(html, file => files[file]);
  for (const [file, body] of Object.entries(files)) assert.ok(output.includes(`${file}?v=${version(body)}`));
  assert.equal(new URL(`assets/css/style.css?v=${version(files['assets/css/style.css'])}`, 'https://example.com/project/').pathname, '/project/assets/css/style.css');
});

test('versioning is idempotent and replaces old versions instead of appending queries', () => {
  const output = versionAssets(html, file => files[file]);
  assert.equal(versionAssets(output, file => files[file]), output);
  assert.equal(versionAssets(html.replace('style.css', 'style.css?v=old'), file => files[file]), output);
});

test('a CSS-only change invalidates the stylesheet URL, not unchanged JS', () => {
  const before = versionAssets(html, file => files[file]);
  const after = versionAssets(before, file => files[file] + (file.endsWith('.css') ? '\n.flow-node { fill: white; }' : ''));
  assert.notEqual(before, after);
  assert.ok(after.includes(`assets/js/main.js?v=${version(files['assets/js/main.js'])}`));
  assert.ok(!after.includes(`style.css?v=${version(files['assets/css/style.css'])}`));
});

test('external resources, images and hashed app bundles are untouched', () => {
  const other = '<link href="https://example.com/style.css"><img src="assets/picture.png"><script src="app-demo/assets/index-hash.js"></script>';
  assert.equal(versionAssets(other, () => { throw new Error('Unexpected asset'); }), other);
});

test('committed resource versions match every published CSS and JS file', () => {
  assert.doesNotThrow(() => syncAssets(undefined, true));
});
