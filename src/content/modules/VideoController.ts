export interface TransformInput {
  scaleX?: number;
  scaleY?: number;
  translateX?: number;
  translateY?: number;
  objectFit?: 'fill' | 'contain' | 'cover';
  position?: 'static' | 'fixed';
  zIndex?: number;
  width?: string;
  height?: string;
  top?: string;
  left?: string;
}

interface CapturedState {
  cssText: string;
  parent: Node | null;
  nextSibling: Node | null;
}

export class VideoController {
  private captured: CapturedState | null = null;

  constructor(private video: HTMLVideoElement) {}

  attach(): void {
    if (this.captured) return;
    this.captured = {
      cssText: this.video.style.cssText,
      parent: this.video.parentNode,
      nextSibling: this.video.nextSibling,
    };
  }

  detach(): void {
    if (!this.captured) return;
    this.video.style.cssText = this.captured.cssText;
    const { parent, nextSibling } = this.captured;
    if (parent && this.video.parentNode !== parent) {
      parent.insertBefore(this.video, nextSibling);
    }
    this.captured = null;
  }

  isAttached(): boolean {
    return this.captured !== null;
  }

  applyTransform(t: TransformInput): void {
    if (!this.captured) throw new Error('VideoController: applyTransform requires attach() first');
    const transforms: string[] = [];
    if (t.translateX != null || t.translateY != null) {
      transforms.push(`translate(${t.translateX ?? 0}px, ${t.translateY ?? 0}px)`);
    }
    if (t.scaleX != null || t.scaleY != null) {
      transforms.push(`scale(${t.scaleX ?? 1}, ${t.scaleY ?? 1})`);
    }
    if (transforms.length > 0) this.video.style.transform = transforms.join(' ');
    if (t.objectFit) this.video.style.objectFit = t.objectFit;
    if (t.position) this.video.style.position = t.position;
    if (t.zIndex != null) this.video.style.zIndex = String(t.zIndex);
    if (t.width) this.video.style.width = t.width;
    if (t.height) this.video.style.height = t.height;
    if (t.top) this.video.style.top = t.top;
    if (t.left) this.video.style.left = t.left;
  }

  getElement(): HTMLVideoElement {
    return this.video;
  }
}
