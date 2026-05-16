export type FitMode = 'stretch' | 'letterbox' | 'crop';

export type AspectRatioPreset = '16:9' | '4:3' | '21:9' | '32:9' | '1:1' | '9:16' | 'original';
export type AspectRatio = AspectRatioPreset | `custom:${string}`;

export type ActionId = 'toggle-maximize' | 'toggle-mask' | 'pop-out';

export interface DomainSettings {
  enabledOnSiteLoad: boolean;
  lastMaximize: boolean;
  lastAspectRatio: AspectRatio | null;
  lastFitMode: FitMode;
  lastMaskOpacity: number; // 0–1
}

export interface GlobalSettings {
  defaultMaskOpacity: number;
  autoApplyPerDomain: boolean;
  shortcuts: Record<ActionId, string>;
}

export interface Settings {
  global: GlobalSettings;
  domains: Record<string, DomainSettings>;
}

export const DEFAULT_DOMAIN_SETTINGS: DomainSettings = {
  enabledOnSiteLoad: false,
  lastMaximize: false,
  lastAspectRatio: null,
  lastFitMode: 'letterbox',
  lastMaskOpacity: 0.8,
};

export const DEFAULT_GLOBAL_SETTINGS: GlobalSettings = {
  defaultMaskOpacity: 0.8,
  autoApplyPerDomain: true,
  shortcuts: {
    'toggle-maximize': 'Alt+Shift+M',
    'toggle-mask': 'Alt+Shift+D',
    'pop-out': 'Alt+Shift+P',
  },
};
