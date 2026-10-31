# Web_MultiGameAssistant-

MultiGameAssistant（多游戏助手）的静态介绍 / 下载页。纯 HTML + CSS + 原生 JS，无构建步骤、无第三方依赖，部署在 GitHub Pages。

桌面应用源码仓库：https://github.com/haaahhhis/MultiGameAssistant

## 本地预览

```bash
python -m http.server 8080
# 打开 http://localhost:8080
```

## 启用 GitHub Pages

仓库 Settings → Pages → Source 选择 **Deploy from a branch**，Branch 选 `main` / `/ (root)`，保存后站点会发布在
`https://haaahhhis.github.io/Web_MultiGameAssistant-/`。

> 所有资源路径均为相对路径，可在子路径下正常工作。`.nojekyll` 已包含，用于跳过 Jekyll 处理。

## 结构

- `index.html` — 单页：首页 / 功能介绍 / 内置支持 / 版本发布 / 页脚
- `assets/css/style.css` — 全部样式
- `assets/js/main.js` — 加载动画、滚动动效、功能切换器、GitHub Releases API 渲染
- `favicon.svg` — 站点图标

版本发布区块在客户端请求 GitHub Releases API（6 秒超时、10 分钟 sessionStorage 缓存），无需后端。

## Releases 快照

大陆网络访问 api.github.com 可能失败，因此页面在 API 不可达时会回退读取仓库内的 `data/releases.json`（页面标注 `SOURCE // 本站快照`）。

该文件由 `.github/workflows/sync-releases.yml` 自动维护：每 6 小时定时跑一次，也可手动触发（Actions → Run workflow），运行 `scripts/sync-releases.mjs` 拉取最新 releases 并在有变化时自动提交。

可选：想让官网在主仓库发版后立即刷新快照，可在主仓库的 release workflow 里加一个 `repository_dispatch`（`event_type: release-published`）调用本仓库——需要一个有本仓库权限的 PAT 作为 secret，不配则只靠每 6 小时的定时同步。

本地手动更新快照：`node scripts/sync-releases.mjs`（可选环境变量 `GITHUB_TOKEN`）。
