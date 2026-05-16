# VideoResize Chrome 扩展 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建一个 Chrome 扩展，让用户在任意 HTML5 `<video>` 网页上自由调整视频大小、宽高比、位置，并把视频弹出到独立窗口。设置按域名记忆。

**Architecture:** Manifest V3 扩展。Content Script + Shadow DOM 内的 React 应用承载用户交互；Service Worker 处理 chrome.storage 同步和全局快捷键；Popup 提供全局设置 + 按域名管理。核心代码切成 8 个职责单一的模块：VideoDetector / VideoController / 4 个 Engine（Maximize / Aspect / Mask / PopOut）/ SettingsStore / UIRoot。

**Tech Stack:** Vite + @crxjs/vite-plugin · React 19 · TypeScript（strict）· Tailwind CSS · shadcn/ui + Radix UI · Zustand · Vitest（jsdom）· Playwright · Manifest V3

**Spec reference:** [docs/superpowers/specs/2026-05-16-video-resize-extension-design.md](../specs/2026-05-16-video-resize-extension-design.md)

---

## 文件结构

```
VideoResize/
├── package.json
├── vite.config.ts
├── tsconfig.json
├── tsconfig.node.json
├── tailwind.config.ts
├── postcss.config.js
├── components.json                 # shadcn 配置
├── .eslintrc.cjs
├── .prettierrc
├── playwright.config.ts
├── vitest.config.ts
├── public/
│   └── icons/                      # 16/32/48/128
├── src/
│   ├── manifest.ts                 # @crxjs 用的 manifest 定义
│   ├── content/
│   │   ├── index.tsx               # content script 入口
│   │   ├── shadow-mount.ts         # Shadow DOM 创建 + 样式注入
│   │   ├── components/
│   │   │   ├── App.tsx             # Content 端 UI 根
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
│   │   ├── index.html
│   │   ├── index.tsx
│   │   ├── App.tsx
│   │   └── components/
│   │       ├── DomainList.tsx
│   │       └── ShortcutsEditor.tsx
│   ├── shared/
│   │   ├── store/
│   │   │   └── SettingsStore.ts
│   │   ├── types.ts
│   │   ├── messages.ts
│   │   ├── domain.ts               # eTLD+1 提取等工具
│   │   └── ui/                     # shadcn 组件（生成）
│   └── styles/
│       └── globals.css             # Tailwind directives
└── tests/
    ├── unit/                       # Vitest（jsdom）
    │   ├── VideoDetector.test.ts
    │   ├── VideoController.test.ts
    │   ├── AspectEngine.test.ts
    │   ├── MaximizeEngine.test.ts
    │   ├── MaskEngine.test.ts
    │   ├── PopOutEngine.test.ts
    │   ├── SettingsStore.test.ts
    │   └── domain.test.ts
    └── e2e/                        # Playwright
        ├── generic.spec.ts
        ├── youtube.spec.ts
        ├── bilibili.spec.ts
        └── fixtures/
            └── video-page.html
```

---

## Phase 0：项目初始化

### Task 0.1：初始化 package.json 与依赖

**Files:**
- Create: `package.json`

- [ ] **Step 1: 创建 package.json**

Write to `package.json`:

```json
{
  "name": "video-resize",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "lint": "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0",
    "format": "prettier --write \"src/**/*.{ts,tsx,css}\"",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test"
  },
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "zustand": "^5.0.0"
  },
  "devDependencies": {
    "@crxjs/vite-plugin": "^2.0.0-beta.28",
    "@playwright/test": "^1.45.0",
    "@testing-library/jest-dom": "^6.4.0",
    "@testing-library/react": "^16.0.0",
    "@types/chrome": "^0.0.270",
    "@types/node": "^22.0.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@typescript-eslint/eslint-plugin": "^8.0.0",
    "@typescript-eslint/parser": "^8.0.0",
    "@vitejs/plugin-react": "^4.3.0",
    "autoprefixer": "^10.4.0",
    "eslint": "^9.0.0",
    "eslint-plugin-react-hooks": "^5.0.0",
    "jsdom": "^25.0.0",
    "postcss": "^8.4.0",
    "prettier": "^3.3.0",
    "tailwindcss": "^3.4.0",
    "typescript": "^5.5.0",
    "vite": "^5.4.0",
    "vitest": "^2.1.0"
  }
}
```

- [ ] **Step 2: 安装依赖**

