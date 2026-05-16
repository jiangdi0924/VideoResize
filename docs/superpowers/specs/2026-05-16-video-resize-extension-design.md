# VideoResize Chrome 扩展 — 设计文档 (v1.0)

**日期：** 2026-05-16
**状态：** 草稿，待实现
**负责人：** Jiangdi

---

## 1. 问题与目标

### 1.1 问题描述

许多在线视频网站（如 Bilibili、YouTube 以及各种小众播放器）的视频播放器都很僵硬：

- 播放器尺寸与宽高比被网站布局锁死
- 用户无法把视频放大、充分利用屏幕空间
- 并非所有网站都提供画中画或窗口分离功能
- 视频被周围网页内容包围，分散注意力

用户没办法自由地把观看体验调整到适合自己的屏幕、喜好或当前场景。

### 1.2 目标（v1）

构建一个 Chrome 扩展，在任何包含 HTML5 `<video>` 元素的网页上，给用户三个核心能力：

1. **最大化（Maximize）** —— 把视频从网页原本的布局中"解放"出来。可在 viewport 内任意调整大小和位置。可选地用深色遮罩覆盖视频以外的网页内容。
2. **宽高比控制（Aspect Ratio Control）** —— 把视频强制改成指定的宽高比（预设或自定义）。用户可以选择视频如何"塞"进新比例（拉伸 / 信箱 / 裁切）。
3. **弹出窗口（Pop Out）** —— 把视频抽离到一个独立窗口：原生 PiP、Document PiP 或独立 Chrome 窗口。

以上能力对任何使用标准 `<video>` 元素的网站都通用，包括 iframe 内嵌视频和 Shadow DOM 内的视频。

所有设置通过 `chrome.storage` 按域名记忆。

### 1.3 v1 不做（明确边界）

明确排除：

- 视频内容 zoom + 平移（裁掉硬字幕、聚焦角落场景）
- 截图 / 录屏
- 网站自渲染字幕的样式控制（YouTube / Bilibili 的自渲染字幕 DOM）
- 音轨切换、均衡器、音频特效
- Rust / WASM 视频帧处理
- Firefox 兼容（仅 Chrome + Edge；Edge 直接用同套代码）

### 1.4 延后到 v1.1

- 原生 HTML5 `<track>` 字幕的 CSS 样式控制（成本低，等核心稳定后再做）

---

## 2. 核心功能

### 2.1 最大化

把视频从所在 DOM 容器中解放出来，按用户的意图填充浏览器 viewport。

**子能力：**

- **即时最大化（Instant Maximize）** —— 一键把视频提升到 viewport 级定位（`position: fixed`），尺寸铺满 viewport，可保留也可打破原比例。再点一次恢复。
- **自由缩放（Free Scaling）** —— 拖动角部手柄设置任意宽高。按住修饰键（Shift）锁定比例。
- **自由定位（Free Positioning）** —— 拖动视频本身（或拖动手柄）把视频放到 viewport 任意位置。
- **原生全屏（Native Fullscreen）** —— 快捷调用 `video.requestFullscreen()` 进入操作系统级全屏。
- **深色遮罩（Dark Mask）** —— 在视频之外渲染半透明黑色覆盖层。透明度可调（默认 80%）。独立开关，但通常和最大化一起用。

**状态保留：** 用户开启最大化时，会捕获 `<video>` 元素的原始 `style`、`parentNode` 和 `nextSibling`。恢复时把视频还原到原位置和原样式。

### 2.2 宽高比控制

把视频帧强制变成指定的宽高比。

**预设：** `16:9`、`4:3`、`21:9`、`32:9`、`1:1`、`9:16`、`原始（Original）`
**自定义：** 用户自由输入 `宽:高`（如 `2.39:1`）

**应用模式：**

- **拉伸（Stretch）** —— 把视频强行变形填充新比例（无黑边，画面被压缩或拉伸）。实现方式：`transform: scale(x, y)`，缩放系数按比例差计算。
- **信箱（Letterbox）** —— 保持视频原始比例；不匹配的区域加黑边。实现方式：`object-fit: contain`。
- **裁切（Crop）** —— 保持原比例，放大到铺满容器，多余部分裁掉。实现方式：`object-fit: cover`。

模式和比例是两个独立开关；用户分别选择。

### 2.3 弹出窗口

把视频抽离到独立窗口。三种策略，自动降级：

