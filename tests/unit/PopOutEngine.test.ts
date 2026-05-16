import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PopOutEngine } from '@content/modules/PopOutEngine';

describe('PopOutEngine', () => {
  let video: HTMLVideoElement;

  beforeEach(() => {
    document.body.innerHTML = '';
    video = document.createElement('video');
    document.body.appendChild(video);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('prefers Document PiP when available', async () => {
    const requestWindow = vi.fn(async () => ({
      document: document.implementation.createHTMLDocument(),
      addEventListener: vi.fn(),
    }));
    vi.stubGlobal('documentPictureInPicture', { requestWindow });

    const engine = new PopOutEngine(video);
    const result = await engine.popOut();
    expect(result.strategy).toBe('document-pip');
    expect(requestWindow).toHaveBeenCalled();
  });

  it('falls back to native PiP when Document PiP unavailable', async () => {
    vi.stubGlobal('documentPictureInPicture', undefined);
    const mockPiP = vi.fn(async () => ({}) as PictureInPictureWindow);
    Object.defineProperty(video, 'requestPictureInPicture', {
      value: mockPiP,
      configurable: true,
    });

    const engine = new PopOutEngine(video);
    const result = await engine.popOut();
    expect(result.strategy).toBe('native-pip');
    expect(mockPiP).toHaveBeenCalled();
  });

  it('openStandaloneWindow sends message to background', async () => {
    Object.defineProperty(video, 'currentSrc', { value: 'https://example.com/video.mp4', configurable: true });
    const engine = new PopOutEngine(video);

    await engine.openStandaloneWindow();
    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
      type: 'open-standalone-window',
      videoSrc: 'https://example.com/video.mp4',
    });
  });

  it('openStandaloneWindow throws when video src is blob/MSE', async () => {
    Object.defineProperty(video, 'currentSrc', { value: 'blob:https://example.com/abc', configurable: true });
    const engine = new PopOutEngine(video);

    await expect(engine.openStandaloneWindow()).rejects.toThrow(/MSE/i);
  });
});
