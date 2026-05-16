import React from 'react';
import { createRoot } from 'react-dom/client';
import { mountShadowRoot } from './shadow-mount';
import { App } from './components/App';

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
  const { shadowRoot, overlayContainer } = mountShadowRoot();
  const mount = shadowRoot.querySelector('#react-mount') as HTMLElement;
  createRoot(mount).render(
    <React.StrictMode>
      <App overlayContainer={overlayContainer} />
    </React.StrictMode>,
  );
}