| 策略 | 能力 | 浏览器支持 |
|------|------|------------|
| **Document Picture-in-Picture** | PiP 窗口里可放任意 HTML（含我们自己的控件） | Chrome 116+ |
| **Native Picture-in-Picture** | OS 级浮窗，浏览器原生控件 | 所有现代 Chrome |
| **独立 Chrome 窗口** | 通过 `chrome.windows.create({type: 'popup'})` 开新窗口 | 全部支持 |

**两条独立的操作路径**（不是单一降级链）：

**路径 1 —— 默认弹出窗口**（单个 "Pop Out" 按钮）：
1. 先尝试 `documentPictureInPicture.requestWindow()`（Document PiP）
2. 不可用则降级到 `video.requestPictureInPicture()`（原生 PiP）

**路径 2 —— 独立窗口打开**（显式独立操作，"在新窗口打开"，在 `SettingsPanel` 中提供）：
- `chrome.runtime.sendMessage({ type: 'open-standalone-window', videoSrc })` → service worker 调 `chrome.windows.create({ type: 'popup' })`
- 不放进自动降级链，因为它体量重，只对特定多任务场景有用

**Document PiP 细节：** 把我们的 React UI 子树（或专门的 PiP 模式子树）搬到 PiP 窗口的 DOM 里。重新挂载事件监听。PiP 关闭时恢复到 tab 内状态。

**独立窗口细节：** 需要一个可用的视频源 URL。如果视频用 MSE / DRM，独立窗口无法重播 —— 检测后弹提示并优雅降级。v1 仅对直接 URL 的 `<video>` 支持独立窗口（不支持 MSE）。

### 2.4 按域名记忆设置

每个设置项（是否最大化、上次的宽高比、上次的遮罩透明度等等）都可以按 `eTLD+1` 域名记忆。

**进站点时：**
- 如果该 domain 有已保存设置 → 加载并按用户偏好选择是否自动应用（在 popup 里有开关）
- 如果没有 → 不做任何 UI 变动；扩展处于待命状态，等用户触发

设置 UI 在扩展 popup 里。

---

## 3. 系统架构

三个执行环境，通过 `chrome.storage` 的变更事件和 `chrome.runtime.sendMessage` 通信。

### 3.1 Content Script（主舞台）

- 注入到 `<all_urls>` 匹配的页面
- `all_frames: true`，覆盖 iframe 内嵌视频
- 把 Shadow DOM root 挂在 `<html>` 上（不挂 `<body>`，避免 SPA 清空 body 时丢失）
- React 19 应用在 Shadow DOM 内渲染所有 UI
- 直接操作 `<video>` DOM 元素

### 3.2 Service Worker（后台）

- 持有 `chrome.storage` 的读写（唯一数据源）
- 通过 `chrome.tabs.sendMessage` 向所有 tab 广播设置变更
- 用 `chrome.commands` 注册全局快捷键（映射到最大化切换、遮罩切换、Pop Out）
- 协调"开独立窗口"的请求

### 3.3 扩展 Popup

- 点击扩展图标 → 显示全局设置 + 各域名设置列表 + "手动选择视频" 入口
- 独立的 React 树（也用 shadcn —— 因为是浏览器 chrome 自己拥有的 UI，不需要 Shadow DOM 隔离）

### 3.4 通信模型

```
┌─────────────────────┐         ┌──────────────────────┐
│  Content Script     │◀───────▶│   Service Worker     │
│  (Shadow 内 React)  │         │   (storage + tabs)   │
└─────────────────────┘         └──────────────────────┘
           ▲                              ▲
           │ chrome.runtime.sendMessage   │
           ▼                              ▼
       <video>                      ┌──────────────────┐
                                    │  扩展 Popup       │
                                    └──────────────────┘
```

- 每个环境里的 `SettingsStore`（Zustand）订阅 `chrome.storage.onChanged` 实现跨 tab 同步
- Content script 与 Service worker 之间的消息通过 `src/shared/types.ts` 里的共享 TypeScript 类型做类型约束

---

## 4. 模块拆分

除非另外说明，所有模块在 `src/content/modules/` 下。

### 4.1 `VideoDetector`（视频识别器）

**职责：** 在页面里找到目标 `<video>` 元素。

**策略：**
1. `DOMContentLoaded` 时初次扫描：收集所有 `<video>` 元素（包括同源 iframe 内可访问的、以及深度遍历 Shadow DOM 内的）。
2. `MutationObserver` 监听 `document.body` 节点增删；变化时重新扫描。
3. 在候选 video 上监听 `play` / `pause` / `loadedmetadata` 事件。
4. **选择条件：** 最大可见面积（与 viewport 的相交区域最大）且 **本次会话内至少播放过一次**。

