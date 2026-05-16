import type { Settings } from './types';

export type ContentToBackground =
  | { type: 'request-settings' }
  | { type: 'save-domain-settings'; domain: string; settings: Partial<import('./types').DomainSettings> }
  | { type: 'move-tab-to-window' }
  | { type: 'detected-video'; frameId: number; hasVideo: boolean };

export type BackgroundToContent =
  | { type: 'settings-changed'; settings: Settings }
  | { type: 'command'; command: import('./types').ActionId };

export type PopupToBackground =
  | { type: 'get-settings' }
  | { type: 'update-global'; settings: Partial<import('./types').GlobalSettings> }
  | { type: 'update-domain'; domain: string; settings: Partial<import('./types').DomainSettings> }
  | { type: 'list-detected-videos'; tabId: number };

export type AnyMessage = ContentToBackground | BackgroundToContent | PopupToBackground;
