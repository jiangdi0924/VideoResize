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
