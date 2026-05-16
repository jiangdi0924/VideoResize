import tailwindCss from '@/styles/globals.css?inline';

export interface MountResult {
  host: HTMLDivElement;
  shadowRoot: ShadowRoot;
  /** Container for full-viewport overlays (e.g. the video mirror). Inside shadow root. */
  overlayContainer: HTMLDivElement;
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

  // Container for full-viewport overlays (mirror, etc). Placed BEFORE react-mount so
  // the React UI (toolbar, settings panel) renders on top of it.
  const overlayContainer = document.createElement('div');
  overlayContainer.id = 'overlay-container';
  overlayContainer.style.pointerEvents = 'auto';
  shadowRoot.appendChild(overlayContainer);

  const reactMount = document.createElement('div');
  reactMount.id = 'react-mount';
  reactMount.style.pointerEvents = 'auto';
  shadowRoot.appendChild(reactMount);

  return { host, shadowRoot, overlayContainer };
}
