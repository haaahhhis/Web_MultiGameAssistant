/* MultiGameAssistant 官网 — vanilla JS */
(function () {
  'use strict';

  var REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var TOUCH = window.matchMedia('(hover: none), (pointer: coarse)').matches;

  if (REDUCED) document.documentElement.classList.add('no-motion');

  /* ============================================================
     Loader
     ============================================================ */
  var loader = document.getElementById('loader');
  var loaderBar = document.getElementById('loaderBar');
  var loaderPct = document.getElementById('loaderPct');
  var loaderStatus = document.getElementById('loaderStatus');

  /* the loader plays once per session; later visits (or the releases page,
     which has no loader) start with the content */
  var seenLoader = false;
  try { seenLoader = sessionStorage.getItem('mga_loader_seen') === '1'; sessionStorage.setItem('mga_loader_seen', '1'); } catch (e) { /* ignore */ }

  function finishLoad() {
    document.body.classList.add('anim-ready');
    if (!loader) return;
    if (REDUCED || seenLoader) {
      loader.remove();
      return;
    }
    loader.classList.add('is-done');
    setTimeout(function () { loader.remove(); }, 700);
  }

  if (REDUCED || seenLoader || !loader) {
    finishLoad();
  } else {
    var start = performance.now();
    var DURATION = 950;
    (function tick(now) {
      var t = Math.min(1, (now - start) / DURATION);
      var eased = 1 - Math.pow(1 - t, 2.2);
      var pct = Math.round(eased * 100);
      loaderBar.style.transform = 'scaleX(' + eased + ')';
      loaderPct.textContent = pct + '%';
      if (t >= 1) {
        loaderStatus.textContent = 'Done.';
        setTimeout(finishLoad, 220);
      } else {
        requestAnimationFrame(tick);
      }
    })(start);
  }

  /* ============================================================
     Text scramble
     ============================================================ */
  var SCRAMBLE_CHARS = '!<>-_/[]{}=+*^?#01AFX';

  function scramble(el, finalText, duration, onDone) {
    if (REDUCED || !el) {
      if (el) el.textContent = finalText;
      if (onDone) onDone();
      return;
    }
    var start = performance.now();
    duration = duration || 600;
    function frame(now) {
      var p = Math.min(1, (now - start) / duration);
      var reveal = Math.floor(finalText.length * p);
      var out = '';
      for (var i = 0; i < finalText.length; i++) {
        if (i < reveal || finalText[i] === ' ') {
          out += finalText[i];
        } else {
          out += SCRAMBLE_CHARS[(Math.random() * SCRAMBLE_CHARS.length) | 0];
        }
      }
      el.textContent = out;
      if (p < 1) {
        requestAnimationFrame(frame);
      } else {
        el.textContent = finalText;
        if (onDone) onDone();
      }
    }
    requestAnimationFrame(frame);
  }

  /* scramble on hover — reads the label's CURRENT text (download labels change
     after load), optionally locks the host width so neighbours don't shift,
     and ignores re-entry while busy */
  function scrambleOnHover(host, label, lockWidth) {
    host.addEventListener('mouseenter', function () {
      if (label.dataset.busy === '1') return;
      label.dataset.busy = '1';
      var current = label.textContent;
      if (lockWidth) host.style.width = host.getBoundingClientRect().width + 'px';
      scramble(label, current, 380, function () {
        if (lockWidth) host.style.width = '';
        delete label.dataset.busy;
      });
    });
  }
  // buttons, the mobile menu, and text links whose label is the last thing on its line
  document.querySelectorAll('.btn').forEach(function (el) {
    var label = el.querySelector('.btn-label');
    if (label) scrambleOnHover(el, label, true);
  });
  document.querySelectorAll('.mobile-menu-list a').forEach(function (a) {
    var zh = a.querySelector('.mm-zh');
    if (zh) scrambleOnHover(a, zh, false);
  });
  document.querySelectorAll('.hero-release-go, .hero-log-more, .footer-links a').forEach(function (el) {
    scrambleOnHover(el.closest('a') || el, el, false);
  });

  /* mono English labels scramble in once as they scroll into view */
  if (!REDUCED && 'IntersectionObserver' in window) {
    var labelIo = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        labelIo.unobserve(e.target);
        scramble(e.target, e.target.textContent, 700);
      });
    }, { threshold: 0.6 });
    document.querySelectorAll('.chapter-sub, .hl-en, .how-k, .flow-nodes span').forEach(function (el) {
      if (!el.children.length) labelIo.observe(el);
    });
  }

  /* ============================================================
     Mobile menu
     ============================================================ */
  var burger = document.getElementById('burger');
  var mobileMenu = document.getElementById('mobileMenu');

  function setMenu(open) {
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? '关闭菜单' : '打开菜单');
    mobileMenu.classList.toggle('open', open);
    mobileMenu.setAttribute('aria-hidden', String(!open));
    document.body.style.overflow = open ? 'hidden' : '';
  }
  burger.addEventListener('click', function () {
    setMenu(!mobileMenu.classList.contains('open'));
  });
  mobileMenu.querySelectorAll('a').forEach(function (a) {
    a.addEventListener('click', function () { setMenu(false); });
  });
  window.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && mobileMenu.classList.contains('open')) setMenu(false);
  });
  window.matchMedia('(min-width: 769px)').addEventListener('change', function (e) {
    if (e.matches) setMenu(false);
  });

  /* ============================================================
     Scroll reveals + rail active state
     ============================================================ */
  var revealEls = document.querySelectorAll('.reveal-block');

  if (REDUCED || !('IntersectionObserver' in window)) {
    revealEls.forEach(function (el) { el.classList.add('in'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          en.target.classList.add('in');
          io.unobserve(en.target);
        }
      });
    }, { threshold: 0.12 });
    revealEls.forEach(function (el) { io.observe(el); });
  }

  var bridge = document.querySelector('.section-bridge');
  if (bridge && !REDUCED) {
    var bridgeTick = false;
    function updateBridge() {
      var rect = bridge.getBoundingClientRect();
      var start = window.innerHeight * .82;
      var end = window.innerHeight * .18 - rect.height;
      var progress = Math.max(0, Math.min(1, (start - rect.top) / (start - end)));
      bridge.style.setProperty('--bridge-x', ((1 - progress) * Math.min(180, window.innerWidth * .16)).toFixed(1) + 'px');
    }
    function scheduleBridge() {
      if (bridgeTick) return;
      bridgeTick = true;
      requestAnimationFrame(function () { updateBridge(); bridgeTick = false; });
    }
    window.addEventListener('scroll', scheduleBridge, { passive: true });
    window.addEventListener('resize', scheduleBridge);
    /* the reveal slides the bridge up; measure again once it has settled */
    bridge.addEventListener('transitionend', function (e) { if (e.target === bridge) scheduleBridge(); });
    updateBridge();
  }

  /* rail active section tracking */
  var railItems = Array.prototype.slice.call(document.querySelectorAll('.rail-item'));
  var sections = railItems
    .map(function (a) { return document.getElementById(a.dataset.section); })
    .filter(Boolean);

  function updateRail() {
    if (!sections.length) return;
    var y = window.scrollY + window.innerHeight * 0.4;
    var current = sections[0];
    sections.forEach(function (s) { if (s.offsetTop <= y) current = s; });
    railItems.forEach(function (a) {
      if (!a.dataset.section) return;
      var active = current && a.dataset.section === current.id;
      a.classList.toggle('is-active', active);
      if (active) a.setAttribute('aria-current', 'true');
      else a.removeAttribute('aria-current');
    });
    document.querySelectorAll('.mobile-menu-list a').forEach(function (a) {
      if (a.getAttribute('href').charAt(0) !== '#') return;
      var active = current && a.getAttribute('href') === '#' + current.id;
      a.classList.toggle('is-active', active);
      if (active) a.setAttribute('aria-current', 'true');
      else a.removeAttribute('aria-current');
    });
  }
  var railTick = false;
  window.addEventListener('scroll', function () {
    if (railTick) return;
    railTick = true;
    requestAnimationFrame(function () { updateRail(); railTick = false; });
  }, { passive: true });
  updateRail();

  /* ============================================================
     A day with MGA — timeline stops drive the sticky demo
     ============================================================ */
  var stops = Array.prototype.slice.call(document.querySelectorAll('.day-stop'));
  var dayStage = document.getElementById('dayStage');
  if (stops.length) {
    var currentStop = -1, lockUntil = 0;
    var stopFor = function (scene) {
      for (var i = 0; i < stops.length; i++) if (Number(stops[i].dataset.scene) === scene) return i;
      return -1;
    };
    var markStop = function (i) {
      if (i === currentStop || !stops[i]) return;
      currentStop = i;
      stops.forEach(function (s, j) {
        s.classList.toggle('is-current', j === i);
        s.classList.toggle('is-past', j < i);
      });
      var clock = document.getElementById('dayClock');
      if (clock) scramble(clock, stops[i].dataset.time, 320);
    };
    /* the stop whose top passed the probe line is current; on narrow screens the
       probe sits below the sticky demo so the stop being read is the one shown */
    var probe = function () {
      var stageBottom = dayStage ? dayStage.getBoundingClientRect().bottom : 0;
      var stacked = window.matchMedia('(max-width: 1099px)').matches;
      return stacked ? stageBottom + (window.innerHeight - stageBottom) * .35 : window.innerHeight * .45;
    };
    var pickStop = function () {
      if (Date.now() < lockUntil) return;
      var line = probe(), pick = 0;
      stops.forEach(function (s, i) { if (s.getBoundingClientRect().top <= line) pick = i; });
      if (pick === currentStop) return;
      markStop(pick);
      if (window.__mgaDemo) window.__mgaDemo.select(Number(stops[pick].dataset.scene));
    };
    window.MGAFeature = {
      /* scenes replay while the page scroll drives them; in fullscreen there is
         no scrolling, so they advance on their own */
      get scrollDriven() { return !dayStage || document.fullscreenElement !== dayStage; },
      /* called by demo.js whenever a scene is selected */
      set: function (scene) { var i = stopFor(scene); if (i >= 0) markStop(i); },
      /* called when a scenario tab is clicked: bring its stop into view */
      reveal: function (scene) {
        var i = stopFor(scene);
        if (i < 0) return;
        lockUntil = Date.now() + 1000;
        var top = stops[i].getBoundingClientRect().top + window.scrollY - probe() + 8;
        window.scrollTo({ top: top, behavior: REDUCED ? 'auto' : 'smooth' });
      }
    };
    var stopTick = false;
    window.addEventListener('scroll', function () {
      if (stopTick) return;
      stopTick = true;
      requestAnimationFrame(function () { pickStop(); stopTick = false; });
    }, { passive: true });
    markStop(0);
  }

  /* ============================================================
     Tabs (install methods)
     ============================================================ */
  document.querySelectorAll('[data-tabs]').forEach(function (group) {
    var tabs = Array.prototype.slice.call(group.querySelectorAll('[role=tab]'));
    function show(i, focus) {
      tabs.forEach(function (t, j) {
        var on = i === j;
        t.setAttribute('aria-selected', String(on));
        t.tabIndex = on ? 0 : -1;
        document.getElementById(t.getAttribute('aria-controls')).hidden = !on;
      });
      if (focus) tabs[i].focus();
    }
    tabs.forEach(function (t, i) {
      t.addEventListener('click', function () { show(i); });
      t.addEventListener('keydown', function (e) {
        var n = e.key === 'ArrowRight' ? (i + 1) % tabs.length : e.key === 'ArrowLeft' ? (i - 1 + tabs.length) % tabs.length : -1;
        if (n >= 0) { e.preventDefault(); show(n, true); }
      });
    });
  });

  /* ============================================================
     Copy buttons
     ============================================================ */
  function selectText(node) {
    var range = document.createRange();
    range.selectNodeContents(node);
    var sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  }
  document.querySelectorAll('[data-copy]').forEach(function (button) {
    button.addEventListener('click', function () {
      var target = document.getElementById(button.dataset.copy);
      if (!target) return;
      var done = function () {
        button.textContent = '已复制';
        setTimeout(function () { button.textContent = '复制'; }, 1600);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(target.textContent.trim()).then(done, function () { selectText(target); });
      } else selectText(target);
    });
  });

  /* ============================================================
     Demo fullscreen — the stage (demo + scenario tabs) fills the screen
     so the real UI shows near its actual size
     ============================================================ */
  var demoExpand = document.getElementById('demoExpand');
  if (demoExpand && dayStage && document.fullscreenEnabled && dayStage.requestFullscreen) {
    demoExpand.hidden = false;
    demoExpand.addEventListener('click', function () {
      if (document.fullscreenElement === dayStage) document.exitFullscreen();
      else dayStage.requestFullscreen().catch(function () { /* denied: stay inline */ });
    });
    document.addEventListener('fullscreenchange', function () {
      var on = document.fullscreenElement === dayStage;
      demoExpand.textContent = on ? '退出全屏 ✕' : '全屏查看 ⤢';
      /* demo.js refits the frame on resize */
      window.dispatchEvent(new Event('resize'));
    });
  }

  /* ============================================================
     Lightbox — screenshots open at full size over the page;
     without JS the link simply opens the image
     ============================================================ */
  var lightboxLinks = document.querySelectorAll('a[data-lightbox]');
  if (lightboxLinks.length) {
    var box = document.createElement('div');
    box.className = 'lightbox';
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-modal', 'true');
    box.setAttribute('aria-label', '截图大图');
    box.hidden = true;
    var boxImg = document.createElement('img');
    var boxClose = document.createElement('button');
    boxClose.type = 'button';
    boxClose.className = 'lightbox-close';
    boxClose.textContent = '关闭 ✕';
    box.appendChild(boxClose);
    box.appendChild(boxImg);
    document.body.appendChild(box);
    var opener = null;
    var closeBox = function () {
      box.hidden = true;
      boxImg.removeAttribute('src');
      document.body.style.overflow = '';
      if (opener) opener.focus();
    };
    lightboxLinks.forEach(function (a) {
      a.addEventListener('click', function (e) {
        if (e.ctrlKey || e.metaKey || e.shiftKey) return;
        e.preventDefault();
        opener = a;
        var img = a.querySelector('img');
        boxImg.src = a.getAttribute('href');
        boxImg.alt = img ? img.alt : '';
        box.hidden = false;
        document.body.style.overflow = 'hidden';
        boxClose.focus();
      });
    });
    box.addEventListener('click', function (e) { if (e.target !== boxImg) closeBox(); });
    window.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !box.hidden) closeBox(); });
  }

  /* ============================================================
     Homepage downloads + latest version strip
     (the full archive lives on releases.html)
     ============================================================ */
  var heroDownload = document.getElementById('heroDownload');
  if (heroDownload && window.MGAReleases) {
    var setReleases = MGAReleases.bindDownloads(function (choice) {
      heroDownload.href = choice.href;
      heroDownload.querySelector('.btn-label').textContent = choice.label;
      document.querySelectorAll('[data-latest-download]').forEach(function (a) {
        a.href = choice.href;
        a.querySelector('.btn-label').textContent = choice.label;
      });
      var hint = document.getElementById('downloadHint');
      hint.textContent = choice.hint;
      hint.classList.toggle('is-warn', choice.warn);
    });
    MGAReleases.load(function (releases) {
      var latest = MGADownloads.latest(releases);
      if (!latest) return;
      MGAReleases.fillVersion(latest);
      var strip = document.getElementById('heroRelease');
      if (strip) {
        strip.href = 'releases.html#' + encodeURIComponent(latest.tag_name);
        document.getElementById('heroReleaseTag').textContent = latest.tag_name;
        document.getElementById('heroReleaseDate').textContent = MGAReleases.fmtDate(latest.published_at);
      }
      setReleases(releases);
    });
  }

  /* ============================================================
     Back to top
     ============================================================ */
  var backToTop = document.getElementById('backToTop');
  if (backToTop) backToTop.addEventListener('click', function () {
    window.scrollTo({ top: 0, behavior: REDUCED ? 'auto' : 'smooth' });
  });
})();


