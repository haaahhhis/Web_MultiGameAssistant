/* MultiGameAssistant 官网 — 版本数据（首页下载按钮与版本发布页共用）
   GitHub API（6 秒超时）→ 失败时读本站快照 data/releases.json；
   成功结果在 sessionStorage 缓存 10 分钟，两个页面共用同一缓存。 */
(function (root) {
  'use strict';

  var API_URL = 'https://api.github.com/repos/haaahhhis/MultiGameAssistant/releases?per_page=20';
  var SNAPSHOT_URL = 'data/releases.json';
  var RELEASES_PAGE = 'https://github.com/haaahhhis/MultiGameAssistant/releases';
  var CACHE_KEY = 'mga_releases_v1';
  var CACHE_TTL = 10 * 60 * 1000;

  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  function fmtDate(iso) {
    var d = new Date(iso);
    if (isNaN(d)) return '';
    return d.getFullYear() + '.' + pad(d.getMonth() + 1) + '.' + pad(d.getDate());
  }
  function fmtSize(bytes) {
    if (!bytes && bytes !== 0) return '';
    var mb = bytes / 1048576;
    return mb >= 100 ? Math.round(mb) + ' MB' : mb.toFixed(1) + ' MB';
  }

  /* drafts never show; newest first */
  function visible(releases) {
    return (releases || [])
      .filter(function (r) { return r && !r.draft && typeof r.tag_name === 'string'; })
      .sort(function (a, b) { return (Date.parse(b.published_at) || 0) - (Date.parse(a.published_at) || 0); });
  }

  function trim(list) {
    return (list || []).map(function (r) {
      return {
        tag_name: r.tag_name,
        name: r.name,
        draft: r.draft,
        prerelease: r.prerelease,
        published_at: r.published_at,
        html_url: r.html_url,
        body: r.body,
        assets: (r.assets || []).map(function (a) {
          return {
            name: a.name,
            size: a.size,
            download_count: a.download_count,
            browser_download_url: a.browser_download_url
          };
        })
      };
    });
  }

  function fetchJson(url, timeoutMs, headers) {
    var ctrl = new AbortController();
    var timer = setTimeout(function () { ctrl.abort(); }, timeoutMs);
    return fetch(url, { signal: ctrl.signal, headers: headers || {} })
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .finally(function () { clearTimeout(timer); });
  }

  /* onData(visibleReleases, sourceLabel) / onFail() */
  function load(onData, onFail) {
    try {
      var raw = sessionStorage.getItem(CACHE_KEY);
      if (raw) {
        var cached = JSON.parse(raw);
        if (cached && Date.now() - cached.t < CACHE_TTL && Array.isArray(cached.data)) {
          onData(visible(cached.data), 'GITHUB API');
          return;
        }
      }
    } catch (e) { /* ignore cache errors */ }

    fetchJson(API_URL, 6000, { 'Accept': 'application/vnd.github+json' })
      .then(function (data) {
        var trimmed = trim(data);
        try {
          sessionStorage.setItem(CACHE_KEY, JSON.stringify({ t: Date.now(), data: trimmed }));
        } catch (e) { /* ignore */ }
        onData(visible(trimmed), 'GITHUB API');
      })
      .catch(function () {
        /* api.github.com 不可达（如大陆网络 / 超时 / 限流）→ 回退到仓库内快照 */
        fetchJson(SNAPSHOT_URL, 8000)
          .then(function (data) { onData(visible(trim(data)), '本站快照'); })
          .catch(function () { if (onFail) onFail(); });
      });
  }

  /* Download choice for the latest release.
     mode: 'auto' | 'x64' | 'arm64'; detected: MGADownloads.detect() result */
  function downloadChoice(releases, mode, detected) {
    var latest = MGADownloads.latest(releases);
    if (!latest) return null;
    var arch = mode === 'auto' ? detected.arch : mode;
    var asset = MGADownloads.chooseAsset(latest, arch);
    var actual = asset && MGADownloads.assetArchitecture(asset.name);
    var armLabel = actual === 'arm64' ? 'ARM64' : 'x64';
    var hint;
    if (!asset) hint = '该版本没有可匹配的 Windows 安装包，请在发布页选择；不会链接到旧版本。';
    else if (arch === 'arm64' && actual !== 'arm64') hint = '该版本未提供 ARM64 包，已回退到 Windows x64；也可在版本发布页查看全部文件。';
    else hint = (mode !== 'auto' ? '已手动选择' : detected.detected ? '检测到' : '无法识别或非 Windows 设备，默认') + ' Windows ' + armLabel + ' · 支持 Windows 10 / 11';
    return {
      release: latest,
      asset: asset,
      href: asset ? asset.browser_download_url : RELEASES_PAGE,
      label: asset ? '下载 ' + latest.tag_name + ' · Windows ' + armLabel : '查看 ' + latest.tag_name + ' 下载',
      hint: hint,
      warn: !!asset && arch === 'arm64' && actual !== 'arm64'
    };
  }

  /* Wires [data-download-arch] buttons and keeps every download link in sync.
     apply(choice) is called whenever releases, detection or the manual choice change. */
  function bindDownloads(apply) {
    var mode = 'auto', detected = { arch: 'x64', detected: false }, releases = [];
    function update() {
      var choice = downloadChoice(releases, mode, detected);
      if (!choice) return;
      var mm = document.getElementById('mobileMenuDownload');
      if (mm) { mm.href = choice.href; mm.textContent = choice.label; }
      apply(choice);
    }
    document.querySelectorAll('[data-download-arch]').forEach(function (button) {
      button.addEventListener('click', function () {
        mode = button.dataset.downloadArch;
        document.querySelectorAll('[data-download-arch]').forEach(function (b) { b.setAttribute('aria-pressed', String(b === button)); });
        update();
      });
    });
    MGADownloads.detect(navigator).then(function (result) { detected = result; update(); });
    return function setReleases(list) { releases = list; update(); };
  }

  /* commands on the page carry「<版本>」until the real version is known */
  function fillVersion(rel) {
    if (!rel) return;
    var version = rel.tag_name.replace(/^v/, '');
    document.querySelectorAll('[data-version-fill]').forEach(function (node) {
      if (!node.dataset.template) node.dataset.template = node.textContent;
      node.textContent = node.dataset.template.split('<版本>').join(version);
    });
  }

  root.MGAReleases = {
    RELEASES_PAGE: RELEASES_PAGE,
    fmtDate: fmtDate,
    fmtSize: fmtSize,
    load: load,
    fillVersion: fillVersion,
    downloadChoice: downloadChoice,
    bindDownloads: bindDownloads
  };
})(window);