Run: `npm install`
Expected: 安装成功，生成 `node_modules/` 和 `package-lock.json`

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: initialize package.json with dependencies"
```

---

### Task 0.2：配置 TypeScript

**Files:**
- Create: `tsconfig.json`
- Create: `tsconfig.node.json`

- [ ] **Step 1: 创建 `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "noImplicitOverride": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "types": ["chrome", "vite/client"],
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@content/*": ["src/content/*"],
      "@popup/*": ["src/popup/*"],
      "@shared/*": ["src/shared/*"]
    }
  },
  "include": ["src", "tests"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

- [ ] **Step 2: 创建 `tsconfig.node.json`**

```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true,
    "strict": true
  },
  "include": ["vite.config.ts", "vitest.config.ts", "playwright.config.ts"]
}
```

- [ ] **Step 3: 验证**

Run: `npx tsc --noEmit`
Expected: 无输出（无报错），因为还没有 src 文件

- [ ] **Step 4: Commit**

```bash
git add tsconfig.json tsconfig.node.json
git commit -m "chore: configure TypeScript with strict mode"
```

---

### Task 0.3：配置 Vite + @crxjs

**Files:**
- Create: `src/manifest.ts`
- Create: `vite.config.ts`

- [ ] **Step 1: 创建 `src/manifest.ts`**

```typescript
import { defineManifest } from '@crxjs/vite-plugin';

export default defineManifest({
  manifest_version: 3,
  name: 'VideoResize',
  version: '0.1.0',
  description: '自由调整任何网页视频的大小、宽高比、位置，弹出到独立窗口。',
  icons: {
    16: 'icons/icon-16.png',
    32: 'icons/icon-32.png',
    48: 'icons/icon-48.png',
    128: 'icons/icon-128.png',
  },
  action: {
    default_popup: 'src/popup/index.html',
    default_icon: {
      16: 'icons/icon-16.png',
      32: 'icons/icon-32.png',
    },
  },
  background: {
    service_worker: 'src/background/service-worker.ts',
    type: 'module',
  },
  content_scripts: [
    {
      matches: ['<all_urls>'],
      js: ['src/content/index.tsx'],
      run_at: 'document_idle',
      all_frames: true,
    },
  ],
  permissions: ['storage', 'tabs', 'activeTab'],
  commands: {
    'toggle-maximize': {
      description: '切换最大化',
      suggested_key: { default: 'Alt+Shift+M' },
    },
    'toggle-mask': {
      description: '切换深色遮罩',
      suggested_key: { default: 'Alt+Shift+D' },
    },
    'pop-out': {
      description: '弹出到独立窗口',
      suggested_key: { default: 'Alt+Shift+P' },
    },
  },
  web_accessible_resources: [
    {
      resources: ['icons/*'],
      matches: ['<all_urls>'],
    },
  ],
});
```

- [ ] **Step 2: 创建 `vite.config.ts`**

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { crx } from '@crxjs/vite-plugin';
import { resolve } from 'node:path';
import manifest from './src/manifest';

export default defineConfig({
  plugins: [react(), crx({ manifest })],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@content': resolve(__dirname, 'src/content'),
      '@popup': resolve(__dirname, 'src/popup'),
      '@shared': resolve(__dirname, 'src/shared'),
    },
  },
  build: {
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'src/popup/index.html'),
      },
    },
  },
});
```

- [ ] **Step 3: Commit**

```bash
git add src/manifest.ts vite.config.ts
git commit -m "chore: configure Vite with @crxjs plugin and Manifest V3"
```

---

### Task 0.4：配置 Tailwind 与 shadcn

**Files:**
- Create: `tailwind.config.ts`
- Create: `postcss.config.js`
- Create: `src/styles/globals.css`
- Create: `components.json`

- [ ] **Step 1: 创建 `tailwind.config.ts`**

```typescript
import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        muted: { DEFAULT: 'hsl(var(--muted))', foreground: 'hsl(var(--muted-foreground))' },
        accent: { DEFAULT: 'hsl(var(--accent))', foreground: 'hsl(var(--accent-foreground))' },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
    },
  },
  plugins: [],
} satisfies Config;
```

- [ ] **Step 2: 创建 `postcss.config.js`**

```javascript
export default {
  plugins: { tailwindcss: {}, autoprefixer: {} },
};
```

- [ ] **Step 3: 创建 `src/styles/globals.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :host, :root {
    --background: 240 6% 10%;
    --foreground: 0 0% 95%;
    --border: 240 4% 16%;
    --muted: 240 4% 16%;
    --muted-foreground: 240 5% 65%;
    --accent: 240 4% 16%;
    --accent-foreground: 0 0% 98%;
    --radius: 0.5rem;
  }
}
```

- [ ] **Step 4: 创建 `components.json`**

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "default",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.ts",
    "css": "src/styles/globals.css",
    "baseColor": "zinc",
    "cssVariables": true
  },
  "aliases": {
    "components": "@/shared/ui",
    "utils": "@/shared/ui/utils"
  }
}
```

- [ ] **Step 5: 安装基础 shadcn 组件**

Run: `npx shadcn@latest init -y && npx shadcn@latest add button slider switch dialog toast`
Expected: 在 `src/shared/ui/` 下生成 `button.tsx`, `slider.tsx`, `switch.tsx`, `dialog.tsx`, `toast.tsx`, `utils.ts`

- [ ] **Step 6: Commit**

```bash
git add tailwind.config.ts postcss.config.js src/styles/globals.css components.json src/shared/ui/
git commit -m "chore: configure Tailwind CSS and shadcn/ui components"
```

---

### Task 0.5：配置 ESLint、Prettier、Vitest

**Files:**
- Create: `.eslintrc.cjs`
- Create: `.prettierrc`
- Create: `vitest.config.ts`
- Create: `tests/setup.ts`

- [ ] **Step 1: 创建 `.eslintrc.cjs`**

```javascript
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: { ecmaVersion: 'latest', sourceType: 'module', project: './tsconfig.json' },
  plugins: ['@typescript-eslint', 'react-hooks'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended-type-checked',
    'plugin:react-hooks/recommended',
  ],
  rules: {
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
  },
  ignorePatterns: ['dist', 'node_modules', '.eslintrc.cjs'],
};
```

- [ ] **Step 2: 创建 `.prettierrc`**

```json
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2
}
```

- [ ] **Step 3: 创建 `vitest.config.ts`**

```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    coverage: { provider: 'v8', reporter: ['text', 'html'] },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@content': resolve(__dirname, 'src/content'),
      '@popup': resolve(__dirname, 'src/popup'),
      '@shared': resolve(__dirname, 'src/shared'),
    },
  },
});
```

- [ ] **Step 4: 创建 `tests/setup.ts`**

```typescript
import '@testing-library/jest-dom/vitest';
import { vi, beforeEach } from 'vitest';

const storage = new Map<string, unknown>();

const chromeMock = {
  storage: {
    local: {
      get: vi.fn(async (keys: string | string[] | null) => {
        if (keys === null) return Object.fromEntries(storage);
        const list = Array.isArray(keys) ? keys : [keys];
        return Object.fromEntries(list.map((k) => [k, storage.get(k)]).filter(([, v]) => v !== undefined));
      }),
      set: vi.fn(async (items: Record<string, unknown>) => {
        Object.entries(items).forEach(([k, v]) => storage.set(k, v));
      }),
      remove: vi.fn(async (keys: string | string[]) => {
        (Array.isArray(keys) ? keys : [keys]).forEach((k) => storage.delete(k));
      }),
      clear: vi.fn(async () => storage.clear()),
    },
    onChanged: { addListener: vi.fn(), removeListener: vi.fn() },
  },
  runtime: {
    sendMessage: vi.fn(),
    onMessage: { addListener: vi.fn() },
  },
  tabs: {
    sendMessage: vi.fn(),
    query: vi.fn(async () => []),
  },
  windows: {
    create: vi.fn(async () => ({ id: 1 })),
  },
  commands: {
    onCommand: { addListener: vi.fn() },
  },
};

beforeEach(() => {
  storage.clear();
  vi.clearAllMocks();
});

globalThis.chrome = chromeMock as unknown as typeof chrome;
```

- [ ] **Step 5: Commit**

```bash
git add .eslintrc.cjs .prettierrc vitest.config.ts tests/setup.ts
git commit -m "chore: configure ESLint, Prettier, and Vitest"
```

---

### Task 0.6：基础 Hello World 验证整个 toolchain

**Files:**
- Create: `src/content/index.tsx`
- Create: `src/background/service-worker.ts`
- Create: `src/popup/index.html`
- Create: `src/popup/index.tsx`
- Create: `src/popup/App.tsx`
- Create: `public/icons/icon-16.png` 等 4 张

- [ ] **Step 1: 创建占位图标**

Run:
```bash
mkdir -p public/icons
# 生成 4 张占位 PNG（纯色 1px 缩放）
for size in 16 32 48 128; do
  printf 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==' | base64 -d > public/icons/icon-${size}.png
done
```
Expected: 生成 4 个 PNG（占位用，Task 7.1 替换为正式图标）

- [ ] **Step 2: 创建 `src/popup/index.html`**

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <title>VideoResize</title>
    <link rel="stylesheet" href="../styles/globals.css" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="./index.tsx"></script>
  </body>
</html>
```

- [ ] **Step 3: 创建 `src/popup/App.tsx`**

```typescript
export function App() {
  return (
    <div className="w-72 p-4 bg-background text-foreground">
      <h1 className="text-lg font-semibold">VideoResize</h1>
      <p className="text-sm text-muted-foreground">扩展已加载</p>
    </div>
  );
}
```

- [ ] **Step 4: 创建 `src/popup/index.tsx`**

```typescript
import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';

const container = document.getElementById('root');
if (container) {
  createRoot(container).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}
```

- [ ] **Step 5: 创建 `src/background/service-worker.ts`**

```typescript
// 占位 service worker，Task 5.1 实现完整逻辑
console.log('[VideoResize] service worker loaded');
```

- [ ] **Step 6: 创建 `src/content/index.tsx`**

```typescript
// 占位 content script，Task 4.1 实现 Shadow DOM 挂载
console.log('[VideoResize] content script loaded');
export {};
```

- [ ] **Step 7: 验证构建**

Run: `npm run build`
Expected: 构建成功，在 `dist/` 下产出完整扩展（含 manifest.json、popup.html、service-worker.js、content script）

- [ ] **Step 8: 验证安装到 Chrome**

打开 Chrome → `chrome://extensions` → 开启开发者模式 → 加载已解压扩展 → 选 `dist/` 目录。
打开任意网页（如 example.com），按 F12 看 Console，应看到 `[VideoResize] content script loaded`。
点击工具栏 VideoResize 图标，应看到 popup 显示 "扩展已加载"。

- [ ] **Step 9: Commit**

```bash
git add public/icons src/popup src/background src/content src/styles
git commit -m "chore: scaffold popup, content script, and service worker"
```

---

## Phase 1：共享层（types、messages、store）

### Task 1.1：定义共享 types

**Files:**
- Create: `src/shared/types.ts`
- Create: `src/shared/domain.ts`
- Test: `tests/unit/domain.test.ts`

- [ ] **Step 1: 创建 `src/shared/types.ts`**

```typescript
export type FitMode = 'stretch' | 'letterbox' | 'crop';

export type AspectRatioPreset = '16:9' | '4:3' | '21:9' | '32:9' | '1:1' | '9:16' | 'original';
export type AspectRatio = AspectRatioPreset | `custom:${string}`;

export type ActionId = 'toggle-maximize' | 'toggle-mask' | 'pop-out';

export interface DomainSettings {
  enabledOnSiteLoad: boolean;
  lastMaximize: boolean;
  lastAspectRatio: AspectRatio | null;
  lastFitMode: FitMode;
  lastMaskOpacity: number; // 0–1
}

export interface GlobalSettings {
  defaultMaskOpacity: number;
  autoApplyPerDomain: boolean;
  shortcuts: Record<ActionId, string>;
}

export interface Settings {
  global: GlobalSettings;
  domains: Record<string, DomainSettings>;
}

export const DEFAULT_DOMAIN_SETTINGS: DomainSettings = {
  enabledOnSiteLoad: false,
  lastMaximize: false,
  lastAspectRatio: null,
  lastFitMode: 'letterbox',
  lastMaskOpacity: 0.8,
};

export const DEFAULT_GLOBAL_SETTINGS: GlobalSettings = {
  defaultMaskOpacity: 0.8,
  autoApplyPerDomain: true,
  shortcuts: {
    'toggle-maximize': 'Alt+Shift+M',
    'toggle-mask': 'Alt+Shift+D',
    'pop-out': 'Alt+Shift+P',
  },
};
```

- [ ] **Step 2: 写 `tests/unit/domain.test.ts` 失败测试**

```typescript
import { describe, it, expect } from 'vitest';
import { extractDomain } from '@shared/domain';

describe('extractDomain', () => {
  it('returns hostname for plain domain', () => {
    expect(extractDomain('https://example.com/foo')).toBe('example.com');
  });

  it('returns eTLD+1 for subdomain', () => {
    expect(extractDomain('https://www.youtube.com/watch?v=x')).toBe('youtube.com');
    expect(extractDomain('https://m.bilibili.com/video/x')).toBe('bilibili.com');
  });

  it('handles co.uk style TLD', () => {
    expect(extractDomain('https://www.bbc.co.uk/iplayer')).toBe('bbc.co.uk');
  });

  it('returns null for invalid URL', () => {
    expect(extractDomain('not a url')).toBe(null);
  });
});
```

- [ ] **Step 3: 运行测试，确认失败**

Run: `npm test -- domain`
Expected: FAIL — `Cannot find module '@shared/domain'`

- [ ] **Step 4: 实现 `src/shared/domain.ts`**

```typescript
// 简化版 eTLD+1 提取：识别常见的多级 TLD，否则退化到 host 的最后两段
const MULTI_LEVEL_TLDS = new Set([
  'co.uk', 'co.jp', 'co.kr', 'com.cn', 'com.au', 'com.br',
  'co.nz', 'co.in', 'org.uk', 'gov.uk', 'ac.uk',
]);

export function extractDomain(url: string): string | null {
  let host: string;
  try {
    host = new URL(url).hostname;
  } catch {
    return null;
  }
  const parts = host.split('.');
  if (parts.length < 2) return host;
  const lastTwo = parts.slice(-2).join('.');
  if (parts.length >= 3 && MULTI_LEVEL_TLDS.has(lastTwo)) {
    return parts.slice(-3).join('.');
  }
  return lastTwo;
}
```

- [ ] **Step 5: 运行测试，确认通过**

Run: `npm test -- domain`
Expected: PASS（4 个测试全过）

- [ ] **Step 6: Commit**

```bash
git add src/shared/types.ts src/shared/domain.ts tests/unit/domain.test.ts
git commit -m "feat(shared): add core types and domain extraction utility"
```

---

### Task 1.2：定义消息 schema

**Files:**
- Create: `src/shared/messages.ts`

- [ ] **Step 1: 创建 `src/shared/messages.ts`**

```typescript
import type { Settings } from './types';

export type ContentToBackground =
  | { type: 'request-settings' }
  | { type: 'save-domain-settings'; domain: string; settings: Partial<import('./types').DomainSettings> }
  | { type: 'open-standalone-window'; videoSrc: string }
  | { type: 'detected-video'; frameId: number; hasVideo: boolean };

export type BackgroundToContent =
  | { type: 'settings-changed'; settings: Settings }
  | { type: 'command'; command: import('./types').ActionId };

export type PopupToBackground =
  | { type: 'get-settings' }
  | { type: 'update-global'; settings: Partial<import('./types').GlobalSettings> }
  | { type: 'update-domain'; domain: string; settings: Partial<import('./types').DomainSettings> }
  | { type: 'list-detected-videos'; tabId: number };

export type AnyMessage = ContentToBackground | BackgroundToContent | PopupToBackground;
```

- [ ] **Step 2: Commit**

```bash
git add src/shared/messages.ts
git commit -m "feat(shared): define typed message schemas"
```

---

### Task 1.3：SettingsStore（Zustand + chrome.storage 同步）

**Files:**
- Create: `src/shared/store/SettingsStore.ts`
- Test: `tests/unit/SettingsStore.test.ts`

- [ ] **Step 1: 写失败测试 `tests/unit/SettingsStore.test.ts`**

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { createSettingsStore } from '@shared/store/SettingsStore';
import { DEFAULT_DOMAIN_SETTINGS, DEFAULT_GLOBAL_SETTINGS } from '@shared/types';

describe('SettingsStore', () => {
  let store: ReturnType<typeof createSettingsStore>;

  beforeEach(async () => {
    store = createSettingsStore();
    await store.getState().init();
  });

  it('initializes with defaults when storage is empty', () => {
    const state = store.getState();
    expect(state.global).toEqual(DEFAULT_GLOBAL_SETTINGS);
    expect(state.domains).toEqual({});
  });

  it('updates global settings and persists', async () => {
    await store.getState().updateGlobal({ defaultMaskOpacity: 0.5 });
    expect(store.getState().global.defaultMaskOpacity).toBe(0.5);
    const stored = await chrome.storage.local.get('settings');
    expect((stored.settings as any).global.defaultMaskOpacity).toBe(0.5);
  });

  it('upserts domain settings (merge with defaults)', async () => {
    await store.getState().updateDomain('youtube.com', { lastMaximize: true });
    const got = store.getState().domains['youtube.com'];
    expect(got).toEqual({ ...DEFAULT_DOMAIN_SETTINGS, lastMaximize: true });
  });

  it('returns existing domain settings merged with overrides', async () => {
    await store.getState().updateDomain('youtube.com', { lastMaximize: true, lastMaskOpacity: 0.6 });
    await store.getState().updateDomain('youtube.com', { lastMaximize: false });
    const got = store.getState().domains['youtube.com'];
    expect(got.lastMaximize).toBe(false);
    expect(got.lastMaskOpacity).toBe(0.6);
  });

  it('getDomain returns defaults for unknown domain', () => {
    const got = store.getState().getDomain('unknown.com');
    expect(got).toEqual(DEFAULT_DOMAIN_SETTINGS);
  });
});
```

- [ ] **Step 2: 运行测试，确认失败**

Run: `npm test -- SettingsStore`
Expected: FAIL — `Cannot find module '@shared/store/SettingsStore'`

- [ ] **Step 3: 实现 `src/shared/store/SettingsStore.ts`**

```typescript
import { createStore } from 'zustand/vanilla';
import {
  DEFAULT_DOMAIN_SETTINGS,
  DEFAULT_GLOBAL_SETTINGS,
  type DomainSettings,
  type GlobalSettings,
  type Settings,
} from '../types';

interface SettingsStoreState extends Settings {
  initialized: boolean;
  init: () => Promise<void>;
  updateGlobal: (patch: Partial<GlobalSettings>) => Promise<void>;
  updateDomain: (domain: string, patch: Partial<DomainSettings>) => Promise<void>;
  getDomain: (domain: string) => DomainSettings;
}

const STORAGE_KEY = 'settings';

export function createSettingsStore() {
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  return createStore<SettingsStoreState>((set, get) => ({
    global: DEFAULT_GLOBAL_SETTINGS,
    domains: {},
    initialized: false,

    init: async () => {
      const stored = await chrome.storage.local.get(STORAGE_KEY);
      const saved = stored[STORAGE_KEY] as Settings | undefined;
      set({
        global: { ...DEFAULT_GLOBAL_SETTINGS, ...saved?.global },
        domains: saved?.domains ?? {},
        initialized: true,
      });

      chrome.storage.onChanged.addListener((changes, area) => {
        if (area !== 'local' || !changes[STORAGE_KEY]) return;
        const next = changes[STORAGE_KEY].newValue as Settings | undefined;
        if (next) set({ global: next.global, domains: next.domains });
      });
    },

    updateGlobal: async (patch) => {
      set((s) => ({ global: { ...s.global, ...patch } }));
      schedulePersist(get);
    },

    updateDomain: async (domain, patch) => {
      set((s) => {
        const existing = s.domains[domain] ?? DEFAULT_DOMAIN_SETTINGS;
        return { domains: { ...s.domains, [domain]: { ...existing, ...patch } } };
      });
      schedulePersist(get);
    },

    getDomain: (domain) => get().domains[domain] ?? DEFAULT_DOMAIN_SETTINGS,
  }));

  function schedulePersist(getState: () => SettingsStoreState) {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      const { global, domains } = getState();
      void chrome.storage.local.set({ [STORAGE_KEY]: { global, domains } });
    }, 200);
  }
}

export type SettingsStore = ReturnType<typeof createSettingsStore>;
```

- [ ] **Step 4: 运行测试，确认通过**

Run: `npm test -- SettingsStore`
Expected: PASS（5 个测试全过）。注意：debounce 200ms 的持久化需要在测试中 `await new Promise(r => setTimeout(r, 250))`。如果测试失败因为时序，把测试里的 `expect((stored.settings as any).global.defaultMaskOpacity).toBe(0.5)` 前加 `await new Promise(r => setTimeout(r, 250))`。

- [ ] **Step 5: Commit**

```bash
git add src/shared/store/SettingsStore.ts tests/unit/SettingsStore.test.ts
git commit -m "feat(shared): add SettingsStore with chrome.storage sync"
```

---

## Phase 2：视频识别与控制

### Task 2.1：VideoDetector

**Files:**
- Create: `src/content/modules/VideoDetector.ts`
- Test: `tests/unit/VideoDetector.test.ts`

- [ ] **Step 1: 写失败测试**

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { VideoDetector } from '@content/modules/VideoDetector';

function mockVideo(opts: { width: number; height: number; played?: boolean; visible?: boolean }) {
  const v = document.createElement('video');
  Object.defineProperty(v, 'getBoundingClientRect', {
    value: () => ({
      width: opts.width,
      height: opts.height,
      top: 0,
      left: 0,
      right: opts.width,
      bottom: opts.height,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    }),
  });
  if (opts.played) Object.defineProperty(v, 'played', { value: { length: 1 } });
  if (opts.visible !== false) {
    Object.defineProperty(v, 'offsetParent', { value: document.body });
  } else {
    Object.defineProperty(v, 'offsetParent', { value: null });
  }
  document.body.appendChild(v);
  return v;
}

describe('VideoDetector', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    Object.defineProperty(window, 'innerWidth', { value: 1200, configurable: true });
    Object.defineProperty(window, 'innerHeight', { value: 800, configurable: true });
  });

  it('returns null when no video on page', () => {
    const detector = new VideoDetector();
    expect(detector.getTargetVideo()).toBe(null);
  });

  it('picks the only played video', () => {
    mockVideo({ width: 800, height: 450, played: true });
    const detector = new VideoDetector();
    expect(detector.getTargetVideo()).not.toBe(null);
  });

  it('ignores never-played video when others have been played', () => {
    mockVideo({ width: 1000, height: 500, played: false });
    const played = mockVideo({ width: 200, height: 100, played: true });
    const detector = new VideoDetector();
    expect(detector.getTargetVideo()).toBe(played);
  });

  it('among played videos, picks the one with largest visible area', () => {
    mockVideo({ width: 400, height: 300, played: true });
    const big = mockVideo({ width: 1000, height: 500, played: true });
    const detector = new VideoDetector();
    expect(detector.getTargetVideo()).toBe(big);
  });

  it('emits videochange when target changes', async () => {
    const detector = new VideoDetector();
    const handler = vi.fn();
    detector.on('videochange', handler);
    mockVideo({ width: 1000, height: 500, played: true });
    detector.rescan();
    expect(handler).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: 运行，确认失败**

Run: `npm test -- VideoDetector`
Expected: FAIL — 模块不存在

- [ ] **Step 3: 实现 `src/content/modules/VideoDetector.ts`**

```typescript
type Listener = () => void;

export class VideoDetector {
  private target: HTMLVideoElement | null = null;
  private listeners = new Map<'videochange', Set<Listener>>();
  private observer: MutationObserver | null = null;

  constructor() {
    this.rescan();
    this.observer = new MutationObserver(() => this.rescan());
    if (typeof document !== 'undefined') {
      this.observer.observe(document.documentElement, { childList: true, subtree: true });
    }
  }

  getTargetVideo(): HTMLVideoElement | null {
    return this.target;
  }

  rescan(): void {
    const all = this.collectAllVideos();
    const played = all.filter((v) => v.played.length > 0);
    const candidates = played.length > 0 ? played : [];
    const best = this.pickLargestVisible(candidates);
    if (best !== this.target) {
      this.target = best;
      this.emit('videochange');
    }
  }

  on(event: 'videochange', cb: Listener): void {
    const set = this.listeners.get(event) ?? new Set();
    set.add(cb);
    this.listeners.set(event, set);
  }

  off(event: 'videochange', cb: Listener): void {
    this.listeners.get(event)?.delete(cb);
  }

  destroy(): void {
    this.observer?.disconnect();
    this.listeners.clear();
  }

  private emit(event: 'videochange'): void {
    this.listeners.get(event)?.forEach((cb) => cb());
  }

  private collectAllVideos(): HTMLVideoElement[] {
    if (typeof document === 'undefined') return [];
    const out: HTMLVideoElement[] = [];
    const walk = (root: Document | ShadowRoot) => {
      out.push(...Array.from(root.querySelectorAll('video')));
      root.querySelectorAll('*').forEach((el) => {
        if (el.shadowRoot) walk(el.shadowRoot);
      });
    };
    walk(document);
    return out;
  }

  private pickLargestVisible(videos: HTMLVideoElement[]): HTMLVideoElement | null {
    let best: HTMLVideoElement | null = null;
    let bestArea = 0;
    for (const v of videos) {
      if (v.offsetParent === null) continue;
      const rect = v.getBoundingClientRect();
      const visW = Math.max(0, Math.min(rect.right, window.innerWidth) - Math.max(rect.left, 0));
      const visH = Math.max(0, Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0));
      const area = visW * visH;
      if (area > bestArea) {
        bestArea = area;
        best = v;
      }
    }
    return best;
  }
}
```

- [ ] **Step 4: 运行测试，确认通过**

Run: `npm test -- VideoDetector`
Expected: PASS（5 个测试全过）

- [ ] **Step 5: Commit**

```bash
git add src/content/modules/VideoDetector.ts tests/unit/VideoDetector.test.ts
git commit -m "feat(content): add VideoDetector with largest-played selection"
```

---

### Task 2.2：VideoController

**Files:**
- Create: `src/content/modules/VideoController.ts`
- Test: `tests/unit/VideoController.test.ts`

- [ ] **Step 1: 写失败测试**

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { VideoController } from '@content/modules/VideoController';

describe('VideoController', () => {
  let video: HTMLVideoElement;
  let parent: HTMLElement;

  beforeEach(() => {
    document.body.innerHTML = '';
    parent = document.createElement('div');
    parent.id = 'host';
    video = document.createElement('video');
    video.style.cssText = 'width: 640px; height: 360px; border: 1px solid red;';
    parent.appendChild(video);
    document.body.appendChild(parent);
  });

  it('attach captures original style and parent', () => {
    const ctrl = new VideoController(video);
    ctrl.attach();
    expect(ctrl.isAttached()).toBe(true);
  });

  it('detach restores original style and parent', () => {
    const ctrl = new VideoController(video);
    ctrl.attach();
    video.style.cssText = 'position: fixed; inset: 0;';
    ctrl.detach();
    expect(video.style.cssText).toBe('width: 640px; height: 360px; border: 1px solid red;');
    expect(video.parentElement).toBe(parent);
  });

  it('applyTransform sets transform and aspect ratio', () => {
    const ctrl = new VideoController(video);
    ctrl.attach();
    ctrl.applyTransform({ scaleX: 1.2, scaleY: 0.8, objectFit: 'cover' });
    expect(video.style.transform).toContain('scale(1.2, 0.8)');
    expect(video.style.objectFit).toBe('cover');
  });

  it('throws on applyTransform when not attached', () => {
    const ctrl = new VideoController(video);
    expect(() => ctrl.applyTransform({ scaleX: 1, scaleY: 1 })).toThrow();
  });

  it('detach is idempotent', () => {
    const ctrl = new VideoController(video);
    ctrl.attach();
    ctrl.detach();
    expect(() => ctrl.detach()).not.toThrow();
  });
});
```

- [ ] **Step 2: 运行，确认失败**

Run: `npm test -- VideoController`
Expected: FAIL — 模块不存在

- [ ] **Step 3: 实现 `src/content/modules/VideoController.ts`**

```typescript
export interface TransformInput {
  scaleX?: number;
  scaleY?: number;
  translateX?: number;
  translateY?: number;
  objectFit?: 'fill' | 'contain' | 'cover';
  position?: 'static' | 'fixed';
  zIndex?: number;
  width?: string;
  height?: string;
  top?: string;
  left?: string;
}

interface CapturedState {
  cssText: string;
  parent: Node | null;
  nextSibling: Node | null;
}

export class VideoController {
  private captured: CapturedState | null = null;

  constructor(private video: HTMLVideoElement) {}

  attach(): void {
    if (this.captured) return;
    this.captured = {
      cssText: this.video.style.cssText,
      parent: this.video.parentNode,
      nextSibling: this.video.nextSibling,
    };
  }

  detach(): void {
    if (!this.captured) return;
    this.video.style.cssText = this.captured.cssText;
    const { parent, nextSibling } = this.captured;
    if (parent && this.video.parentNode !== parent) {
      parent.insertBefore(this.video, nextSibling);
    }
    this.captured = null;
  }

  isAttached(): boolean {
    return this.captured !== null;
  }

  applyTransform(t: TransformInput): void {
    if (!this.captured) throw new Error('VideoController: applyTransform requires attach() first');
    const transforms: string[] = [];
    if (t.translateX != null || t.translateY != null) {
      transforms.push(`translate(${t.translateX ?? 0}px, ${t.translateY ?? 0}px)`);
    }
    if (t.scaleX != null || t.scaleY != null) {
      transforms.push(`scale(${t.scaleX ?? 1}, ${t.scaleY ?? 1})`);
    }
    if (transforms.length > 0) this.video.style.transform = transforms.join(' ');
    if (t.objectFit) this.video.style.objectFit = t.objectFit;
    if (t.position) this.video.style.position = t.position;
    if (t.zIndex != null) this.video.style.zIndex = String(t.zIndex);
    if (t.width) this.video.style.width = t.width;
    if (t.height) this.video.style.height = t.height;
    if (t.top) this.video.style.top = t.top;
    if (t.left) this.video.style.left = t.left;
  }

  getElement(): HTMLVideoElement {
    return this.video;
  }
}
```

- [ ] **Step 4: 运行测试，确认通过**

Run: `npm test -- VideoController`
Expected: PASS（5 个测试全过）

- [ ] **Step 5: Commit**

```bash
git add src/content/modules/VideoController.ts tests/unit/VideoController.test.ts
git commit -m "feat(content): add VideoController with attach/detach lifecycle"
```

---

## Phase 3：Engines

### Task 3.1：AspectEngine

**Files:**
- Create: `src/content/modules/AspectEngine.ts`
- Test: `tests/unit/AspectEngine.test.ts`

- [ ] **Step 1: 写失败测试**

```typescript
import { describe, it, expect } from 'vitest';
import { AspectEngine, parseAspectRatio } from '@content/modules/AspectEngine';

describe('parseAspectRatio', () => {
  it('parses preset 16:9', () => {
    expect(parseAspectRatio('16:9')).toEqual({ width: 16, height: 9 });
  });
  it('parses custom 2.39:1', () => {
    expect(parseAspectRatio('custom:2.39:1')).toEqual({ width: 2.39, height: 1 });
  });
  it('parses original as null', () => {
    expect(parseAspectRatio('original')).toBe(null);
  });
});

describe('AspectEngine.compute', () => {
  it('stretch: scaleX=1 scaleY=1 when target == source', () => {
    const out = AspectEngine.compute({ sourceW: 1920, sourceH: 1080, target: '16:9', mode: 'stretch' });
    expect(out).toEqual({ transform: { scaleX: 1, scaleY: 1 }, objectFit: 'fill' });
  });

  it('stretch: scale 16:9 source to 21:9 target', () => {
    const out = AspectEngine.compute({ sourceW: 1920, sourceH: 1080, target: '21:9', mode: 'stretch' });
    // 21/9 = 2.333..., 16/9 = 1.777...
    // scaleX = (21/9) / (16/9) = 21/16 = 1.3125
    expect(out.transform.scaleX).toBeCloseTo(1.3125, 4);
    expect(out.transform.scaleY).toBe(1);
    expect(out.objectFit).toBe('fill');
  });

  it('letterbox: object-fit contain, no scaling', () => {
    const out = AspectEngine.compute({ sourceW: 1920, sourceH: 1080, target: '4:3', mode: 'letterbox' });
    expect(out.objectFit).toBe('contain');
    expect(out.transform.scaleX).toBe(1);
    expect(out.transform.scaleY).toBe(1);
  });

  it('crop: object-fit cover', () => {
    const out = AspectEngine.compute({ sourceW: 1920, sourceH: 1080, target: '4:3', mode: 'crop' });
    expect(out.objectFit).toBe('cover');
  });

  it('original returns identity', () => {
    const out = AspectEngine.compute({ sourceW: 1920, sourceH: 1080, target: 'original', mode: 'stretch' });
    expect(out).toEqual({ transform: { scaleX: 1, scaleY: 1 }, objectFit: 'fill' });
  });
});
```

- [ ] **Step 2: 运行，确认失败**

Run: `npm test -- AspectEngine`
Expected: FAIL — 模块不存在

- [ ] **Step 3: 实现 `src/content/modules/AspectEngine.ts`**

```typescript
import type { AspectRatio, FitMode } from '@shared/types';

export interface AspectInput {
  sourceW: number;
  sourceH: number;
  target: AspectRatio;
  mode: FitMode;
}

export interface AspectOutput {
  transform: { scaleX: number; scaleY: number };
  objectFit: 'fill' | 'contain' | 'cover';
}

const PRESETS: Record<string, { width: number; height: number }> = {
  '16:9': { width: 16, height: 9 },
  '4:3': { width: 4, height: 3 },
  '21:9': { width: 21, height: 9 },
  '32:9': { width: 32, height: 9 },
  '1:1': { width: 1, height: 1 },
  '9:16': { width: 9, height: 16 },
};

export function parseAspectRatio(ratio: AspectRatio): { width: number; height: number } | null {
  if (ratio === 'original') return null;
  if (ratio.startsWith('custom:')) {
    const [w, h] = ratio.slice(7).split(':').map(Number);
    if (Number.isFinite(w) && Number.isFinite(h) && w > 0 && h > 0) {
      return { width: w, height: h };
    }
    return null;
  }
  return PRESETS[ratio] ?? null;
}

export class AspectEngine {
  static compute(input: AspectInput): AspectOutput {
    const parsed = parseAspectRatio(input.target);
    if (!parsed) {
      return { transform: { scaleX: 1, scaleY: 1 }, objectFit: 'fill' };
    }

    const targetRatio = parsed.width / parsed.height;
    const sourceRatio = input.sourceW / input.sourceH;

    if (input.mode === 'letterbox') {
      return { transform: { scaleX: 1, scaleY: 1 }, objectFit: 'contain' };
    }
    if (input.mode === 'crop') {
      return { transform: { scaleX: 1, scaleY: 1 }, objectFit: 'cover' };
    }
    // stretch
    const scaleX = targetRatio / sourceRatio;
    return { transform: { scaleX, scaleY: 1 }, objectFit: 'fill' };
  }
}
```

- [ ] **Step 4: 运行测试，确认通过**

Run: `npm test -- AspectEngine`
Expected: PASS（8 个测试全过）

- [ ] **Step 5: Commit**

```bash
git add src/content/modules/AspectEngine.ts tests/unit/AspectEngine.test.ts
git commit -m "feat(content): add AspectEngine with stretch/letterbox/crop modes"
```

---

### Task 3.2：MaximizeEngine

**Files:**
- Create: `src/content/modules/MaximizeEngine.ts`
- Test: `tests/unit/MaximizeEngine.test.ts`

- [ ] **Step 1: 写失败测试**

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { MaximizeEngine } from '@content/modules/MaximizeEngine';
import { VideoController } from '@content/modules/VideoController';

describe('MaximizeEngine', () => {
  let video: HTMLVideoElement;
  let ctrl: VideoController;

  beforeEach(() => {
    document.body.innerHTML = '';
    video = document.createElement('video');
    document.body.appendChild(video);
    ctrl = new VideoController(video);
    Object.defineProperty(window, 'innerWidth', { value: 1920, configurable: true });
    Object.defineProperty(window, 'innerHeight', { value: 1080, configurable: true });
  });

  it('maximize applies fixed positioning filling viewport', () => {
    const engine = new MaximizeEngine(ctrl);
    engine.maximize({ keepAspect: false });
    expect(video.style.position).toBe('fixed');
    expect(video.style.top).toBe('0px');
    expect(video.style.left).toBe('0px');
    expect(video.style.width).toBe('1920px');
    expect(video.style.height).toBe('1080px');
  });

  it('restore undoes maximize', () => {
    const engine = new MaximizeEngine(ctrl);
    engine.maximize({ keepAspect: false });
    engine.restore();
    expect(video.style.position).not.toBe('fixed');
  });

  it('setSize applies arbitrary dimensions', () => {
    const engine = new MaximizeEngine(ctrl);
    engine.maximize({ keepAspect: false });
    engine.setSize({ width: 800, height: 600, x: 100, y: 50 });
    expect(video.style.width).toBe('800px');
    expect(video.style.height).toBe('600px');
    expect(video.style.left).toBe('100px');
    expect(video.style.top).toBe('50px');
  });

  it('isMaximized reflects state', () => {
    const engine = new MaximizeEngine(ctrl);
    expect(engine.isMaximized()).toBe(false);
    engine.maximize({ keepAspect: false });
    expect(engine.isMaximized()).toBe(true);
    engine.restore();
    expect(engine.isMaximized()).toBe(false);
  });
});
```

- [ ] **Step 2: 运行，确认失败**

Run: `npm test -- MaximizeEngine`
Expected: FAIL

- [ ] **Step 3: 实现 `src/content/modules/MaximizeEngine.ts`**

```typescript
import type { VideoController } from './VideoController';

const HIGH_Z = 2147483646; // 比 Shadow DOM UI 低 1

export interface MaximizeOptions {
  keepAspect: boolean;
}

export interface Size {
  width: number;
  height: number;
  x: number;
  y: number;
}

export class MaximizeEngine {
  private maximized = false;

  constructor(private controller: VideoController) {}

  maximize(opts: MaximizeOptions): void {
    if (!this.controller.isAttached()) this.controller.attach();
    const targetW = window.innerWidth;
    const targetH = window.innerHeight;
    let width = targetW;
    let height = targetH;
    let x = 0;
    let y = 0;

    if (opts.keepAspect) {
      const video = this.controller.getElement();
      const sourceRatio = video.videoWidth / video.videoHeight || 16 / 9;
      const targetRatio = targetW / targetH;
      if (sourceRatio > targetRatio) {
        width = targetW;
        height = Math.round(targetW / sourceRatio);
        y = Math.round((targetH - height) / 2);
      } else {
        height = targetH;
        width = Math.round(targetH * sourceRatio);
        x = Math.round((targetW - width) / 2);
      }
    }

    this.controller.applyTransform({
      position: 'fixed',
      top: `${y}px`,
      left: `${x}px`,
      width: `${width}px`,
      height: `${height}px`,
      zIndex: HIGH_Z,
    });
    this.maximized = true;
    this.verifyFixedWorked(x, y);
  }

  setSize(size: Size): void {
    this.controller.applyTransform({
      position: 'fixed',
      top: `${size.y}px`,
      left: `${size.x}px`,
      width: `${size.width}px`,
      height: `${size.height}px`,
      zIndex: HIGH_Z,
    });
  }

  restore(): void {
    if (!this.maximized) return;
    this.controller.detach();
    this.maximized = false;
  }

  isMaximized(): boolean {
    return this.maximized;
  }

  private verifyFixedWorked(expectedX: number, expectedY: number): void {
    // 如果祖先元素有 transform，position:fixed 会失效。检测后 lift to body 兜底。
    const rect = this.controller.getElement().getBoundingClientRect();
    if (Math.abs(rect.left - expectedX) > 2 || Math.abs(rect.top - expectedY) > 2) {
      const video = this.controller.getElement();
      if (video.parentElement !== document.body) {
        document.body.appendChild(video);
      }
    }
  }
}
```

- [ ] **Step 4: 运行测试，确认通过**

Run: `npm test -- MaximizeEngine`
Expected: PASS（4 个测试全过）

- [ ] **Step 5: Commit**

```bash
git add src/content/modules/MaximizeEngine.ts tests/unit/MaximizeEngine.test.ts
git commit -m "feat(content): add MaximizeEngine with viewport fill and fallback"
```

---

### Task 3.3：MaskEngine

**Files:**
- Create: `src/content/modules/MaskEngine.ts`
- Test: `tests/unit/MaskEngine.test.ts`

- [ ] **Step 1: 写失败测试**

```typescript
import { describe, it, expect } from 'vitest';
import { MaskEngine } from '@content/modules/MaskEngine';

describe('MaskEngine.computeClipPath', () => {
  it('returns clip path that excludes video rect', () => {
    const out = MaskEngine.computeClipPath(
      { left: 100, top: 50, right: 900, bottom: 550 },
      { width: 1000, height: 600 },
    );
    // polygon walks viewport edge, into the hole, around, back out
    expect(out).toContain('polygon(');
    expect(out).toContain('0px 0px');
    expect(out).toContain('1000px 0px');
  });

  it('handles video at top-left corner', () => {
    const out = MaskEngine.computeClipPath(
      { left: 0, top: 0, right: 400, bottom: 300 },
      { width: 1000, height: 600 },
    );
    expect(out).toContain('polygon(');
  });

  it('clamps coords inside viewport', () => {
    const out = MaskEngine.computeClipPath(
      { left: -50, top: -50, right: 2000, bottom: 1000 },
      { width: 1000, height: 600 },
    );
    expect(out).not.toContain('-50px');
    expect(out).not.toContain('2000px');
  });
});

describe('MaskEngine.formatOpacityColor', () => {
  it('clamps opacity to 0-0.95', () => {
    expect(MaskEngine.formatOpacityColor(0.5)).toBe('rgba(0, 0, 0, 0.5)');
    expect(MaskEngine.formatOpacityColor(1.5)).toBe('rgba(0, 0, 0, 0.95)');
    expect(MaskEngine.formatOpacityColor(-0.1)).toBe('rgba(0, 0, 0, 0)');
  });
});
```

- [ ] **Step 2: 运行，确认失败**

Run: `npm test -- MaskEngine`
Expected: FAIL

- [ ] **Step 3: 实现 `src/content/modules/MaskEngine.ts`**

```typescript
export interface Rect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface Viewport {
  width: number;
  height: number;
}

export class MaskEngine {
  static computeClipPath(videoRect: Rect, viewport: Viewport): string {
    const l = Math.max(0, Math.min(videoRect.left, viewport.width));
    const t = Math.max(0, Math.min(videoRect.top, viewport.height));
    const r = Math.max(0, Math.min(videoRect.right, viewport.width));
    const b = Math.max(0, Math.min(videoRect.bottom, viewport.height));
    const w = viewport.width;
    const h = viewport.height;

    // 沿着外圈走，钻进 hole 再绕回来 —— 标准 clip-path 挖洞写法
    return [
      'polygon(',
      `0px 0px,`,
      `${w}px 0px,`,
      `${w}px ${h}px,`,
      `0px ${h}px,`,
      `0px 0px,`,
      `${l}px ${t}px,`,
      `${l}px ${b}px,`,
      `${r}px ${b}px,`,
      `${r}px ${t}px,`,
      `${l}px ${t}px`,
      ')',
    ].join(' ');
  }

  static formatOpacityColor(opacity: number): string {
    const clamped = Math.max(0, Math.min(0.95, opacity));
    return `rgba(0, 0, 0, ${clamped})`;
  }
}
```

- [ ] **Step 4: 运行测试，确认通过**

Run: `npm test -- MaskEngine`
Expected: PASS（4 个测试全过）

- [ ] **Step 5: Commit**

```bash
git add src/content/modules/MaskEngine.ts tests/unit/MaskEngine.test.ts
git commit -m "feat(content): add MaskEngine with clip-path hole computation"
```

---

### Task 3.4：PopOutEngine

**Files:**
- Create: `src/content/modules/PopOutEngine.ts`
- Test: `tests/unit/PopOutEngine.test.ts`

- [ ] **Step 1: 写失败测试**

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PopOutEngine } from '@content/modules/PopOutEngine';

describe('PopOutEngine', () => {
  let video: HTMLVideoElement;

  beforeEach(() => {
    document.body.innerHTML = '';
    video = document.createElement('video');
    document.body.appendChild(video);
  });

  it('prefers Document PiP when available', async () => {
    const requestWindow = vi.fn(async () => ({
      document: document.implementation.createHTMLDocument(),
      addEventListener: vi.fn(),
    }));
    (globalThis as any).documentPictureInPicture = { requestWindow };
    const engine = new PopOutEngine(video);

    const result = await engine.popOut();
    expect(result.strategy).toBe('document-pip');
    expect(requestWindow).toHaveBeenCalled();

    delete (globalThis as any).documentPictureInPicture;
  });

  it('falls back to native PiP when Document PiP unavailable', async () => {
    delete (globalThis as any).documentPictureInPicture;
    video.requestPictureInPicture = vi.fn(async () => ({} as PictureInPictureWindow));
    const engine = new PopOutEngine(video);

    const result = await engine.popOut();
    expect(result.strategy).toBe('native-pip');
    expect(video.requestPictureInPicture).toHaveBeenCalled();
  });

  it('openStandaloneWindow sends message to background', async () => {
    Object.defineProperty(video, 'currentSrc', { value: 'https://example.com/video.mp4', configurable: true });
    const engine = new PopOutEngine(video);

    await engine.openStandaloneWindow();
    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
      type: 'open-standalone-window',
      videoSrc: 'https://example.com/video.mp4',
    });
  });

  it('openStandaloneWindow throws when video src is blob/MSE', async () => {
    Object.defineProperty(video, 'currentSrc', { value: 'blob:https://example.com/abc', configurable: true });
    const engine = new PopOutEngine(video);

    await expect(engine.openStandaloneWindow()).rejects.toThrow(/MSE/i);
  });
});
```

- [ ] **Step 2: 运行，确认失败**

Run: `npm test -- PopOutEngine`
Expected: FAIL

- [ ] **Step 3: 实现 `src/content/modules/PopOutEngine.ts`**

```typescript
export type PopOutStrategy = 'document-pip' | 'native-pip' | 'standalone-window';

export interface PopOutResult {
  strategy: PopOutStrategy;
}

interface DocumentPictureInPicture {
  requestWindow(options?: { width?: number; height?: number }): Promise<Window>;
}

declare global {
  // eslint-disable-next-line vars-on-top, no-var
  var documentPictureInPicture: DocumentPictureInPicture | undefined;
}

export class PopOutEngine {
  constructor(private video: HTMLVideoElement) {}

  async popOut(): Promise<PopOutResult> {
    if (typeof documentPictureInPicture !== 'undefined') {
      try {
        const win = await documentPictureInPicture.requestWindow({ width: 640, height: 360 });
        // 把 video 元素移到 PiP 窗口
        const clonedVideo = win.document.body.appendChild(this.video.cloneNode(true)) as HTMLVideoElement;
        clonedVideo.autoplay = true;
        return { strategy: 'document-pip' };
      } catch {
        // fall through to native PiP
      }
    }

    if (this.video.requestPictureInPicture) {
      await this.video.requestPictureInPicture();
      return { strategy: 'native-pip' };
    }

    throw new Error('No Pop Out method available');
  }

  async openStandaloneWindow(): Promise<PopOutResult> {
    const src = this.video.currentSrc;
    if (!src || src.startsWith('blob:')) {
      throw new Error('Cannot open standalone window for MSE/blob video sources');
    }
    await chrome.runtime.sendMessage({ type: 'open-standalone-window', videoSrc: src });
    return { strategy: 'standalone-window' };
  }
}
```

- [ ] **Step 4: 运行测试，确认通过**

Run: `npm test -- PopOutEngine`
Expected: PASS（4 个测试全过）

- [ ] **Step 5: Commit**

```bash
git add src/content/modules/PopOutEngine.ts tests/unit/PopOutEngine.test.ts
git commit -m "feat(content): add PopOutEngine with Doc PiP -> Native PiP fallback"
```

---

## Phase 4：UI 层（Shadow DOM + React 组件）

### Task 4.1：Shadow DOM 挂载与 Tailwind 注入

**Files:**
- Create: `src/content/shadow-mount.ts`

- [ ] **Step 1: 创建 `src/content/shadow-mount.ts`**

```typescript
import tailwindCss from '@/styles/globals.css?inline';

export interface MountResult {
  host: HTMLDivElement;
  shadowRoot: ShadowRoot;
  portalContainer: HTMLDivElement;
}

export function mountShadowRoot(): MountResult {
  const host = document.createElement('div');
  host.id = 'video-resize-root';
  host.style.cssText = 'all: initial; position: fixed; top: 0; left: 0; z-index: 2147483647; pointer-events: none;';
  document.documentElement.appendChild(host);

  const shadowRoot = host.attachShadow({ mode: 'closed' });

  const style = document.createElement('style');
  style.textContent = tailwindCss;
  shadowRoot.appendChild(style);

  const reactMount = document.createElement('div');
  reactMount.id = 'react-mount';
  reactMount.style.pointerEvents = 'auto';
  shadowRoot.appendChild(reactMount);

  const portalContainer = document.createElement('div');
  portalContainer.id = 'portal-container';
  portalContainer.style.pointerEvents = 'auto';
  shadowRoot.appendChild(portalContainer);

  return { host, shadowRoot, portalContainer: portalContainer as HTMLDivElement };
}
```

注意：`?inline` 是 Vite 的内联文件 import 语法，把 CSS 文件当作字符串导入。

- [ ] **Step 2: Commit**

```bash
git add src/content/shadow-mount.ts
git commit -m "feat(content): add Shadow DOM mount with inlined Tailwind CSS"
```

---

### Task 4.2：FloatingToolbar 组件

**Files:**
- Create: `src/content/components/FloatingToolbar.tsx`
- Test: `tests/unit/FloatingToolbar.test.tsx`

- [ ] **Step 1: 写失败测试**

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FloatingToolbar } from '@content/components/FloatingToolbar';

describe('FloatingToolbar', () => {
  it('renders four action buttons', () => {
    render(
      <FloatingToolbar
        isMaximized={false}
        isMaskOn={false}
        onToggleMaximize={() => {}}
        onToggleMask={() => {}}
        onPopOut={() => {}}
        onOpenSettings={() => {}}
      />,
    );
    expect(screen.getByLabelText('Toggle Maximize')).toBeInTheDocument();
    expect(screen.getByLabelText('Toggle Mask')).toBeInTheDocument();
    expect(screen.getByLabelText('Pop Out')).toBeInTheDocument();
    expect(screen.getByLabelText('Settings')).toBeInTheDocument();
  });

  it('triggers callback when Maximize clicked', () => {
    const onToggle = vi.fn();
    render(
      <FloatingToolbar
        isMaximized={false}
        isMaskOn={false}
        onToggleMaximize={onToggle}
        onToggleMask={() => {}}
        onPopOut={() => {}}
        onOpenSettings={() => {}}
      />,
    );
    fireEvent.click(screen.getByLabelText('Toggle Maximize'));
    expect(onToggle).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: 运行，确认失败**

Run: `npm test -- FloatingToolbar`
Expected: FAIL

- [ ] **Step 3: 实现 `src/content/components/FloatingToolbar.tsx`**

```typescript
interface FloatingToolbarProps {
  isMaximized: boolean;
  isMaskOn: boolean;
  onToggleMaximize: () => void;
  onToggleMask: () => void;
  onPopOut: () => void;
  onOpenSettings: () => void;
}

export function FloatingToolbar(props: FloatingToolbarProps) {
  return (
    <div
      className="fixed top-4 right-4 flex gap-1 p-1.5 rounded-lg bg-background/90 backdrop-blur border border-border shadow-lg"
      role="toolbar"
      aria-label="VideoResize controls"
    >
      <ToolButton
        active={props.isMaximized}
        label="Toggle Maximize"
        onClick={props.onToggleMaximize}
        icon="⛶"
      />
      <ToolButton
        active={props.isMaskOn}
        label="Toggle Mask"
        onClick={props.onToggleMask}
        icon="◐"
      />
      <ToolButton active={false} label="Pop Out" onClick={props.onPopOut} icon="⤢" />
      <ToolButton active={false} label="Settings" onClick={props.onOpenSettings} icon="⚙" />
    </div>
  );
}

function ToolButton({
  active,
  label,
  onClick,
  icon,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  icon: string;
}) {
  return (
    <button
      aria-label={label}
      onClick={onClick}
      className={`w-9 h-9 rounded-md text-sm flex items-center justify-center transition-colors ${
        active ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50 text-foreground'
      }`}
    >
      <span aria-hidden>{icon}</span>
    </button>
  );
}
```

- [ ] **Step 4: 运行测试，确认通过**

Run: `npm test -- FloatingToolbar`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/content/components/FloatingToolbar.tsx tests/unit/FloatingToolbar.test.tsx
git commit -m "feat(content): add FloatingToolbar component"
```

---

### Task 4.3：SettingsPanel 组件

**Files:**
- Create: `src/content/components/SettingsPanel.tsx`
- Test: `tests/unit/SettingsPanel.test.tsx`

- [ ] **Step 1: 写失败测试**

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SettingsPanel } from '@content/components/SettingsPanel';

describe('SettingsPanel', () => {
  const defaultProps = {
    open: true,
    onClose: vi.fn(),
    aspectRatio: '16:9' as const,
    onAspectRatioChange: vi.fn(),
    fitMode: 'letterbox' as const,
    onFitModeChange: vi.fn(),
    maskOpacity: 0.8,
    onMaskOpacityChange: vi.fn(),
    onOpenInWindow: vi.fn(),
  };

  it('renders 7 aspect ratio preset buttons', () => {
    render(<SettingsPanel {...defaultProps} />);
    ['16:9', '4:3', '21:9', '32:9', '1:1', '9:16', 'original'].forEach((r) => {
      expect(screen.getByRole('button', { name: r })).toBeInTheDocument();
    });
  });

  it('calls onAspectRatioChange when preset clicked', () => {
    const onChange = vi.fn();
    render(<SettingsPanel {...defaultProps} onAspectRatioChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: '21:9' }));
    expect(onChange).toHaveBeenCalledWith('21:9');
  });

  it('renders three fit mode toggles', () => {
    render(<SettingsPanel {...defaultProps} />);
    expect(screen.getByRole('radio', { name: /stretch/i })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /letterbox/i })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /crop/i })).toBeInTheDocument();
  });

  it('renders "Open in new window" button', () => {
    render(<SettingsPanel {...defaultProps} />);
    expect(screen.getByRole('button', { name: /open in new window/i })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: 运行，确认失败**

Run: `npm test -- SettingsPanel`
Expected: FAIL

- [ ] **Step 3: 实现 `src/content/components/SettingsPanel.tsx`**

```typescript
import type { AspectRatio, FitMode } from '@shared/types';

interface SettingsPanelProps {
  open: boolean;
  onClose: () => void;
  aspectRatio: AspectRatio;
  onAspectRatioChange: (r: AspectRatio) => void;
  fitMode: FitMode;
  onFitModeChange: (m: FitMode) => void;
  maskOpacity: number;
  onMaskOpacityChange: (v: number) => void;
  onOpenInWindow: () => void;
}

const PRESETS: AspectRatio[] = ['16:9', '4:3', '21:9', '32:9', '1:1', '9:16', 'original'];

export function SettingsPanel(props: SettingsPanelProps) {
  if (!props.open) return null;
  return (
    <div className="fixed top-0 right-0 bottom-0 w-80 bg-background border-l border-border shadow-2xl p-4 flex flex-col gap-6 overflow-y-auto">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">VideoResize</h2>
        <button onClick={props.onClose} aria-label="Close" className="hover:bg-accent rounded p-1">
          ×
        </button>
      </div>

      <section>
        <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Aspect Ratio</h3>
        <div className="grid grid-cols-3 gap-2">
          {PRESETS.map((r) => (
            <button
              key={r}
              onClick={() => props.onAspectRatioChange(r)}
              className={`px-2 py-1.5 rounded text-xs ${
                props.aspectRatio === r ? 'bg-foreground text-background' : 'bg-accent text-foreground'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </section>

      <section>
        <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Fit Mode</h3>
        <div role="radiogroup" className="flex gap-2">
          {(['stretch', 'letterbox', 'crop'] as FitMode[]).map((m) => (
            <label key={m} className="flex-1 cursor-pointer">
              <input
                type="radio"
                name="fit"
                value={m}
                checked={props.fitMode === m}
                onChange={() => props.onFitModeChange(m)}
                className="sr-only"
              />
              <span
                className={`block text-center py-1.5 rounded text-xs ${
                  props.fitMode === m ? 'bg-foreground text-background' : 'bg-accent'
                }`}
              >
                {m}
              </span>
            </label>
          ))}
        </div>
      </section>

      <section>
        <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
          Mask Opacity: {Math.round(props.maskOpacity * 100)}%
        </h3>
        <input
          type="range"
          min={0}
          max={95}
          value={props.maskOpacity * 100}
          onChange={(e) => props.onMaskOpacityChange(Number(e.target.value) / 100)}
          className="w-full"
          aria-label="Mask opacity"
        />
      </section>

      <section>
        <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Pop Out</h3>
        <button
          onClick={props.onOpenInWindow}
          className="w-full px-3 py-2 rounded bg-foreground text-background text-sm"
        >
          Open in new window
        </button>
      </section>
    </div>
  );
}
```

- [ ] **Step 4: 运行测试，确认通过**

Run: `npm test -- SettingsPanel`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/content/components/SettingsPanel.tsx tests/unit/SettingsPanel.test.tsx
git commit -m "feat(content): add SettingsPanel component"
```

---

### Task 4.4：DragHandles 组件

**Files:**
- Create: `src/content/components/DragHandles.tsx`

- [ ] **Step 1: 实现 `src/content/components/DragHandles.tsx`**

由于拖动手柄主要靠 mouse 事件，复杂的几何在 MaximizeEngine 已经处理。组件保持薄。

```typescript
import { useEffect, useRef, useState } from 'react';

export type HandlePosition = 'tl' | 't' | 'tr' | 'r' | 'br' | 'b' | 'bl' | 'l' | 'move';

export interface DragEvent {
  handle: HandlePosition;
  dx: number;
  dy: number;
  isFirst: boolean;
  isLast: boolean;
}

interface DragHandlesProps {
  rect: { x: number; y: number; width: number; height: number };
  onDrag: (e: DragEvent) => void;
}

export function DragHandles({ rect, onDrag }: DragHandlesProps) {
  const startRef = useRef<{ x: number; y: number; handle: HandlePosition } | null>(null);

  const handleDown = (handle: HandlePosition) => (e: React.PointerEvent) => {
    e.stopPropagation();
    startRef.current = { x: e.clientX, y: e.clientY, handle };
    onDrag({ handle, dx: 0, dy: 0, isFirst: true, isLast: false });
    (e.target as Element).setPointerCapture(e.pointerId);
  };

  useEffect(() => {
    function onMove(e: PointerEvent) {
      if (!startRef.current) return;
      onDrag({
        handle: startRef.current.handle,
        dx: e.clientX - startRef.current.x,
        dy: e.clientY - startRef.current.y,
        isFirst: false,
        isLast: false,
      });
    }
    function onUp(e: PointerEvent) {
      if (!startRef.current) return;
      onDrag({
        handle: startRef.current.handle,
        dx: e.clientX - startRef.current.x,
        dy: e.clientY - startRef.current.y,
        isFirst: false,
        isLast: true,
      });
      startRef.current = null;
    }
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [onDrag]);

  const handleStyle = 'absolute bg-foreground border-2 border-background rounded-sm';
  const size = 12;

  return (
    <div
      className="fixed pointer-events-none"
      style={{ left: rect.x, top: rect.y, width: rect.width, height: rect.height }}
    >
      {/* 移动整个 video */}
      <div
        className="absolute inset-0 cursor-move pointer-events-auto"
        onPointerDown={handleDown('move')}
      />
      {/* 8 handles */}
      {(['tl', 't', 'tr', 'r', 'br', 'b', 'bl', 'l'] as HandlePosition[]).map((h) => (
        <div
          key={h}
          className={`${handleStyle} pointer-events-auto`}
          style={handlePositionStyle(h, size)}
          onPointerDown={handleDown(h)}
        />
      ))}
    </div>
  );
}

