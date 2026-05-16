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
