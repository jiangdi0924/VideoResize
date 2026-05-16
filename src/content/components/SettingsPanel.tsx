import type { AspectRatio, FitMode } from '@shared/types';

interface SettingsPanelProps {
  open: boolean;
  onClose: () => void;
  aspectRatio: AspectRatio;
  onAspectRatioChange: (r: AspectRatio) => void;
  fitMode: FitMode;
  onFitModeChange: (m: FitMode) => void;
  maskOpacity: number;
  onMaskOpacityChange: (v: number) => void;
  onOpenInWindow: () => void;
  freeMode: boolean;
  onFreeModeToggle: (on: boolean) => void;
  onNativeFullscreen: () => void;
}

const PRESETS: AspectRatio[] = ['16:9', '4:3', '21:9', '32:9', '1:1', '9:16', 'original'];

export function SettingsPanel(props: SettingsPanelProps) {
  if (!props.open) return null;
  return (
    <div className="fixed top-0 right-0 bottom-0 w-80 bg-background border-l border-border shadow-2xl p-4 flex flex-col gap-6 overflow-y-auto">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">VideoResize</h2>
        <button onClick={props.onClose} aria-label="Close" className="hover:bg-accent rounded p-1">
          ×
        </button>
      </div>

      <section>
        <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Aspect Ratio</h3>
        <div className="grid grid-cols-3 gap-2">
          {PRESETS.map((r) => (
            <button
              key={r}
              onClick={() => props.onAspectRatioChange(r)}
              className={`px-2 py-1.5 rounded text-xs ${
                props.aspectRatio === r ? 'bg-foreground text-background' : 'bg-accent text-foreground'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </section>

      <section>
        <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Fit Mode</h3>
        <div role="radiogroup" className="flex gap-2">
          {(['stretch', 'letterbox', 'crop'] as FitMode[]).map((m) => (
            <label key={m} className="flex-1 cursor-pointer">
              <input
                type="radio"
                name="fit"
                value={m}
                checked={props.fitMode === m}
                onChange={() => props.onFitModeChange(m)}
                className="sr-only"
              />
              <span
                className={`block text-center py-1.5 rounded text-xs ${
                  props.fitMode === m ? 'bg-foreground text-background' : 'bg-accent'
                }`}
              >
                {m}
              </span>
            </label>
          ))}
        </div>
      </section>

      <section>
        <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
          Mask Opacity: {Math.round(props.maskOpacity * 100)}%
        </h3>
        <input
          type="range"
          min={0}
          max={95}
          value={props.maskOpacity * 100}
          onChange={(e) => props.onMaskOpacityChange(Number(e.target.value) / 100)}
          className="w-full"
          aria-label="Mask opacity"
        />
      </section>

      <section>
        <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Free Mode</h3>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={props.freeMode}
            onChange={(e) => props.onFreeModeToggle(e.target.checked)}
          />
          <span>显示拖动手柄（任意缩放和移动）</span>
        </label>
        <button
          onClick={props.onNativeFullscreen}
          className="mt-3 w-full px-3 py-2 rounded bg-accent text-foreground text-sm"
        >
          进入原生全屏
        </button>
      </section>

      <section>
        <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Pop Out</h3>
        <button
          onClick={props.onOpenInWindow}
          className="w-full px-3 py-2 rounded bg-foreground text-background text-sm"
        >
          Open in new window
        </button>
      </section>
    </div>
  );
}