function handlePositionStyle(h: HandlePosition, size: number): React.CSSProperties {
  const half = -size / 2;
  const styles: Record<string, React.CSSProperties> = {
    tl: { left: half, top: half, width: size, height: size, cursor: 'nwse-resize' },
    t: { left: '50%', top: half, marginLeft: half, width: size, height: size, cursor: 'ns-resize' },
    tr: { right: half, top: half, width: size, height: size, cursor: 'nesw-resize' },
    r: { right: half, top: '50%', marginTop: half, width: size, height: size, cursor: 'ew-resize' },
    br: { right: half, bottom: half, width: size, height: size, cursor: 'nwse-resize' },
    b: { left: '50%', bottom: half, marginLeft: half, width: size, height: size, cursor: 'ns-resize' },
    bl: { left: half, bottom: half, width: size, height: size, cursor: 'nesw-resize' },
    l: { left: half, top: '50%', marginTop: half, width: size, height: size, cursor: 'ew-resize' },
  };
  return styles[h];
}
```

- [ ] **Step 2: Commit**

```bash
git add src/content/components/DragHandles.tsx
git commit -m "feat(content): add DragHandles component for free resize/move"
```

---

### Task 4.5：Toast 组件 + App 集成

**Files:**
- Create: `src/content/components/Toast.tsx`
- Create: `src/content/components/App.tsx`

- [ ] **Step 1: 实现 `src/content/components/Toast.tsx`**

```typescript
import { useEffect } from 'react';

