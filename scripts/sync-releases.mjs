#!/usr/bin/env node
/**
 * Fetch releases from the GitHub API and write a trimmed snapshot to
 * data/releases.json (the site uses it as fallback when api.github.com
 * is unreachable, e.g. mainland networks).
 *
 * Optional env: GITHUB_TOKEN (raises rate limit / needed for private repos).
 * Exits non-zero on HTTP error and never overwrites the file in that case.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'data', 'releases.json');
const API = 'https://api.github.com/repos/haaahhhis/MultiGameAssistant/releases?per_page=30';

const headers = {
  Accept: 'application/vnd.github+json',
  'User-Agent': 'web-multigameassistant-sync'
};
if (process.env.GITHUB_TOKEN) {
  headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
}

const res = await fetch(API, { headers });
if (!res.ok) {
  console.error(`GitHub API request failed: HTTP ${res.status}`);
  process.exit(1);
}

const releases = await res.json();
const trimmed = releases.map((r) => ({
  tag_name: r.tag_name,
  name: r.name,
  draft: r.draft,
  prerelease: r.prerelease,
  published_at: r.published_at,
  html_url: r.html_url,
  body: r.body,
  assets: (r.assets || []).map((a) => ({
    name: a.name,
    size: a.size,
    download_count: a.download_count,
    browser_download_url: a.browser_download_url
  }))
}));

const output = JSON.stringify(trimmed, null, 2) + '\n';

if (existsSync(OUT) && readFileSync(OUT, 'utf8') === output) {
  console.log('data/releases.json already up to date');
  process.exit(0);
}

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, output);
console.log(`data/releases.json updated: ${trimmed.length} release(s)`);