**输出：** 暴露 `getTargetVideo(): HTMLVideoElement | null` 接口和一个 `videochange` 事件发射器。

**边界情况：**
- 多个合格视频（如分屏）→ 选最大那个
- 没检测到视频 → 返回 `null`；popup 显示 "未检测到视频"
- 垃圾站点有很多小视频 → 自动选择只考虑面积大于 viewport 50% 的视频；小的需要用户手动选择

### 4.2 `VideoController`（视频控制器）

**职责：** 包装目标 `<video>` 元素，给其它 engine 提供稳定 API。

**首次 attach 时捕获的状态：**
- `element.style.cssText`（完整的原始内联样式）
- `element.parentNode`、`element.nextSibling`（用于恢复）
- 计算出的尺寸（供后续相对原尺寸的数学计算）

**API：**
- `attach()` —— 捕获原始状态，准备操作
- `detach()` —— 恢复原状态，撤销所有变换
- `applyTransform({ scale, translate, aspectRatio, fitMode })` —— 应用视觉变换
- `requestPictureInPicture(opts)` —— 代理调 PiP API

### 4.3 `MaximizeEngine`（最大化引擎）

**职责：** 实现"铺满 viewport 最大化"和"自由缩放/定位"。

**策略：**
- 通过 `position: fixed` 把视频在视觉上移到 viewport 级坐标（或物理 re-parent）
- z-index 足够高，盖过页面内容（但低于我们 Shadow DOM 内的 UI）
- 拖动手柄通过 UI 层（`DragHandles` 组件）挂载，把变化报回 `MaximizeEngine`

**重点：** 有些站点的 CSS 在祖先节点上设了 `transform`，会破坏 `<video>` 上的 `position: fixed`（创建新的 containing block）。降级方案：把 video 元素物理 re-parent 到 `document.body`。**决策：** 优先尝试 `position: fixed`；如果通过 `getBoundingClientRect` 检测到视觉位置不在预期的 viewport 坐标，自动降级到 "lift to body"。

### 4.4 `AspectEngine`（宽高比引擎）

**职责：** 实现宽高比变换（拉伸 / 信箱 / 裁切）。

**策略：**
- **拉伸：** 根据 (目标比例 / 源比例) 计算 `scaleX, scaleY`，通过 `transform` 应用
- **信箱：** 视频 `object-fit: contain`；容器形状匹配目标比例
- **裁切：** `object-fit: cover`；容器形状匹配目标比例

源视频的宽高比通过 `video.videoWidth / video.videoHeight` 在 metadata 加载后读取。

### 4.5 `PopOutEngine`（弹出引擎）

**职责：** 实现三种弹出策略，含自动降级。

**两条独立路径：**

路径 1（"Pop Out" 按钮触发）：
1. `documentPictureInPicture.requestWindow()`（Document PiP）
2. 失败降级 `video.requestPictureInPicture()`（原生 PiP）

路径 2（"在新窗口打开" 显式操作触发）：
3. `chrome.runtime.sendMessage({ type: 'open-standalone-window', videoSrc })` → Service worker 调 `chrome.windows.create`

**Document PiP 实现：** 把我们的 React UI 子树（或专用的 PiP 模式子树）搬到 PiP 窗口的 DOM 里。重新挂载事件。关闭时恢复 tab 内状态。

**独立窗口实现：** 需要提取可用的视频 src URL。若视频用 MSE / DRM，独立窗口无法重播 —— 显示提示并优雅降级。v1 只对直接 URL 的 `<video>` 支持独立窗口（不支持 MSE）。

### 4.6 `MaskEngine`（遮罩引擎）

**职责：** 在页面上渲染深色遮罩，挖空视频区域。

**实现：**
- 一个 `<div>` 渲染在 Shadow DOM 里，fixed 定位、铺满 viewport、`background: rgba(0,0,0,opacity)`
- 用 `clip-path`（或视频四周四块兄弟矩形）让视频区域露出
- 在 resize、scroll、视频位置变化时更新
- `pointer-events: none`，让点击穿透到视频控件

**透明度：** 滑块可调 0%–95%（默认 80%）。

### 4.7 `SettingsStore`（设置存储，位于 `src/shared/store/`）

**实现：** Zustand store，与 `chrome.storage.local` 同步。

**Schema：**