interface ToastProps {
  message: string | null;
  onClose: () => void;
  durationMs?: number;
}

export function Toast({ message, onClose, durationMs = 2000 }: ToastProps) {
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(onClose, durationMs);
    return () => clearTimeout(t);
  }, [message, durationMs, onClose]);

  if (!message) return null;
  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-background border border-border rounded-md px-4 py-2 shadow-lg text-sm">
      {message}
    </div>
  );
}
```

- [ ] **Step 2: 实现 `src/content/components/App.tsx`**

```typescript
import { useEffect, useState, useMemo } from 'react';
import { createSettingsStore } from '@shared/store/SettingsStore';
import { extractDomain } from '@shared/domain';
import type { AspectRatio, FitMode } from '@shared/types';
import { VideoDetector } from '../modules/VideoDetector';
import { VideoController } from '../modules/VideoController';
import { MaximizeEngine } from '../modules/MaximizeEngine';
import { AspectEngine } from '../modules/AspectEngine';
import { MaskEngine } from '../modules/MaskEngine';
import { PopOutEngine } from '../modules/PopOutEngine';
import { FloatingToolbar } from './FloatingToolbar';
import { SettingsPanel } from './SettingsPanel';
import { Toast } from './Toast';

export function App() {
  const [video, setVideo] = useState<HTMLVideoElement | null>(null);
  const [maximized, setMaximized] = useState(false);
  const [maskOn, setMaskOn] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('original');
  const [fitMode, setFitMode] = useState<FitMode>('letterbox');
  const [maskOpacity, setMaskOpacity] = useState(0.8);
  const [toast, setToast] = useState<string | null>(null);

  const store = useMemo(() => createSettingsStore(), []);

  // 视频识别
  useEffect(() => {
    const detector = new VideoDetector();
    const update = () => setVideo(detector.getTargetVideo());
    update();
    detector.on('videochange', update);
    return () => detector.destroy();
  }, []);

  // 加载 per-domain 设置
  useEffect(() => {
    void store.getState().init().then(() => {
      const domain = extractDomain(location.href);
      if (!domain) return;
      const ds = store.getState().getDomain(domain);
      if (ds.lastAspectRatio) setAspectRatio(ds.lastAspectRatio);
      setFitMode(ds.lastFitMode);
      setMaskOpacity(ds.lastMaskOpacity);
      if (ds.enabledOnSiteLoad && ds.lastMaximize) {
        // 触发一次最大化
        setTimeout(() => setMaximized(true), 300);
      }
    });
  }, [store]);

  // 应用 maximize
  useEffect(() => {
    if (!video) return;
    const ctrl = new VideoController(video);
    const engine = new MaximizeEngine(ctrl);
    if (maximized) {
      engine.maximize({ keepAspect: fitMode === 'letterbox' });
    } else {
      engine.restore();
    }
    return () => {
      if (engine.isMaximized()) engine.restore();
    };
  }, [video, maximized, fitMode]);

  // 应用 aspect ratio
  useEffect(() => {
    if (!video) return;
    if (!video.videoWidth) return;
    const out = AspectEngine.compute({
      sourceW: video.videoWidth,
      sourceH: video.videoHeight,
      target: aspectRatio,
      mode: fitMode,
    });
    video.style.transform = `scale(${out.transform.scaleX}, ${out.transform.scaleY})`;
    video.style.objectFit = out.objectFit;
  }, [video, aspectRatio, fitMode]);

  // 持久化变更
  useEffect(() => {
    const domain = extractDomain(location.href);
    if (!domain) return;
    void store.getState().updateDomain(domain, {
      lastMaximize: maximized,
      lastAspectRatio: aspectRatio,
      lastFitMode: fitMode,
      lastMaskOpacity: maskOpacity,
    });
  }, [maximized, aspectRatio, fitMode, maskOpacity, store]);

  // Mask
  const maskClipPath = useMemo(() => {
    if (!maskOn || !video) return null;
    const rect = video.getBoundingClientRect();
    return MaskEngine.computeClipPath(
      { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom },
      { width: window.innerWidth, height: window.innerHeight },
    );
  }, [maskOn, video, maximized]);

  const handlePopOut = async () => {
    if (!video) return;
    try {
      const engine = new PopOutEngine(video);
      const result = await engine.popOut();
      setToast(`Popped out via ${result.strategy}`);
    } catch (e) {
      setToast(`Pop out failed: ${(e as Error).message}`);
    }
  };

  const handleOpenInWindow = async () => {
    if (!video) return;
    try {
      const engine = new PopOutEngine(video);
      await engine.openStandaloneWindow();
      setToast('Opening in new window...');
    } catch (e) {
      setToast(`Cannot open: ${(e as Error).message}`);
    }
  };

  if (!video) return null;

  return (
    <>
      {maskClipPath && (
        <div
          className="fixed inset-0"
          style={{
            background: MaskEngine.formatOpacityColor(maskOpacity),
            clipPath: maskClipPath,
            pointerEvents: 'none',
            zIndex: 2147483646,
          }}
        />
      )}
      <FloatingToolbar
        isMaximized={maximized}
        isMaskOn={maskOn}
        onToggleMaximize={() => setMaximized((v) => !v)}
        onToggleMask={() => setMaskOn((v) => !v)}
        onPopOut={handlePopOut}
        onOpenSettings={() => setSettingsOpen(true)}
      />
      <SettingsPanel
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        aspectRatio={aspectRatio}
        onAspectRatioChange={setAspectRatio}
        fitMode={fitMode}
        onFitModeChange={setFitMode}
        maskOpacity={maskOpacity}
        onMaskOpacityChange={setMaskOpacity}
        onOpenInWindow={handleOpenInWindow}
      />
      <Toast message={toast} onClose={() => setToast(null)} />
    </>
  );
}
```

- [ ] **Step 3: 更新 `src/content/index.tsx`**

```typescript
import React from 'react';
import { createRoot } from 'react-dom/client';
import { mountShadowRoot } from './shadow-mount';
import { App } from './components/App';

