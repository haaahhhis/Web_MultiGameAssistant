import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export function versionAssets(html, readAsset) {
  return html.replace(/\b(href|src)="(assets\/[^"?#]+\.(?:css|js))(?:\?[^"#]*)?"/g, (_, attribute, file) => {
    const version = createHash('sha256').update(readAsset(file)).digest('hex').slice(0, 12);
    return `${attribute}="${file}?v=${version}"`;
  });
}

export function syncAssets(root = fileURLToPath(new URL('../', import.meta.url)), check = false) {
  const pages = readdirSync(root).filter(name => name.endsWith('.html'));
  for (const page of pages) {
    const file = path.join(root, page);
    const html = readFileSync(file, 'utf8');
    const versioned = versionAssets(html, asset => readFileSync(path.join(root, asset)));
    if (check && html !== versioned) throw new Error(`Static asset versions are stale in ${page}. Run: node scripts/version-assets.mjs`);
    if (!check && html !== versioned) writeFileSync(file, versioned);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  syncAssets(undefined, process.argv.includes('--check'));
  console.log('[site-assets] content versions are up to date');
}
