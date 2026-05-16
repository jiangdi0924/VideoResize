import '@testing-library/jest-dom/vitest';
import { vi, beforeEach } from 'vitest';

const storage = new Map<string, unknown>();

const chromeMock = {
  storage: {
    local: {
      get: vi.fn(async (keys: string | string[] | null) => {
        if (keys === null) return Object.fromEntries(storage);
        const list = Array.isArray(keys) ? keys : [keys];
        return Object.fromEntries(list.map((k) => [k, storage.get(k)]).filter(([, v]) => v !== undefined));
      }),
      set: vi.fn(async (items: Record<string, unknown>) => {
        Object.entries(items).forEach(([k, v]) => storage.set(k, v));
      }),
      remove: vi.fn(async (keys: string | string[]) => {
        (Array.isArray(keys) ? keys : [keys]).forEach((k) => storage.delete(k));
      }),
      clear: vi.fn(async () => storage.clear()),
    },
    onChanged: { addListener: vi.fn(), removeListener: vi.fn() },
  },
  runtime: {
    sendMessage: vi.fn(),
    onMessage: { addListener: vi.fn() },
  },
  tabs: {
    sendMessage: vi.fn(),
    query: vi.fn(async () => []),
  },
  windows: {
    create: vi.fn(async () => ({ id: 1 })),
  },
  commands: {
    onCommand: { addListener: vi.fn() },
  },
};

beforeEach(() => {
  storage.clear();
  vi.clearAllMocks();
});

globalThis.chrome = chromeMock as unknown as typeof chrome;
