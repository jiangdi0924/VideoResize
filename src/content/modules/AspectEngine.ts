import type { AspectRatio, FitMode } from '@shared/types';

export interface AspectInput {
  sourceW: number;
  sourceH: number;
  target: AspectRatio;
  mode: FitMode;
}

export interface AspectOutput {
  transform: { scaleX: number; scaleY: number };
  objectFit: 'fill' | 'contain' | 'cover';
}

const PRESETS: Record<string, { width: number; height: number }> = {
  '16:9': { width: 16, height: 9 },
  '4:3': { width: 4, height: 3 },
  '21:9': { width: 21, height: 9 },
  '32:9': { width: 32, height: 9 },
  '1:1': { width: 1, height: 1 },
  '9:16': { width: 9, height: 16 },
};

export function parseAspectRatio(ratio: AspectRatio): { width: number; height: number } | null {
  if (ratio === 'original') return null;
  if (ratio.startsWith('custom:')) {
    const parts = ratio.slice(7).split(':');
    const w = Number(parts[0]);
    const h = Number(parts[1]);
    if (Number.isFinite(w) && Number.isFinite(h) && w > 0 && h > 0) {
      return { width: w, height: h };
    }
    return null;
  }
  return PRESETS[ratio] ?? null;
}

export class AspectEngine {
  static compute(input: AspectInput): AspectOutput {
    const parsed = parseAspectRatio(input.target);
    if (!parsed) {
      return { transform: { scaleX: 1, scaleY: 1 }, objectFit: 'fill' };
    }

    const targetRatio = parsed.width / parsed.height;
    const sourceRatio = input.sourceW / input.sourceH;

    if (input.mode === 'letterbox') {
      return { transform: { scaleX: 1, scaleY: 1 }, objectFit: 'contain' };
    }
    if (input.mode === 'crop') {
      return { transform: { scaleX: 1, scaleY: 1 }, objectFit: 'cover' };
    }
    // stretch
    const scaleX = targetRatio / sourceRatio;
    return { transform: { scaleX, scaleY: 1 }, objectFit: 'fill' };
  }
}
