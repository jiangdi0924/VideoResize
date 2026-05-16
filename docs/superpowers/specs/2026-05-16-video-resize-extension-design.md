# VideoResize Chrome Extension — Design Spec (v1.0)

**Date:** 2026-05-16
**Status:** Draft for implementation
**Owner:** Jiangdi

---

## 1. Problem & Goals

### 1.1 Problem

Many online video sites (e.g., Bilibili, YouTube, lesser-known players) ship rigid video players that:

- Lock the player to a fixed aspect ratio and size dictated by the site layout
- Don't let the user expand the video to fully use their screen real estate
- Don't offer Picture-in-Picture or window-detachment on every site
- Surround the video with distracting page content that competes for attention

The user cannot freely adapt the viewing experience to their screen, preference, or context.

### 1.2 Goals (v1)

Build a Chrome extension that, on any web page with an HTML5 `<video>` element, gives the user three core capabilities:

1. **Maximize** — Free the video from the page layout. Resize and reposition it anywhere in the viewport. Optionally dim the rest of the page with a dark mask.
2. **Aspect Ratio Control** — Force a chosen aspect ratio (preset or custom) onto the video. Choose how the source video fits the new ratio (stretch / letterbox / crop).
3. **Pop Out** — Detach the video into a separate window: native PiP, Document PiP, or a standalone Chrome window.

These work universally on any site that uses a standard `<video>` element, including inside iframes and Shadow DOM.

Settings are remembered per-domain via `chrome.storage`.

### 1.3 Non-Goals (v1)

Explicitly out of scope:

