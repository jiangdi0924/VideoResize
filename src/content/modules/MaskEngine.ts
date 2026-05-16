export interface Rect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface Viewport {
  width: number;
  height: number;
}

export class MaskEngine {
  static computeClipPath(videoRect: Rect, viewport: Viewport): string {
    const l = Math.max(0, Math.min(videoRect.left, viewport.width));
    const t = Math.max(0, Math.min(videoRect.top, viewport.height));
    const r = Math.max(0, Math.min(videoRect.right, viewport.width));
    const b = Math.max(0, Math.min(videoRect.bottom, viewport.height));
    const w = viewport.width;
    const h = viewport.height;

    // 沿着外圈走，钻进 hole 再绕回来 —— 标准 clip-path 挖洞写法
    return [
      'polygon(',
      `0px 0px,`,
      `${w}px 0px,`,
      `${w}px ${h}px,`,
      `0px ${h}px,`,
      `0px 0px,`,
      `${l}px ${t}px,`,
      `${l}px ${b}px,`,
      `${r}px ${b}px,`,
      `${r}px ${t}px,`,
      `${l}px ${t}px`,
      ')',
    ].join(' ');
  }

  static formatOpacityColor(opacity: number): string {
    const clamped = Math.max(0, Math.min(0.95, opacity));
    return `rgba(0, 0, 0, ${clamped})`;
  }
}
