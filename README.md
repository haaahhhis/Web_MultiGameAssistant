<div align="center">

# Web_MultiGameAssistant

  <h3>MultiGameAssistant 多游戏助手 - 官方网站</h3>

  <p>
    <strong>你去上班上课，日常交给它。管脚本的一组 agent，任意脚本、任意游戏、任意模型。</strong>
  </p>

  <p>
    <a href="https://github.com/haaahhhis/MultiGameAssistant/releases"><img src="https://img.shields.io/github/v/release/haaahhhis/MultiGameAssistant?style=flat-square" alt="Release" /></a>
    <a href="https://github.com/haaahhhis/MultiGameAssistant/stargazers"><img src="https://img.shields.io/github/stars/haaahhhis/MultiGameAssistant?style=flat-square" alt="Stars" /></a>
    <a href="LICENSE"><img src="https://img.shields.io/badge/license-AGPL--3.0-blue?style=flat-square" alt="License" /></a>
  </p>

  <p>
    <a href="https://mga.onl">访问网站</a>
    ·
    <a href="https://github.com/haaahhhis/MultiGameAssistant">核心项目</a>
    ·
    <a href="https://github.com/haaahhhis/MultiGameAssistant/releases">下载</a>
  </p>
</div>

---

## 本地开发

### 本地预览

```bash
python -m http.server 8080
```

在浏览器中打开 [http://localhost:8080](http://localhost:8080) 查看效果。

### 重新构建演示

首页的界面演示由核心项目的前端打包而成。把 [MultiGameAssistant](https://github.com/haaahhhis/MultiGameAssistant) 放在本仓库旁边并装好依赖，然后：

```bash
node demo-build/build.mjs
```

### 更新资源版本号

修改 `assets/` 下的 CSS / JS 后运行：

```bash
node scripts/version-assets.mjs
```

## 开源协议

本项目采用 [AGPL-3.0](LICENSE) 开源协议。

## 相关链接

- [MultiGameAssistant 核心项目](https://github.com/haaahhhis/MultiGameAssistant)
- [官方网站](https://mga.onl)
- [技能库](https://github.com/MultiGameAssistant/skills)
- 用户 QQ 群：118446150
