(function (root) {
  'use strict';

  function assetArchitecture(name) {
    if (typeof name !== 'string' || !/\.exe$/i.test(name)) return null;
    if (/(?:arm64|aarch64)/i.test(name)) return 'arm64';
    if (/(?:ia32|win32|armv7|arm32|i[3-6]86)/i.test(name) || /(?:^|[-_.])x86(?:[-.]|$)/i.test(name) && !/x86[-_]64/i.test(name)) return null;
    return 'x64';
  }

  function latest(releases) {
    var visible = (Array.isArray(releases) ? releases : []).filter(function (r) { return r && !r.draft && typeof r.tag_name === 'string'; });
    var stable = visible.filter(function (r) { return !r.prerelease; });
    return (stable.length ? stable : visible).slice().sort(function (a, b) { return (Date.parse(b.published_at) || 0) - (Date.parse(a.published_at) || 0); })[0];
  }

  function chooseAsset(release, arch) {
    var assets = release && Array.isArray(release.assets) ? release.assets : [];
    function usable(a, wanted) { return a && assetArchitecture(a.name) === wanted && /^https:\/\//i.test(a.browser_download_url || ''); }
    var exact = assets.find(function (a) { return usable(a, arch); });
    return exact || assets.find(function (a) { return usable(a, 'x64'); }) || null;
  }

  async function detect(nav) {
    var ua = nav.userAgent || '';
    var platform = nav.userAgentData && nav.userAgentData.platform || nav.platform || '';
    if (!/win/i.test(platform) && !/Windows/i.test(ua)) return { arch: 'x64', detected: false };
    if (nav.userAgentData && typeof nav.userAgentData.getHighEntropyValues === 'function') {
      try {
        var values = await nav.userAgentData.getHighEntropyValues(['architecture', 'bitness']);
        if (/^(arm|arm64|aarch64)$/i.test(values.architecture) && values.bitness === '64') return { arch: 'arm64', detected: true };
        if (/^(x86|x86_64|x64)$/i.test(values.architecture) && values.bitness === '64') return { arch: 'x64', detected: true };
      } catch (_) { /* Browser privacy settings can withhold architecture hints. */ }
    }
    if (/Windows[^)]*(?:ARM64|aarch64)/i.test(ua)) return { arch: 'arm64', detected: true };
    if (/Windows[^)]*(?:Win64|WOW64|x64|amd64)/i.test(ua)) return { arch: 'x64', detected: true };
    return { arch: 'x64', detected: false };
  }

  root.MGADownloads = { assetArchitecture: assetArchitecture, latest: latest, chooseAsset: chooseAsset, detect: detect };
})(globalThis);
