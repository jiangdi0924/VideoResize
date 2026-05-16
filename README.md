# VideoResize

Chrome 扩展：在任意 HTML5 视频网页上自由调整视频大小、宽高比、位置，弹出到独立窗口。设置按域名记忆。

## 功能

- **最大化** — 一键铺满 viewport，可调透明深色遮罩
- **宽高比** — 16:9 / 4:3 / 21:9 / 32:9 / 1:1 / 9:16 / 自定义；拉伸 / 信箱 / 裁切三种模式
- **弹出窗口** — Document PiP / 原生 PiP / 独立 Chrome 窗口

## 开发

```bash
npm install
npm run dev        # Vite HMR
npm run build      # 产出到 dist/
npm test           # 单元测试
npm run test:e2e   # E2E 测试
```

在 Chrome 加载 `dist/` 目录为已解压扩展。

## 快捷键

- `Alt+Shift+M` 切换最大化
- `Alt+Shift+D` 切换深色遮罩
- `Alt+Shift+P` 弹出窗口

可在 `chrome://extensions/shortcuts` 修改。

## 设计文档

[docs/superpowers/specs/2026-05-16-video-resize-extension-design.md](docs/superpowers/specs/2026-05-16-video-resize-extension-design.md)
