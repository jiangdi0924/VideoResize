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