- Video-content zoom and pan (cropping out hardcoded subtitles, focusing on a corner)
- Screenshot or screen-recording features
- Styling of site-rendered subtitles (YouTube/Bilibili's custom subtitle DOM)
- Audio track switching, equalizer, audio effects
- Rust / WASM video-frame processing
- Firefox compatibility (Chrome + Edge only; Edge works on the same codebase)

### 1.4 Deferred to v1.1

- CSS styling of native HTML5 `<track>` subtitles (low-effort once core stable)

---

## 2. Core Features

### 2.1 Maximize

Free the video from its in-page container and make it fill the browser viewport as much as the user wants.

**Sub-capabilities:**

- **Instant Maximize** — One-click action that lifts the video to viewport-level positioning (`position: fixed`), sized to fill the viewport while preserving (or breaking) aspect ratio. Toggle to restore.
- **Free Scaling** — Drag corner handles to set arbitrary width × height. Hold a modifier key to lock aspect ratio.
- **Free Positioning** — Drag the video itself (or a drag handle) to any position in the viewport.
- **Native Fullscreen** — A shortcut to invoke `video.requestFullscreen()` for OS-level fullscreen.
- **Dark Mask** — Render a semi-transparent black overlay over everything except the video. User-adjustable opacity (default 80%). Independent toggle from Maximize but typically paired.

**State preservation:** When the user activates Maximize, the original `style`, `parentNode`, and `nextSibling` of the `<video>` element are captured. On restore, the video is returned to its original position with original styles.

### 2.2 Aspect Ratio Control

Force the video frame into a chosen aspect ratio.

**Presets:** `16:9`, `4:3`, `21:9`, `32:9`, `1:1`, `9:16`, `Original`
**Custom:** Free input `width:height` (e.g., `2.39:1`)

**Application modes:**

- **Stretch** — Distorts the video to fill the chosen ratio (no black bars, image squished/stretched). Implemented with `transform: scale(x, y)` matching the ratio difference.
- **Letterbox** — Preserves the original video aspect ratio; adds black bars where the new container differs. Implemented with `object-fit: contain`.
- **Crop** — Preserves aspect ratio, scales up to fully fill the container, cropping the edges. Implemented with `object-fit: cover`.

Mode and ratio are independent toggles; user picks both.

### 2.3 Pop Out

Detach the video into a separate window. Three strategies with automatic fallback:

| Strategy | Capability | Browser Support |
|----------|-----------|-----------------|
| **Document Picture-in-Picture** | Custom HTML in PiP window (our own UI inside) | Chrome 116+ |
| **Native Picture-in-Picture** | OS-level floating window, browser-native controls | All modern Chrome |
| **Standalone Window** | New Chrome window via `chrome.windows.create({type: 'popup'})` | All |

**Default:** Document PiP if available, else Native PiP. Standalone Window is opt-in (user picks it from the menu) — it's a heavier-weight option for multi-tasking users.

**State during Pop Out:** Aspect-ratio and resize state in the original tab is preserved. On close of the PiP / popup window, video returns to its in-page state.

### 2.4 Per-Domain Settings

Each setting (Maximize active, last aspect ratio, last mask opacity, etc.) can be remembered per `eTLD+1` domain.

**On site load:**
- If user has saved settings for the domain → load and offer to auto-apply (opt-in via a toggle in popup)
- If not → do nothing visually; extension is dormant until user invokes it

Settings UI lives in the extension popup.

---

## 3. System Architecture

Three execution environments, communicating via `chrome.storage` change events and `chrome.runtime.sendMessage`.

### 3.1 Content Script (primary stage)

- Injected on `<all_urls>` matching pages
- `all_frames: true` to handle iframe-embedded videos
- Mounts a Shadow DOM root attached to `<html>` (not `<body>`, to survive SPAs that wipe `<body>`)
- React 19 application renders all UI inside the Shadow DOM
- Directly interacts with `<video>` DOM elements

### 3.2 Service Worker (background)

- Owns `chrome.storage` reads/writes (single source of truth)
- Broadcasts setting changes to all tabs via `chrome.tabs.sendMessage`
- Registers global keyboard shortcuts via `chrome.commands` (mapped to Maximize toggle, Mask toggle, Pop Out)
- Coordinates "open standalone window" requests

### 3.3 Extension Popup

- Click extension icon → shows global settings + per-domain settings list + "manually pick video" trigger
- Independent React tree (still uses shadcn — no Shadow DOM needed since it's chrome-owned UI)

### 3.4 Communication Model

```
┌─────────────────────┐         ┌──────────────────────┐
│  Content Script     │◀───────▶│   Service Worker     │
│  (React in Shadow)  │         │   (storage + tabs)   │
└─────────────────────┘         └──────────────────────┘
           ▲                              ▲
           │ chrome.runtime.sendMessage   │
           ▼                              ▼
       <video>                      ┌──────────────────┐
                                    │  Extension Popup │
                                    └──────────────────┘
```

- `SettingsStore` (Zustand) in each context subscribes to `chrome.storage.onChanged` for cross-tab sync
- Content script ↔ Service worker messages are typed via shared TypeScript types in `src/shared/types.ts`

---

## 4. Module Breakdown

All inside `src/content/modules/` unless noted.

### 4.1 `VideoDetector`

**Responsibility:** Find the target `<video>` element on the page.

**Strategy:**
1. Initial scan on `DOMContentLoaded`: collect all `<video>` elements (including those in same-origin iframes accessible from this frame and Shadow DOM via deep-traverse).
2. `MutationObserver` watching `document.body` for added/removed nodes; re-scans on changes.
3. Listen on `play` / `pause` / `loadedmetadata` events on candidate videos.
4. **Selection criterion:** the video with the largest visible area (intersection with viewport) that has been played at least once in the current session.

**Output:** Exposes `getTargetVideo(): HTMLVideoElement | null` and an event emitter for `videochange`.

**Edge cases:**
- Multiple eligible videos (e.g., split-view) → pick the largest one
- No videos detected → return `null`; UI shows "no video found" state in popup
- Junk sites with many small videos → only consider videos with area > 50% of viewport for auto-selection; smaller ones require manual pick

### 4.2 `VideoController`

**Responsibility:** Wrap the target `<video>` element. Provides a stable API to other engines.

**Captured state on first attach:**
- `element.style.cssText` (full original inline styles)
- `element.parentNode`, `element.nextSibling` (for restoration)
- Computed dimensions (for math relative to original size)

**API:**
- `attach()` — capture original state, prepare for manipulation
- `detach()` — restore original state, undo all transforms
- `applyTransform({ scale, translate, aspectRatio, fitMode })` — apply visual transform
- `requestPictureInPicture(opts)` — proxy to PiP APIs

### 4.3 `MaximizeEngine`

**Responsibility:** Implement viewport-fill maximize and free resize/positioning.

**Strategy:**
- Move (or visually reposition via `position: fixed`) the video to viewport-level coordinates
- Z-index high enough to sit above page content (but below our Shadow DOM UI)
- Drag handles attach via UI layer (`DragHandles` component) and report changes back to `MaximizeEngine`

**Important:** Some sites have CSS that breaks `position: fixed` on `<video>` (e.g., `transform` on ancestors creates a containing block). Fallback: clone the video into our Shadow DOM container using `<video>` source rewrite or stream copy. **Decision:** Try `position: fixed` first; if visual position doesn't match expected viewport coords (detected via `getBoundingClientRect`), fall back to a "lift to body" approach (re-parent the video element to `document.body`).

### 4.4 `AspectEngine`

**Responsibility:** Implement aspect ratio changes (Stretch / Letterbox / Crop).

**Strategy:**
- **Stretch:** Compute `scaleX, scaleY` based on (target ratio / source ratio), apply via `transform`
- **Letterbox:** `object-fit: contain` on the video; container shape matches target ratio
- **Crop:** `object-fit: cover`; container shape matches target ratio

Source aspect ratio is read from `video.videoWidth / video.videoHeight` once metadata is loaded.

### 4.5 `PopOutEngine`

**Responsibility:** Implement the three pop-out strategies with automatic fallback.

**Two separate action paths** (not a single fallback chain):

**Path 1 — Default Pop Out** (single button "Pop Out"):
1. Try `documentPictureInPicture.requestWindow()` (Document PiP)
2. If not available, fall back to `video.requestPictureInPicture()` (Native PiP)

**Path 2 — Open in Standalone Window** (separate explicit action, surfaced as "Open in new window" in `SettingsPanel`):
- `chrome.runtime.sendMessage({ type: 'open-standalone-window', videoSrc })` → service worker uses `chrome.windows.create({ type: 'popup' })`
- Not in the auto-fallback because it's heavyweight and only useful for specific multi-tasking scenarios

**Document PiP details:** Move our React UI subtree (or a dedicated PiP-mode subtree) into the PiP window's DOM. Re-attach event listeners. On close, return to in-tab state.

**Standalone window details:** Need to extract a usable video source URL. If video uses MSE / DRM, the standalone window can't replay it — show a notice and gracefully decline. v1 supports standalone window only for direct-URL `<video>` (no MSE).

### 4.6 `MaskEngine`

**Responsibility:** Render a dark overlay over the page, with a "hole" cut out for the video.

**Implementation:**
- A `<div>` inside Shadow DOM, fixed-positioned, full viewport, background `rgba(0,0,0,opacity)`
- `clip-path` (or four sibling overlay rects around the video) to leave the video region uncovered
- Updates on resize, scroll, and video position changes
- `pointer-events: none` so clicks pass through to the video controls

**Opacity:** Configurable slider 0%–95% (default 80%).

### 4.7 `SettingsStore` (in `src/shared/store/`)

**Implementation:** Zustand store, synchronized with `chrome.storage.local`.

**Schema:**

```typescript
type Settings = {
  global: {
    defaultMaskOpacity: number;       // 0–1
    autoApplyPerDomain: boolean;      // master switch
    shortcuts: Record<ActionId, string>;
  };
  domains: Record<string, DomainSettings>;
}

type DomainSettings = {
  enabledOnSiteLoad: boolean;        // auto-apply on load
  lastMaximize: boolean;
  lastAspectRatio: string | null;    // "16:9" | "21:9" | "custom:2.39:1" | null
  lastFitMode: 'stretch' | 'letterbox' | 'crop';
  lastMaskOpacity: number;
}
```

**Persistence:** Every mutation persists to `chrome.storage.local` via debounced write (200ms). Reads on init come from storage. Cross-tab sync via `chrome.storage.onChanged`.

### 4.8 `UIRoot` (React + shadcn)

**Components inside `src/content/components/`:**

- `FloatingToolbar` — small toolbar that appears on hover-over-video (default placement: top-right of video). Hosts quick actions: Maximize toggle, Mask toggle, Pop Out, Open Settings.
- `SettingsPanel` — full panel (slides in from right edge of viewport, or modal centered) with all aspect / mask / position controls. Closable.
- `DragHandles` — 8 handles (4 corners + 4 edges) shown when in free-resize mode; reads/writes `MaximizeEngine` state.
- `Toast` — transient feedback ("Restored", "Saved settings for youtube.com", etc.)

**Shadow DOM mount:**

```typescript
const host = document.createElement('div');
host.id = 'video-resize-root';
document.documentElement.appendChild(host);
const shadow = host.attachShadow({ mode: 'closed' });
// Tailwind CSS injected into shadow as <style>
// Radix portals configured to mount into shadow via container prop
const reactRoot = createRoot(shadow);
reactRoot.render(<App />);
```

**Radix portal handling:** Wrap shadcn components with a `PortalContainerProvider` that supplies the shadow root as the portal container. This is the documented Radix pattern for shadow DOM.

**Tailwind in Shadow DOM:** Build Tailwind CSS as a string at build time, inject as a `<style>` element inside the shadow root on mount.

---

## 5. Key Behaviors

### 5.1 Video identification timing

- Scan on `DOMContentLoaded` + every `MutationObserver` callback
- Video is only "the target" once user opens our UI; until then, we observe but don't manipulate
- This avoids accidentally hijacking irrelevant videos on sites with many videos

### 5.2 First-interaction principle

- The extension is dormant on every page load by default
- User activates via any of: extension icon click, configured shortcut key, or hover-to-show floating widget (all three are wired up in v1; specific visual treatment of the widget will be iterated during implementation)
- Exception: if `domain.enabledOnSiteLoad` is `true`, automatically apply last settings on page load

### 5.3 State preservation & restore

- Every transformation captures the prior state in `VideoController.attach()`
- `Esc` key or explicit "Restore" action calls `VideoController.detach()` → exact restore
- Page navigation (SPA route change): detect via History API monkey-patch, auto-restore

### 5.4 Keyboard shortcuts (defaults)

- `Alt+Shift+M` — Maximize toggle
- `Alt+Shift+D` — Dark mask toggle
- `Alt+Shift+P` — Pop Out (Document PiP / Native PiP)

All shortcuts user-configurable via popup → uses `chrome.commands` API.

### 5.5 iframe handling

- Content script injected with `all_frames: true`
- Each frame runs its own detector and UI mount
- Cross-origin iframes operate independently; no cross-frame coordination required for v1
- Popup queries each frame for detected videos (via `chrome.tabs.sendMessage` with `frameId`) to show full list when user invokes "manual pick"

---

## 6. Build & Tooling

### 6.1 Tech Stack

| Layer | Choice | Reason |
|-------|--------|--------|
| Build | Vite + `@crxjs/vite-plugin` | First-class Chrome extension support, HMR |
| Language | TypeScript (strict mode) | Type safety, IDE support |
| Framework | React 19 | Modern, mature, shadcn ecosystem |
| Styling | Tailwind CSS | Utility-first, shadcn standard |
| UI Library | shadcn/ui + Radix UI | Modern, accessible, customizable |
| State | Zustand | Minimal boilerplate, works across React trees |
| Manifest | Manifest V3 | Required by Chrome (V2 deprecated) |

### 6.2 Project Structure

```
VideoResize/
├── src/
│   ├── manifest.ts                       # Manifest V3, generated by @crxjs
│   ├── content/
│   │   ├── index.tsx                     # Content script entry, mounts Shadow DOM
│   │   ├── shadow-mount.ts               # Shadow DOM creation + style injection
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
│   │   ├── messages.ts                   # Typed message schemas
│   │   └── ui/                           # shadcn components
│   └── styles/
│       └── globals.css                   # Tailwind directives
├── public/
│   └── icons/                            # 16/32/48/128
├── tests/
│   ├── unit/                             # Vitest for engines
│   └── e2e/                              # Playwright on real video pages
├── vite.config.ts
├── tsconfig.json
├── tailwind.config.ts
├── components.json                       # shadcn config
└── package.json
```

### 6.3 Quality Gates

- ESLint (typescript-eslint, react-hooks)
- Prettier
- TypeScript `strict: true`, no `any` (use `unknown` + type guards)
- Vitest unit tests for each engine module (especially math in AspectEngine, state in VideoController)
- Playwright E2E for: YouTube, Bilibili, generic `<video>` test page
- Pre-commit hook (Husky + lint-staged) running lint + typecheck + relevant tests

---

## 7. Risks & Open Questions

### 7.1 Known risks

| Risk | Mitigation |
|------|-----------|
| Sites with CSS `transform` on ancestors break `position: fixed` | Fallback to re-parent video into `document.body` |
| MSE / DRM-protected video can't be replayed in standalone window | Detect via `MediaSource` check; show "Pop Out unavailable" notice; PiP still works |
| Site's own scripts fight our DOM manipulation | Use MutationObserver to re-apply; document specific sites in adapter notes |
| Shadow DOM CSS not loading in time → flash of unstyled UI | Inject Tailwind `<style>` synchronously before first React render |
| Chrome storage quota (5MB) | Per-domain settings are tiny (~100 bytes each); no concern at expected scale |
| SPA navigation loses video reference | Listen to History API; auto-detach and re-detect |

### 7.2 Open questions (resolved during implementation)

- **Exact UI design** of FloatingToolbar / SettingsPanel — to be designed in implementation phase. Functional requirements are fixed; visual style follows shadcn defaults with iteration after first prototype.
- **Which sites need per-site adapters** — defer until we encounter problems; v1 ships universal-only.

---

## 8. Success Criteria

v1 ships when:

1. All 3 core features (Maximize, Aspect Ratio, Pop Out) work on:
   - A generic HTML5 `<video>` test page
   - YouTube watch page
   - Bilibili video page
2. Per-domain settings persist across browser restarts
3. Restore (`Esc` or explicit action) returns the page to a state visually indistinguishable from a fresh load
4. All keyboard shortcuts are configurable
5. Test coverage: ≥80% line coverage on engine modules; E2E suite green on all three target sites
6. Manifest V3 compliance; passes `chrome://extensions` "errors" check after install