```typescript
type Settings = {
  global: {
    defaultMaskOpacity: number;       // 0–1
    autoApplyPerDomain: boolean;      // 主开关
    shortcuts: Record<ActionId, string>;
  };
  domains: Record<string, DomainSettings>;
}

type DomainSettings = {
  enabledOnSiteLoad: boolean;        // 进站点时自动应用
  lastMaximize: boolean;
  lastAspectRatio: string | null;    // "16:9" | "21:9" | "custom:2.39:1" | null
  lastFitMode: 'stretch' | 'letterbox' | 'crop';
  lastMaskOpacity: number;
}
```

**持久化：** 每次变更通过 200ms 防抖写入 `chrome.storage.local`。初始化时从 storage 读取。跨 tab 同步通过 `chrome.storage.onChanged` 实现。

### 4.8 `UIRoot`（React + shadcn）

**`src/content/components/` 下的组件：**

- `FloatingToolbar` —— 鼠标悬停视频时显示的小工具栏（默认位置：视频右上角）。承载快捷操作：最大化切换、遮罩切换、Pop Out、打开设置。
- `SettingsPanel` —— 完整面板（从 viewport 右侧滑入，或居中模态）。所有宽高比 / 遮罩 / 位置控件都在这里。可关闭。
- `DragHandles` —— 自由调整尺寸模式下显示的 8 个手柄（4 角 + 4 边）；和 `MaximizeEngine` 状态联动。
- `Toast` —— 短暂反馈（"已恢复"、"已为 youtube.com 保存设置" 等）。

**Shadow DOM 挂载方式：**

```typescript
const host = document.createElement('div');
host.id = 'video-resize-root';
document.documentElement.appendChild(host);
const shadow = host.attachShadow({ mode: 'closed' });
// Tailwind CSS 以 <style> 形式注入到 shadow root
// Radix portal 通过 container prop 指向 shadow root
const reactRoot = createRoot(shadow);
reactRoot.render(<App />);
```

**Radix portal 处理：** 用 `PortalContainerProvider` 包裹 shadcn 组件，把 shadow root 作为 portal container 注入。这是 Radix 文档里推荐的 Shadow DOM 模式。

**Tailwind 在 Shadow DOM 内：** 构建时把 Tailwind CSS 编译成字符串，挂载时作为 `<style>` 元素注入 shadow root。

---

## 5. 关键行为

### 5.1 视频识别时机

- `DOMContentLoaded` 时扫描 + 每次 `MutationObserver` 回调扫描
- 视频只在用户打开我们 UI 时才成为 "目标"；在此之前只观察、不操作
- 这避免在多视频站点上误接管不相关的视频

### 5.2 首次交互原则

- 扩展在每个页面加载时默认处于待命状态
- 用户通过以下任意一种方式激活：点击扩展图标、配置好的快捷键、悬停视频后显示的浮动 widget（三种激活方式在 v1 都连通；浮动 widget 的具体视觉在实现阶段迭代）
- 例外：如果 `domain.enabledOnSiteLoad` 为 `true`，页面加载时自动应用上次设置

### 5.3 状态保留与恢复

- 每次变换在 `VideoController.attach()` 时捕获前置状态
- `Esc` 键或显式 "Restore" 操作调用 `VideoController.detach()` → 精确还原
- 页面导航（SPA 路由变化）：通过 monkey-patch History API 检测，自动还原

### 5.4 快捷键（默认值）

- `Alt+Shift+M` —— 最大化切换
- `Alt+Shift+D` —— 深色遮罩切换
- `Alt+Shift+P` —— Pop Out（Document PiP / 原生 PiP）

所有快捷键在 popup 里可配置 —— 通过 `chrome.commands` API。

### 5.5 iframe 处理

- Content script 注入时设置 `all_frames: true`
- 每个 frame 独立运行自己的识别器和 UI
- 跨域 iframe 各自独立运作；v1 不做跨 frame 协调
- Popup 通过 `chrome.tabs.sendMessage` + `frameId` 查询每个 frame 检测到的视频，在 "手动选择" 时显示完整列表

---

## 6. 构建与质量

### 6.1 技术栈

| 层 | 选型 | 原因 |
|----|------|------|
| 构建 | Vite + `@crxjs/vite-plugin` | 一流的 Chrome 扩展支持，自带 HMR |
| 语言 | TypeScript（strict 模式） | 类型安全、IDE 体验好 |
| 框架 | React 19 | 现代、成熟、shadcn 生态 |
| 样式 | Tailwind CSS | 工具类优先，shadcn 标配 |
| UI 库 | shadcn/ui + Radix UI | 现代、无障碍、可定制 |
| 状态 | Zustand | 模板代码最少，跨 React 树工作 |
| Manifest | Manifest V3 | Chrome 强制要求（V2 已废弃） |

