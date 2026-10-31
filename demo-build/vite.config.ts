import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const MGA = process.env.MGA_REPO ?? path.resolve(here, '..', '..', 'MultiGameAssistant');
const req = createRequire(path.join(MGA, 'apps/web/package.json'));

const alias = [
  { find: '@mga-web', replacement: path.join(MGA, 'apps/web/src') },
  { find: /^@adg\/client-core$/, replacement: path.join(MGA, 'packages/client-core/src/index.ts') },
  { find: /^@adg\/protocol$/, replacement: path.join(MGA, 'packages/protocol/src/index.ts') },
  { find: /^@adg\/(.*)$/, replacement: path.join(MGA, 'packages/$1/src/index.ts') },
  { find: /^react\/jsx-runtime$/, replacement: path.dirname(req.resolve('react/jsx-runtime')) + '/jsx-runtime.js' },
  { find: /^react\/jsx-dev-runtime$/, replacement: path.dirname(req.resolve('react/jsx-runtime')) + '/jsx-dev-runtime.js' },
  { find: /^react-dom\/client$/, replacement: path.dirname(req.resolve('react-dom/client')) + '/client.js' },
  { find: /^react-dom$/, replacement: req.resolve('react-dom') },
  { find: /^react$/, replacement: req.resolve('react') },
];

export default async function () {
  const reactMod: any = await import(pathToFileURL(req.resolve('@vitejs/plugin-react')).href);
  const react = reactMod.default ?? reactMod;
  return {
    root: here,
    base: './',
    plugins: [react()],
    resolve: { alias, dedupe: ['react', 'react-dom'] },
    build: {
      outDir: path.resolve(here, '..', 'app-demo'),
      emptyOutDir: true,
      target: 'es2020',
      chunkSizeWarningLimit: 4000,
    },
  };
}
export { MGA };
