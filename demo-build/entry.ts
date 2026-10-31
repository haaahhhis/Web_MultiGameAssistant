/* Demo entry: install the fake gateway socket, force light theme + token,
   then boot the REAL apps/web frontend. */
import { FakeGatewaySocket } from './gateway/fake';
import { startDirector } from './scenarios/director';

(globalThis as any).WebSocket = FakeGatewaySocket;
try { sessionStorage.setItem('adg.token', 'demo-token'); } catch { }
document.documentElement.dataset.theme = 'light';
try { localStorage.setItem('adg.theme', 'light'); } catch { }

/* prevent in-app focus calls scrolling the parent page */
const _focus = HTMLElement.prototype.focus;
HTMLElement.prototype.focus = function (opts?: FocusOptions) { _focus.call(this, Object.assign({}, opts, { preventScroll: true })); };

if (!location.hash) history.replaceState(null, '', location.pathname + location.search + '#/p/scripts');

// resolved via vite alias @mga-web -> <MGA_REPO>/apps/web/src
(async () => {
  // @ts-ignore
  await import('@mga-web/main.tsx');
  await startDirector();
})();
