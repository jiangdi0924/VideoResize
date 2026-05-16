export type PopOutStrategy = 'document-pip' | 'native-pip' | 'standalone-window';

export interface PopOutResult {
  strategy: PopOutStrategy;
}

interface DocumentPictureInPicture {
  requestWindow(options?: { width?: number; height?: number }): Promise<Window>;
}

declare global {
  var documentPictureInPicture: DocumentPictureInPicture | undefined;
}

export class PopOutEngine {
  constructor(private video: HTMLVideoElement) {}

  async popOut(): Promise<PopOutResult> {
    if (typeof documentPictureInPicture !== 'undefined') {
      try {
        const win = await documentPictureInPicture.requestWindow({ width: 640, height: 360 });
        // 把 video 克隆到 PiP 窗口
        const clonedVideo = win.document.body.appendChild(
          this.video.cloneNode(true)
        ) as HTMLVideoElement;
        clonedVideo.autoplay = true;
        return { strategy: 'document-pip' };
      } catch {
        // fall through to native PiP
      }
    }

    if (this.video.requestPictureInPicture) {
      await this.video.requestPictureInPicture();
      return { strategy: 'native-pip' };
    }

    throw new Error('No Pop Out method available');
  }

  async openStandaloneWindow(): Promise<PopOutResult> {
    await chrome.runtime.sendMessage({ type: 'move-tab-to-window' });
    return { strategy: 'standalone-window' };
  }
}