const { shadowRoot } = mountShadowRoot();
const mount = shadowRoot.querySelector('#react-mount') as HTMLElement;
createRoot(mount).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
```

- [ ] **Step 4: 构建验证**

Run: `npm run build && npm run typecheck`
Expected: 无 TypeScript 错误，构建成功

- [ ] **Step 5: Commit**

```bash
git add src/content/components/Toast.tsx src/content/components/App.tsx src/content/index.tsx
git commit -m "feat(content): wire all modules into App with Shadow DOM mount"
```

---

### Task 4.6：Esc 恢复、自由拖动模式、原生全屏

补 spec §2.1 的 Free Scaling / Free Positioning / Native Fullscreen 以及 §5.3 的 Esc 恢复。

**Files:**
- Modify: `src/content/components/App.tsx`
- Modify: `src/content/components/SettingsPanel.tsx`

- [ ] **Step 1: 在 `SettingsPanel.tsx` 增加两个新 prop 和 UI**

在 `SettingsPanelProps` 接口加入：

```typescript
  freeMode: boolean;
  onFreeModeToggle: (on: boolean) => void;
  onNativeFullscreen: () => void;
```

在 `Pop Out` section 上方插入：

```tsx
      <section>
        <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Free Mode</h3>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={props.freeMode}
            onChange={(e) => props.onFreeModeToggle(e.target.checked)}
          />
          <span>显示拖动手柄（任意缩放和移动）</span>
        </label>
        <button
          onClick={props.onNativeFullscreen}
          className="mt-3 w-full px-3 py-2 rounded bg-accent text-foreground text-sm"
        >
          进入原生全屏
        </button>
      </section>
