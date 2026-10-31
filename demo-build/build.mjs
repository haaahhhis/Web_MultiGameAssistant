#!/usr/bin/env node
/* Build the demo bundle with the main repo's own vite + react plugin. */
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const MGA = process.env.MGA_REPO ?? path.resolve(here, '..', '..', 'MultiGameAssistant');
process.env.MGA_REPO = MGA;

const req = createRequire(path.join(MGA, 'apps/web/package.json'));
const vitePath = req.resolve('vite');
const { build } = await import(pathToFileURL(vitePath).href);
await build({ configFile: path.join(here, 'vite.config.ts'), root: here, logLevel: 'info' });
console.log('[demo-build] done -> app-demo/');
