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
    const s = this.video.style;
    const transforms: string[] = [];
    if (t.translateX != null || t.translateY != null) {
      transforms.push(`translate(${t.translateX ?? 0}px, ${t.translateY ?? 0}px)`);
    }
    if (t.scaleX != null || t.scaleY != null) {
      transforms.push(`scale(${t.scaleX ?? 1}, ${t.scaleY ?? 1})`);
    }
    if (transforms.length > 0) s.setProperty('transform', transforms.join(' '), 'important');
    if (t.objectFit) s.setProperty('object-fit', t.objectFit, 'important');
    if (t.position) s.setProperty('position', t.position, 'important');
    if (t.zIndex != null) s.setProperty('z-index', String(t.zIndex), 'important');
    if (t.width) s.setProperty('width', t.width, 'important');
    if (t.height) s.setProperty('height', t.height, 'important');
    if (t.top) s.setProperty('top', t.top, 'important');
    if (t.left) s.setProperty('left', t.left, 'important');
    // Also force display/visibility so site CSS can't hide us
    s.setProperty('max-width', 'none', 'important');
    s.setProperty('max-height', 'none', 'important');
  }

  getElement(): HTMLVideoElement {
    return this.video;
  }
}