```

- [ ] **Step 2: 在 `App.tsx` 增加 `freeMode` 状态和拖动事件处理**

在 App 函数体内已有 useState 后加入：

```typescript
  const [freeMode, setFreeMode] = useState(false);
  const [freeRect, setFreeRect] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
```

在 video 变化或 maximized 变化时初始化 freeRect：

```typescript
  useEffect(() => {
    if (!video || !maximized) {
      setFreeRect(null);
      return;
    }
    const rect = video.getBoundingClientRect();
    setFreeRect({ x: rect.left, y: rect.top, width: rect.width, height: rect.height });
  }, [video, maximized]);
```

把 setSize 写成 useCallback：

```typescript
  const handleDrag = useCallback(
    (e: { handle: string; dx: number; dy: number; isFirst: boolean; isLast: boolean }) => {
      if (!video || !freeRect) return;
      const next = { ...freeRect };
      switch (e.handle) {
        case 'move':
          next.x = freeRect.x + e.dx;
          next.y = freeRect.y + e.dy;
          break;
        case 'r':
          next.width = Math.max(100, freeRect.width + e.dx);
          break;
        case 'l':
          next.x = freeRect.x + e.dx;
          next.width = Math.max(100, freeRect.width - e.dx);
          break;
        case 'b':
          next.height = Math.max(60, freeRect.height + e.dy);
          break;
        case 't':
          next.y = freeRect.y + e.dy;
          next.height = Math.max(60, freeRect.height - e.dy);
          break;
        case 'br':
          next.width = Math.max(100, freeRect.width + e.dx);
          next.height = Math.max(60, freeRect.height + e.dy);
          break;
        case 'bl':
          next.x = freeRect.x + e.dx;
          next.width = Math.max(100, freeRect.width - e.dx);
          next.height = Math.max(60, freeRect.height + e.dy);
          break;
        case 'tr':
          next.y = freeRect.y + e.dy;
          next.width = Math.max(100, freeRect.width + e.dx);
          next.height = Math.max(60, freeRect.height - e.dy);
          break;
        case 'tl':
          next.x = freeRect.x + e.dx;
          next.y = freeRect.y + e.dy;
          next.width = Math.max(100, freeRect.width - e.dx);
          next.height = Math.max(60, freeRect.height - e.dy);
          break;
      }
      if (e.isLast) setFreeRect(next);
      // 实时更新视频位置
      const ctrl = new VideoController(video);
      ctrl.attach();
      const engine = new MaximizeEngine(ctrl);
      engine.setSize(next);
    },
    [video, freeRect],
  );

  const handleNativeFullscreen = useCallback(() => {
    if (!video) return;
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      void video.requestFullscreen();
    }
  }, [video]);
