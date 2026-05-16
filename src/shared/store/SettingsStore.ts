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

  const store = createStore<SettingsStoreState>((set, get) => ({
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
      schedulePersist();
    },

    updateDomain: async (domain, patch) => {
      set((s) => {
        const existing = s.domains[domain] ?? DEFAULT_DOMAIN_SETTINGS;
        return { domains: { ...s.domains, [domain]: { ...existing, ...patch } } };
      });
      schedulePersist();
    },

    getDomain: (domain) => get().domains[domain] ?? DEFAULT_DOMAIN_SETTINGS,
  }));

  function schedulePersist() {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      const { global, domains } = store.getState();
      void chrome.storage.local.set({ [STORAGE_KEY]: { global, domains } });
    }, 200);
  }

  return store;
}

export type SettingsStore = ReturnType<typeof createSettingsStore>;
