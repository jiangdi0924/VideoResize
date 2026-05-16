import React from 'react';
import { createRoot } from 'react-dom/client';
import { mountShadowRoot } from './shadow-mount';
import { App } from './components/App';

// 受限 iframe（sandboxed ad slots、嵌入 widget 等）里 chrome.runtime 可能不可用。
// 这些 frame 里直接跳过挂载，避免 chrome.runtime.onMessage 等访问触发未捕获异常。
function isExtensionContextAvailable(): boolean {
  return (
    typeof chrome !== 'undefined' &&
    !!chrome.runtime &&
    !!chrome.runtime.onMessage &&
    !!chrome.storage &&
    !!chrome.storage.local
  );
}

if (isExtensionContextAvailable()) {
  const { shadowRoot } = mountShadowRoot();
  const mount = shadowRoot.querySelector('#react-mount') as HTMLElement;
  createRoot(mount).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}