```

加 Esc 键监听：

```typescript
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (maximized) setMaximized(false);
      else if (maskOn) setMaskOn(false);
      else if (settingsOpen) setSettingsOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [maximized, maskOn, settingsOpen]);
```

在 import 块加入：

```typescript
import { DragHandles } from './DragHandles';
```

在 JSX 输出里，在 `<FloatingToolbar />` 之前加入：

```tsx
      {freeMode && maximized && freeRect && (
        <DragHandles rect={freeRect} onDrag={handleDrag} />
      )}
```

在 `<SettingsPanel>` 的 props 加入：

```tsx
        freeMode={freeMode}
        onFreeModeToggle={setFreeMode}
        onNativeFullscreen={handleNativeFullscreen}
```

- [ ] **Step 3: 类型检查 + 测试通过**

Run: `npm run typecheck && npm test`
Expected: 全过

- [ ] **Step 4: 构建并手动验证**

Run: `npm run build`
在 Chrome 加载 dist：
1. 打开 Task 6.1 的 fixture 测试页
2. 点击播放视频
3. 工具栏 → 最大化
4. 工具栏 → ⚙ 设置 → 勾选 "显示拖动手柄"
5. 拖动手柄，应能任意调整大小和位置
6. 按 Esc → 退出最大化
7. 设置面板 → "进入原生全屏" → 视频进入全屏

- [ ] **Step 5: Commit**

```bash
git add src/content/components/App.tsx src/content/components/SettingsPanel.tsx
git commit -m "feat(content): add Esc restore, free drag mode, native fullscreen"
```

---

## Phase 5：Service Worker 与 Popup

### Task 5.1：Service Worker

**Files:**
- Modify: `src/background/service-worker.ts`

- [ ] **Step 1: 替换 `src/background/service-worker.ts`**

```typescript
import type { ContentToBackground, PopupToBackground } from '@shared/messages';
import type { ActionId } from '@shared/types';

chrome.runtime.onMessage.addListener(
  (message: ContentToBackground | PopupToBackground, sender, sendResponse) => {
    handleMessage(message, sender)
      .then((result) => sendResponse(result))
      .catch((err: Error) => sendResponse({ error: err.message }));
    return true; // 异步响应
  },
);

async function handleMessage(
  message: ContentToBackground | PopupToBackground,
  _sender: chrome.runtime.MessageSender,
): Promise<unknown> {
  switch (message.type) {
    case 'open-standalone-window':
      await chrome.windows.create({
        url: message.videoSrc,
        type: 'popup',
        width: 800,
        height: 450,
      });
      return { ok: true };
    case 'request-settings':
    case 'get-settings': {
      const stored = await chrome.storage.local.get('settings');
      return stored.settings ?? null;
    }
    default:
      return null;
  }
}

chrome.commands.onCommand.addListener((command) => {
  const actionId = command as ActionId;
  void broadcastCommand(actionId);
});

