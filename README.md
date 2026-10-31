# Web_MultiGameAssistant-

MultiGameAssistant（多游戏助手）的静态介绍 / 下载页。纯 HTML + CSS + 原生 JS，无构建步骤、无第三方依赖，部署在 GitHub Pages。

桌面应用源码仓库：https://github.com/haaahhhis/MultiGameAssistant

## 本地预览

```bash
python -m http.server 8080
# 打开 http://localhost:8080
```

需要更新演示数据时，可在开发机运行 `node scripts/preview.mjs`（需主仓库依赖，见下文），刷新 API、构建后启动 `127.0.0.1:8080`；用 `PORT` 可换端口。这只是本地预览工具，不在 GitHub Pages 上运行。已提交的演示文件不需要重新构建即可托管。

## 启用 GitHub Pages

仓库 Settings → Pages → Source 选择 **Deploy from a branch**，Branch 选 `main` / `/ (root)`，保存后站点会发布在
`https://haaahhhis.github.io/Web_MultiGameAssistant-/`。

> 所有资源路径均为相对路径，可在子路径下正常工作。`.nojekyll` 已包含，用于跳过 Jekyll 处理。

### 功能动画在静态站点上的运行方式

- 浏览器直接加载 `index.html`、`assets/`、`app-demo/`、`data/` 和 `favicon.svg`；动画、点击、输入、暂停、切换和飞书卡片都由浏览器 JavaScript 执行。
- 假 gateway 在浏览器内应答协议，不建立 WebSocket 连接，不需要软件后端、Node、Python 或真实账号；图片从同一静态站点的 `data/demo-images/` 读取。
- 游戏 API 只在**开发机重新构建时**刷新；将更新后的 `app-demo/` 与 `data/` 一起提交发布即可。访客打开页面或点演示中的「刷新全部」只读取演示快照，不会实时访问 SRA API。
- 不用把 `demo-build/`、`scripts/` 或主项目依赖部署到服务器；GitHub Pages 只托管已经生成的文件。

可用 `DEMO_SITE_BASE="https://haaahhhis.github.io/Web_MultiGameAssistant-/"` 运行下文的播放 gate，检查实际发布站点。尚未合并的修改不会出现在该线上地址。

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

当前 `main / (root)` 分支发布模式下，同步后会显式请求 Pages 重建（`pages: write`），避免 `GITHUB_TOKEN` 自动提交不触发 Pages 发布。需合并工作流后验证一次实际运行；浏览器读取 GitHub API 不依赖该工作流。

可选：想让官网在主仓库发版后立即刷新快照，可在主仓库的 release workflow 里加一个 `repository_dispatch`（`event_type: release-published`）调用本仓库——需要一个有本仓库权限的 PAT 作为 secret，不配则只靠每 6 小时的定时同步。

本地手动更新快照：`node scripts/sync-releases.mjs`（可选环境变量 `GITHUB_TOKEN`）。

## 下载架构

- 优先选择发布时间最新的正式 Release；没有正式版时使用最新预发布版。新版本通过原有 GitHub API / 10 分钟会话缓存更新，无需修改版本号。
- Windows 浏览器优先用 User-Agent Client Hints 识别 x64 / ARM64；隐私限制、无法识别或非 Windows 设备默认 Windows x64。可手动切换，并同步更新首页和移动菜单的下载链接。
- 只匹配当前版本的 Windows `.exe`。ARM64 包缺失时回退到同版本 x64，并提示；没有匹配安装包时打开发布页，不静默下载旧版本。
- 所有架构识别和下载选择均在浏览器执行，不引入服务端。

## 功能演示（app-demo/）

`app-demo/` 是用 **MultiGameAssistant 真实前端代码**（`apps/web`，AGPL-3.0，源码：<https://github.com/haaahhhis/MultiGameAssistant>）打包出来的静态演示：浏览器内的假 gateway 应答 JSON-RPC，场景导演按虚拟时钟驱动真实 UI。

重新构建（需要把 MultiGameAssistant 仓库放在本仓库旁边，或用 `MGA_REPO` 指定路径）：

```bash
node demo-build/build.mjs   # 使用主仓库自己的 vite/@vitejs/plugin-react，无需在本仓库装依赖
```

构建前会自动刷新 SRA 公共 API（星穹铁道、明日方舟、终末地），将尚未结束的活动和可用封面保存到 `data/demo-games.json` / `data/demo-images/`。游戏场景依次展示方舟、终末地、星铁的软件内真实游戏页。演示中的「刷新全部」重读这份快照，不连接真实账号、不执行真实脚本或发送飞书消息。API 临时不可用时保留上次快照并标记失败；图源拒绝访问时跳过该封面，由真实前端的图片回退逻辑处理。

演示镜头按真实 DOM 位置局部放大，桌面 1.2 倍、窄屏 1.35 倍，可用「局部放大」按钮关闭；减少动态效果设置禁用镜头过渡。首页的 `325` / `799` 是标注清楚的演示流水线/事件编号，不修改真实活动时间。

本地检查（Node.js 24，主仓库依赖已安装）：

```bash
node ../MultiGameAssistant/node_modules/typescript/bin/tsc -p demo-build/tsconfig.json
node --test demo-build/scenarios/clock.test.mjs
node --test scripts/downloads.test.mjs
PW_REQUIRE="$HOME/.cache/mga-demo-tools/package.json" node scripts/site-gate.mjs
PW_REQUIRE="$HOME/.cache/mga-demo-tools/package.json" node demo-build/gate.mjs # 另开终端运行 Python 静态服务器
PW_REQUIRE="$HOME/.cache/mga-demo-tools/package.json" node demo-build/playback-gate.mjs
```

内容 gate 需要 Chrome 与 Playwright：`npm install --prefix "$HOME/.cache/mga-demo-tools" --no-save playwright-core@1.56.1`。不往官网仓库添加运行时依赖。
若 Chrome 不在默认位置，可给两个 gate 设置 `CHROME_PATH` 为可执行文件路径；`DEMO_SITE_BASE` 可指定播放 gate 的站点地址（尾部带 `/`），`DEMO_SHOTS` 可保存检查截图。

`DEMO_GATE_BASE` 可指定不同的静态部署地址（包含 `app-demo/index.html?validate=1`）。

- `demo-build/entry.ts`：安装 FakeGatewaySocket → 注入演示 token → 导入真实 `main.tsx`
- `demo-build/gateway/fake.ts`：假 gateway；`?validate=1` 打开校验日志；未知方法会 warn
- `demo-build/scenarios/director.ts`：六个场景的导演（路由切换、真实 DOM 交互、gateway 通知），父页面用 postMessage 控制