### 6.2 项目结构

```
VideoResize/
├── src/
│   ├── manifest.ts                       # Manifest V3，由 @crxjs 生成
│   ├── content/
│   │   ├── index.tsx                     # Content script 入口，挂 Shadow DOM
│   │   ├── shadow-mount.ts               # Shadow DOM 创建 + 样式注入
│   │   ├── components/
│   │   │   ├── FloatingToolbar.tsx
│   │   │   ├── SettingsPanel.tsx
│   │   │   ├── DragHandles.tsx
│   │   │   └── Toast.tsx
│   │   └── modules/
│   │       ├── VideoDetector.ts
│   │       ├── VideoController.ts
│   │       ├── MaximizeEngine.ts
│   │       ├── AspectEngine.ts
│   │       ├── PopOutEngine.ts
│   │       └── MaskEngine.ts
│   ├── background/
│   │   └── service-worker.ts
│   ├── popup/
│   │   ├── index.tsx
│   │   ├── App.tsx
│   │   └── components/
│   │       ├── DomainList.tsx
│   │       └── ShortcutsEditor.tsx
│   ├── shared/
│   │   ├── store/SettingsStore.ts
│   │   ├── types.ts
│   │   ├── messages.ts                   # 类型化的消息 schema
│   │   └── ui/                           # shadcn 组件
│   └── styles/
│       └── globals.css                   # Tailwind directives
├── public/
│   └── icons/                            # 16/32/48/128
├── tests/
│   ├── unit/                             # Vitest 测 engine
│   └── e2e/                              # Playwright 测真实视频页
├── vite.config.ts
├── tsconfig.json
├── tailwind.config.ts
├── components.json                       # shadcn 配置
└── package.json
```

### 6.3 质量门槛

- ESLint（typescript-eslint、react-hooks）
- Prettier
- TypeScript `strict: true`，禁用 `any`（用 `unknown` + 类型守卫）
- Vitest 单元测试覆盖每个 engine 模块（特别是 `AspectEngine` 的数学、`VideoController` 的状态）
- Playwright E2E 覆盖：YouTube、Bilibili、通用 `<video>` 测试页
- Pre-commit hook（Husky + lint-staged）跑 lint + typecheck + 相关测试

---

## 7. 风险与遗留问题

### 7.1 已知风险

| 风险 | 缓解措施 |
|------|----------|
| 站点祖先元素有 CSS `transform`，破坏 `position: fixed` | 降级为把 video re-parent 到 `document.body` |
| MSE / DRM 视频无法在独立窗口重播 | 通过 `MediaSource` 检测；显示 "Pop Out 不可用"；PiP 仍然可用 |
| 站点自己的脚本和我们的 DOM 操作打架 | 用 MutationObserver 重新应用；在 adapter notes 里记录特定站点 |
| Shadow DOM CSS 加载晚 → UI 闪烁未样式化内容 | 在首次 React 渲染前同步注入 Tailwind `<style>` |
| Chrome 存储配额（5MB） | 每个 domain 设置很小（~100 字节）；预期规模下不是问题 |
| SPA 导航丢失视频引用 | 监听 History API；自动 detach 并重新识别 |

### 7.2 遗留问题（在实现阶段解决）

- **`FloatingToolbar` / `SettingsPanel` 具体视觉设计** —— 在实现阶段设计。功能需求已固定；视觉风格以 shadcn 默认为基础，首版原型后迭代。
- **哪些站点需要专门的 adapter** —— 推迟到遇到问题时再做；v1 出货时只做通用方案。

---

## 8. 成功标准

满足以下条件可发布 v1：

1. 三个核心功能（最大化、宽高比、Pop Out）在以下场景都可工作：
   - 通用 HTML5 `<video>` 测试页
   - YouTube 观看页
   - Bilibili 视频页
2. 按域名记忆的设置在浏览器重启后仍然持久化
3. 恢复操作（`Esc` 或显式按钮）能把页面还原到视觉上和原始加载状态无差别
4. 所有快捷键可配置
5. 测试覆盖率：engine 模块 ≥80% 行覆盖；E2E 套件在三个目标站点全绿
6. Manifest V3 合规；安装后 `chrome://extensions` 错误检查无报错