async function broadcastCommand(command: ActionId): Promise<void> {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  for (const tab of tabs) {
    if (tab.id == null) continue;
    try {
      await chrome.tabs.sendMessage(tab.id, { type: 'command', command });
    } catch {
      // tab 没注入 content script，忽略
    }
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/background/service-worker.ts
git commit -m "feat(background): implement service worker with commands and message handlers"
```

---

### Task 5.2：扩展 App 监听快捷键 commands

**Files:**
- Modify: `src/content/components/App.tsx`

- [ ] **Step 1: 在 `App.tsx` 顶部 useEffect 块里加入命令监听**

把以下代码加在 `App` 函数体内已有的 useEffect 之后：

```typescript
  useEffect(() => {
    const listener = (msg: { type: string; command?: string }) => {
      if (msg.type !== 'command') return;
      if (msg.command === 'toggle-maximize') setMaximized((v) => !v);
      if (msg.command === 'toggle-mask') setMaskOn((v) => !v);
      if (msg.command === 'pop-out') void handlePopOut();
    };
    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, []);
```

注意：`handlePopOut` 在 listener 闭包里使用要保证函数引用稳定。把 `handlePopOut` 转换为 `useCallback`。

- [ ] **Step 2: 把 `handlePopOut` / `handleOpenInWindow` 转为 useCallback**

```typescript
  const handlePopOut = useCallback(async () => {
    if (!video) return;
    try {
      const engine = new PopOutEngine(video);
      const result = await engine.popOut();
      setToast(`Popped out via ${result.strategy}`);
    } catch (e) {
      setToast(`Pop out failed: ${(e as Error).message}`);
    }
  }, [video]);

  const handleOpenInWindow = useCallback(async () => {
    if (!video) return;
    try {
      const engine = new PopOutEngine(video);
      await engine.openStandaloneWindow();
      setToast('Opening in new window...');
    } catch (e) {
      setToast(`Cannot open: ${(e as Error).message}`);
    }
  }, [video]);
```

并在文件顶部导入：

```typescript
import { useCallback, useEffect, useMemo, useState } from 'react';
```

- [ ] **Step 3: 类型检查 + 测试通过**

Run: `npm run typecheck && npm test`
Expected: 全过

- [ ] **Step 4: Commit**

```bash
git add src/content/components/App.tsx
git commit -m "feat(content): subscribe to background command messages"
```

---

### Task 5.3：Popup 主界面

**Files:**
- Modify: `src/popup/App.tsx`
- Create: `src/popup/components/DomainList.tsx`
- Create: `src/popup/components/ShortcutsEditor.tsx`

- [ ] **Step 1: 实现 `src/popup/components/DomainList.tsx`**

```typescript
import type { Settings } from '@shared/types';

interface DomainListProps {
  domains: Settings['domains'];
  onToggleAutoApply: (domain: string, enabled: boolean) => void;
  onRemove: (domain: string) => void;
}

export function DomainList({ domains, onToggleAutoApply, onRemove }: DomainListProps) {
  const entries = Object.entries(domains);
  if (entries.length === 0) {
    return <p className="text-sm text-muted-foreground">尚无按域名保存的设置</p>;
  }
  return (
    <ul className="space-y-2">
      {entries.map(([domain, ds]) => (
        <li key={domain} className="flex items-center justify-between gap-2 text-sm">
          <span className="flex-1 truncate">{domain}</span>
          <label className="flex items-center gap-1">
            <input
              type="checkbox"
              checked={ds.enabledOnSiteLoad}
              onChange={(e) => onToggleAutoApply(domain, e.target.checked)}
            />
            <span className="text-xs">自动应用</span>
          </label>
          <button
            onClick={() => onRemove(domain)}
            className="text-xs text-muted-foreground hover:text-foreground"
            aria-label={`Remove ${domain}`}
          >
            ✕
          </button>
        </li>
      ))}
    </ul>
  );
}
```

- [ ] **Step 2: 实现 `src/popup/components/ShortcutsEditor.tsx`**

```typescript
import type { ActionId, GlobalSettings } from '@shared/types';

interface ShortcutsEditorProps {
  shortcuts: GlobalSettings['shortcuts'];
}

const LABELS: Record<ActionId, string> = {
  'toggle-maximize': '切换最大化',
  'toggle-mask': '切换深色遮罩',
  'pop-out': '弹出窗口',
};

export function ShortcutsEditor({ shortcuts }: ShortcutsEditorProps) {
  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        快捷键编辑通过 Chrome 内置页面修改：在 chrome://extensions/shortcuts 配置。
      </p>
      <ul className="space-y-1 text-sm">
        {Object.entries(shortcuts).map(([id, key]) => (
          <li key={id} className="flex justify-between">
            <span>{LABELS[id as ActionId]}</span>
            <code className="text-xs bg-accent px-2 py-0.5 rounded">{key}</code>
          </li>
        ))}
      </ul>
      <button
        onClick={() => chrome.tabs.create({ url: 'chrome://extensions/shortcuts' })}
        className="text-xs text-muted-foreground hover:text-foreground underline"
      >
        打开快捷键配置 →
      </button>
    </div>
  );
}
```

- [ ] **Step 3: 替换 `src/popup/App.tsx`**

```typescript
import { useEffect, useMemo, useState } from 'react';
import type { Settings } from '@shared/types';
import { DEFAULT_GLOBAL_SETTINGS } from '@shared/types';
import { createSettingsStore } from '@shared/store/SettingsStore';
import { DomainList } from './components/DomainList';
import { ShortcutsEditor } from './components/ShortcutsEditor';

export function App() {
  const store = useMemo(() => createSettingsStore(), []);
  const [settings, setSettings] = useState<Settings>({ global: DEFAULT_GLOBAL_SETTINGS, domains: {} });

  useEffect(() => {
    void store.getState().init().then(() => {
      const s = store.getState();
      setSettings({ global: s.global, domains: s.domains });
    });
    const unsub = store.subscribe((s) => setSettings({ global: s.global, domains: s.domains }));
    return unsub;
  }, [store]);

  return (
    <div className="w-80 p-4 bg-background text-foreground space-y-6">
      <header>
        <h1 className="text-lg font-semibold">VideoResize</h1>
      </header>

      <section className="space-y-2">
        <h2 className="text-xs uppercase tracking-wider text-muted-foreground">全局设置</h2>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={settings.global.autoApplyPerDomain}
            onChange={(e) =>
              void store.getState().updateGlobal({ autoApplyPerDomain: e.target.checked })
            }
          />
          <span>按域名自动应用</span>
        </label>
      </section>

      <section className="space-y-2">
        <h2 className="text-xs uppercase tracking-wider text-muted-foreground">已保存域名</h2>
        <DomainList
          domains={settings.domains}
          onToggleAutoApply={(domain, enabled) =>
            void store.getState().updateDomain(domain, { enabledOnSiteLoad: enabled })
          }
          onRemove={(domain) => {
            const next = { ...settings.domains };
            delete next[domain];
            void chrome.storage.local.set({ settings: { global: settings.global, domains: next } });
          }}
        />
      </section>

      <section className="space-y-2">
        <h2 className="text-xs uppercase tracking-wider text-muted-foreground">快捷键</h2>
        <ShortcutsEditor shortcuts={settings.global.shortcuts} />
      </section>
    </div>
  );
}
```

- [ ] **Step 4: 类型检查通过**

Run: `npm run typecheck`
Expected: 无错误

- [ ] **Step 5: Commit**

```bash
git add src/popup/App.tsx src/popup/components/
git commit -m "feat(popup): build popup with domain list and shortcuts info"
```

---

## Phase 6：E2E 测试

### Task 6.1：通用 video 测试页 E2E

**Files:**
- Create: `playwright.config.ts`
- Create: `tests/e2e/fixtures/video-page.html`
- Create: `tests/e2e/generic.spec.ts`

- [ ] **Step 1: 创建 `playwright.config.ts`**

```typescript
import { defineConfig } from '@playwright/test';
import { resolve } from 'node:path';

const distPath = resolve(__dirname, 'dist');

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  use: {
    headless: false,
    launchOptions: {
      args: [
        `--disable-extensions-except=${distPath}`,
        `--load-extension=${distPath}`,
      ],
    },
  },
});
```

- [ ] **Step 2: 创建 `tests/e2e/fixtures/video-page.html`**

```html
<!doctype html>
<html>
<head><title>Test Video</title></head>
<body>
<video id="v" src="https://www.w3schools.com/html/mov_bbb.mp4" controls width="640" height="360"></video>
</body>
</html>
```

- [ ] **Step 3: 创建 `tests/e2e/generic.spec.ts`**

```typescript
import { test, expect, chromium } from '@playwright/test';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = resolve(fileURLToPath(import.meta.url), '..');

test('floating toolbar appears on video page after playback', async () => {
  const userDataDir = '/tmp/videoresize-e2e-' + Date.now();
  const ctx = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    args: [
      `--disable-extensions-except=${resolve(__dirname, '../../dist')}`,
      `--load-extension=${resolve(__dirname, '../../dist')}`,
    ],
  });

  const page = await ctx.newPage();
  const url = 'file://' + resolve(__dirname, 'fixtures/video-page.html');
  await page.goto(url);

  // 触发播放
  await page.evaluate(() => (document.getElementById('v') as HTMLVideoElement).play());
  await page.waitForTimeout(500);

  // Shadow DOM 内寻找 toolbar
  const toolbarVisible = await page.evaluate(() => {
    const host = document.getElementById('video-resize-root');
    if (!host?.shadowRoot) return false;
    const toolbar = host.shadowRoot.querySelector('[role="toolbar"]');
    return !!toolbar;
  });
  expect(toolbarVisible).toBe(true);

  await ctx.close();
});
```

- [ ] **Step 4: 运行测试**

Run: `npm run build && npm run test:e2e -- generic`
Expected: 测试通过；浏览器窗口会短暂闪现

- [ ] **Step 5: Commit**

```bash
git add playwright.config.ts tests/e2e/
git commit -m "test(e2e): add generic video page Playwright test"
```

---

### Task 6.2：YouTube E2E

**Files:**
- Create: `tests/e2e/youtube.spec.ts`

- [ ] **Step 1: 创建 `tests/e2e/youtube.spec.ts`**

```typescript
import { test, expect, chromium } from '@playwright/test';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = resolve(fileURLToPath(import.meta.url), '..');

test('VideoResize works on YouTube watch page', async () => {
  const userDataDir = '/tmp/videoresize-e2e-yt-' + Date.now();
  const ctx = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    args: [
      `--disable-extensions-except=${resolve(__dirname, '../../dist')}`,
      `--load-extension=${resolve(__dirname, '../../dist')}`,
    ],
  });

  const page = await ctx.newPage();
  // 一个稳定的 YouTube 视频
  await page.goto('https://www.youtube.com/watch?v=dQw4w9WgXcQ');

  // 等视频元素出现并播放过
  await page.waitForSelector('video');
  await page.evaluate(() => document.querySelector('video')!.play().catch(() => {}));
  await page.waitForTimeout(2000);

  const toolbarFound = await page.evaluate(() => {
    const host = document.getElementById('video-resize-root');
    return !!host?.shadowRoot?.querySelector('[role="toolbar"]');
  });
  expect(toolbarFound).toBe(true);

  await ctx.close();
});
```

- [ ] **Step 2: 运行**

Run: `npm run build && npm run test:e2e -- youtube`
Expected: 通过（需要网络）。如果 YouTube 拦截无 cookie 访问，跳过该测试或用任意一个公开 YouTube 视频替换 URL。

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/youtube.spec.ts
git commit -m "test(e2e): add YouTube watch page test"
```

---

### Task 6.3：Bilibili E2E

**Files:**
- Create: `tests/e2e/bilibili.spec.ts`

- [ ] **Step 1: 创建 `tests/e2e/bilibili.spec.ts`**

```typescript
import { test, expect, chromium } from '@playwright/test';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = resolve(fileURLToPath(import.meta.url), '..');

test('VideoResize works on Bilibili video page', async () => {
  const userDataDir = '/tmp/videoresize-e2e-bili-' + Date.now();
  const ctx = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    args: [
      `--disable-extensions-except=${resolve(__dirname, '../../dist')}`,
      `--load-extension=${resolve(__dirname, '../../dist')}`,
    ],
  });

  const page = await ctx.newPage();
  // BV1GJ411x7h7 是 Bilibili 一个公开的稳定视频
  await page.goto('https://www.bilibili.com/video/BV1GJ411x7h7');
  await page.waitForSelector('video');
  await page.evaluate(() => document.querySelector('video')!.play().catch(() => {}));
  await page.waitForTimeout(2000);

  const toolbarFound = await page.evaluate(() => {
    const host = document.getElementById('video-resize-root');
    return !!host?.shadowRoot?.querySelector('[role="toolbar"]');
  });
  expect(toolbarFound).toBe(true);

  await ctx.close();
});
```

- [ ] **Step 2: 运行**

Run: `npm run build && npm run test:e2e -- bilibili`
Expected: 通过（需要网络）。如果遇到登录提示，替换为任意 Bilibili 公开视频 URL。

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/bilibili.spec.ts
git commit -m "test(e2e): add Bilibili video page test"
```

---

## Phase 7：发布前

### Task 7.1：替换占位图标

**Files:**
- Replace: `public/icons/icon-{16,32,48,128}.png`

- [ ] **Step 1: 设计 / 生成 4 张 PNG 图标**

要求：背景透明，主体颜色 `#fafafa`（亮模式可读），形状可识别（如视频画面 + 调整箭头）。
用任何工具（Figma / Photopea / ImageMagick）生成 16/32/48/128 四种规格。
覆盖 `public/icons/icon-16.png` 等文件。

- [ ] **Step 2: 验证 manifest 引用没问题**

Run: `npm run build`
Expected: 无关于 icons 的警告

- [ ] **Step 3: 在 `chrome://extensions` 重新加载扩展，确认图标显示**

- [ ] **Step 4: Commit**

```bash
git add public/icons/
git commit -m "chore: add production icons"
```

---

### Task 7.2：README

**Files:**
- Create: `README.md`

- [ ] **Step 1: 创建 `README.md`**

```markdown
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
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: add README"
```

---

### Task 7.3：完整回归

- [ ] **Step 1: 运行全部测试**

Run: `npm run lint && npm run typecheck && npm test && npm run build`
Expected: 全部 PASS

- [ ] **Step 2: 手动验证清单（按 spec §8 成功标准）**

在 Chrome 加载 `dist/`，依次验证：

1. 通用 video 测试页（用 Task 6.1 的 fixture HTML）→ 三个核心功能能用
2. 一个 YouTube 视频页 → 三个核心功能能用
3. 一个 Bilibili 视频页 → 三个核心功能能用
4. 进入 chrome://extensions，无错误
5. 关闭并重开 Chrome，重新打开同一站点 → per-domain 设置仍生效
6. 按 Esc → 视频恢复到原始位置和样式

- [ ] **Step 3: 如有问题修复，否则打 release tag**

```bash
git tag v0.1.0
git log --oneline | head -20
```

---

## 附录：常见陷阱与对策

| 陷阱 | 对策 |
|------|------|
| Shadow DOM 内 Tailwind 样式不生效 | 用 `?inline` 把 CSS 当字符串导入并 `<style>` 注入 |
| Radix Portal 渲染到 document.body 而非 shadow root | 用 `RadixUI.Provider` 包裹时传 `container` prop = shadow root |
| 祖先 transform 破坏 position:fixed | `MaximizeEngine.verifyFixedWorked` 检测后 lift to body |
| SPA 导航后 video 引用失效 | History API monkey-patch + 重新调 `detector.rescan()` |
| Chrome storage onChanged 在跨 frame 不触发 | service worker 主动 broadcast 给所有 tab |
| MSE / DRM video 无法在独立窗口播放 | `currentSrc` 判 `blob:` 前缀，提示用户用 PiP |