/* ============================================================
   TITLE SPINE — vertical connector through the chapter bars.
   ============================================================ */
(function () {
  'use strict';
  var spine = document.getElementById('titleSpine');
  if (!spine) return;
  var bars = Array.prototype.slice.call(document.querySelectorAll('.chapter-bar'));
  if (bars.length < 2) return;
  var line = document.createElement('i');
  line.className = 'spine-line';
  var fill = document.createElement('i');
  fill.className = 'spine-fill';
  spine.appendChild(line); spine.appendChild(fill);
  var dots = [];
  function layout() {
    spine.innerHTML = ''; spine.appendChild(line); spine.appendChild(fill); dots = [];
    var main = document.getElementById('main');
    var mainRect = main.getBoundingClientRect();
    var mainTop = mainRect.top + window.scrollY, mainLeft = mainRect.left;
    var pts = bars.map(function (bar) {
      var r = bar.getBoundingClientRect();
      return { x: r.left - mainLeft, y: r.top + window.scrollY - mainTop + r.height / 2 };
    });
    var x = Math.min.apply(null, pts.map(function (p) { return p.x; })) - 26;
    var top = pts[0].y, bottom = pts[pts.length - 1].y;
    spine.style.left = x + 'px';
    spine.style.top = top + 'px';
    spine.style.height = (bottom - top) + 'px';
    pts.forEach(function (p) {
      var d = document.createElement('i');
      d.className = 'spine-dot';
      d.style.top = (p.y - top) + 'px';
      spine.appendChild(d);
      dots.push({ dot: d, frac: (p.y - top) / (bottom - top) });
    });
    spine.dataset.ready = '1';
    spine.dataset.stops = pts.length;
    paint();
  }
  function paint() {
    var top = spine.getBoundingClientRect().top + window.scrollY;
    var h = spine.offsetHeight || 1;
    var progress = Math.max(0, Math.min(1, (window.scrollY + window.innerHeight * .5 - top) / h));
    fill.style.transform = 'scaleY(' + progress + ')';
    dots.forEach(function (n) {
      var lit = progress >= n.frac - 0.001;
      n.dot.classList.toggle('lit', lit);
    });
  }
  var tick = false;
  window.addEventListener('scroll', function () {
    if (tick) return; tick = true;
    requestAnimationFrame(function () { paint(); tick = false; });
  }, { passive: true });
  var rt = false;
  window.addEventListener('resize', function () {
    if (rt) return; rt = true;
    requestAnimationFrame(function () { layout(); rt = false; });
  }, { passive: true });
  layout();
})();
