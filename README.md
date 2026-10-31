# Web_MultiGameAssistant-

MultiGameAssistant（多游戏助手）的静态介绍 / 下载页。纯 HTML + CSS + 原生 JS，无构建步骤、无第三方依赖，部署在 GitHub Pages。

桌面应用源码仓库：https://github.com/haaahhhis/MultiGameAssistant

## 本地预览

```bash
python -m http.server 8080
# 打开 http://localhost:8080
```

启动前刷新 API 和游戏图片：`node scripts/preview.mjs`（需主仓库依赖，见下文），自动刷新、构建后启动 `127.0.0.1:8080`；用 `PORT` 可换端口。已经提交的静态快照可离线播放，单独启动 Python 静态服务器不会调用外部 API。

## 启用 GitHub Pages

仓库 Settings → Pages → Source 选择 **Deploy from a branch**，Branch 选 `main` / `/ (root)`，保存后站点会发布在
`https://haaahhhis.github.io/Web_MultiGameAssistant-/`。

> 所有资源路径均为相对路径，可在子路径下正常工作。`.nojekyll` 已包含，用于跳过 Jekyll 处理。

## 结构

- `index.html` — 单页：首页 / 特色 / 功能介绍 / 版本发布 / 页脚
- `assets/css/style.css` — 站点样式
- `assets/css/demo.css` / `assets/js/demo.js` — 功能介绍里用代码绘制的软件界面与 6 个场景的动画演示
- `assets/js/main.js` — 加载动画、滚动动效、功能详情、GitHub Releases API 渲染
- `favicon.svg` — 站点图标

版本发布区块在客户端请求 GitHub Releases API（6 秒超时、10 分钟 sessionStorage 缓存），无需后端。

## Releases 快照

大陆网络访问 api.github.com 可能失败，因此页面在 API 不可达时会回退读取仓库内的 `data/releases.json`（页面标注 `SOURCE // 本站快照`）。

该文件由 `.github/workflows/sync-releases.yml` 自动维护：每 6 小时定时跑一次，也可手动触发（Actions → Run workflow），运行 `scripts/sync-releases.mjs` 拉取最新 releases 并在有变化时自动提交。

可选：想让官网在主仓库发版后立即刷新快照，可在主仓库的 release workflow 里加一个 `repository_dispatch`（`event_type: release-published`）调用本仓库——需要一个有本仓库权限的 PAT 作为 secret，不配则只靠每 6 小时的定时同步。

本地手动更新快照：`node scripts/sync-releases.mjs`（可选环境变量 `GITHUB_TOKEN`）。

## 功能演示（app-demo/）

`app-demo/` 是用 **MultiGameAssistant 真实前端代码**（`apps/web`，AGPL-3.0，源码：<https://github.com/haaahhhis/MultiGameAssistant>）打包出来的静态演示：浏览器内的假 gateway 应答 JSON-RPC，场景导演按虚拟时钟驱动真实 UI。

重新构建（需要把 MultiGameAssistant 仓库放在本仓库旁边，或用 `MGA_REPO` 指定路径）：

```bash
node demo-build/build.mjs   # 使用主仓库自己的 vite/@vitejs/plugin-react，无需在本仓库装依赖
```

构建前会自动刷新 SRA 公共 API（星穹铁道、明日方舟、终末地、鸣潮），将尚未结束的活动和可用封面保存到 `data/demo-games.json` / `data/demo-images/`。演示中的「刷新全部」重读这份快照，不连接真实账号、不执行真实脚本或发送飞书消息。API 临时不可用时保留上次快照并标记失败；图源拒绝访问时跳过该封面，由真实前端的图片回退逻辑处理。

本地检查（Node.js 24，主仓库依赖已安装）：

```bash
node ../MultiGameAssistant/node_modules/typescript/bin/tsc -p demo-build/tsconfig.json
node --test demo-build/scenarios/clock.test.mjs
PW_REQUIRE="$HOME/.cache/mga-demo-tools/package.json" node demo-build/gate.mjs # 另开终端运行 Python 静态服务器
```

内容 gate 需要 Chrome 与 Playwright：`npm install --prefix "$HOME/.cache/mga-demo-tools" --no-save playwright-core@1.56.1`。不往官网仓库添加运行时依赖。

`DEMO_GATE_BASE` 可指定不同的静态部署地址（包含 `app-demo/index.html?validate=1`）。

- `demo-build/entry.ts`：安装 FakeGatewaySocket → 注入演示 token → 导入真实 `main.tsx`
- `demo-build/gateway/fake.ts`：假 gateway；`?validate=1` 打开校验日志；未知方法会 warn
- `demo-build/scenarios/director.ts`：六个场景的导演（路由切换、真实 DOM 交互、gateway 通知），父页面用 postMessage 控制
