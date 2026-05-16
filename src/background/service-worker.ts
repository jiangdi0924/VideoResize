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
  sender: chrome.runtime.MessageSender,
): Promise<unknown> {
  switch (message.type) {
    case 'move-tab-to-window': {
      const tabId = sender.tab?.id;
      if (tabId == null) throw new Error('No tab ID in sender');
      await chrome.windows.create({ tabId, type: 'popup' });
      return { ok: true };
    }
    case 'request-settings':
    case 'get-settings': {
      const stored = await chrome.storage.local.get('settings');
      return stored['settings'] ?? null;
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
