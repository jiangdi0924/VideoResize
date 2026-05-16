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
      <header className="flex items-baseline justify-between">
        <h1 className="text-lg font-semibold">VideoResize</h1>
        <span className="text-xs text-muted-foreground">v{chrome.runtime.getManifest().version}</span>
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
