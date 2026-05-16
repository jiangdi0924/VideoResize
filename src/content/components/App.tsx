import { useEffect, useState, useMemo } from 'react';
import { createSettingsStore } from '@shared/store/SettingsStore';
import { extractDomain } from '@shared/domain';
import type { AspectRatio, FitMode } from '@shared/types';
import { VideoDetector } from '../modules/VideoDetector';
import { VideoController } from '../modules/VideoController';
import { MaximizeEngine } from '../modules/MaximizeEngine';
import { AspectEngine } from '../modules/AspectEngine';
import { MaskEngine } from '../modules/MaskEngine';
import { PopOutEngine } from '../modules/PopOutEngine';
import { FloatingToolbar } from './FloatingToolbar';
import { SettingsPanel } from './SettingsPanel';
import { Toast } from './Toast';

export function App() {
  const [video, setVideo] = useState<HTMLVideoElement | null>(null);
  const [maximized, setMaximized] = useState(false);
  const [maskOn, setMaskOn] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('original');
  const [fitMode, setFitMode] = useState<FitMode>('letterbox');
  const [maskOpacity, setMaskOpacity] = useState(0.8);
  const [toast, setToast] = useState<string | null>(null);

  const store = useMemo(() => createSettingsStore(), []);

  // 视频识别
  useEffect(() => {
    const detector = new VideoDetector();
    const update = () => setVideo(detector.getTargetVideo());
    update();
    detector.on('videochange', update);
    return () => detector.destroy();
  }, []);

  // 加载 per-domain 设置
  useEffect(() => {
    void store.getState().init().then(() => {
      const domain = extractDomain(location.href);
      if (!domain) return;
      const ds = store.getState().getDomain(domain);
      if (ds.lastAspectRatio) setAspectRatio(ds.lastAspectRatio);
      setFitMode(ds.lastFitMode);
      setMaskOpacity(ds.lastMaskOpacity);
      if (ds.enabledOnSiteLoad && ds.lastMaximize) {
        setTimeout(() => setMaximized(true), 300);
      }
    });
  }, [store]);

  // 应用 maximize
  useEffect(() => {
    if (!video) return;
    const ctrl = new VideoController(video);
    const engine = new MaximizeEngine(ctrl);
    if (maximized) {
      engine.maximize({ keepAspect: fitMode === 'letterbox' });
    } else {
      engine.restore();
    }
    return () => {
      if (engine.isMaximized()) engine.restore();
    };
  }, [video, maximized, fitMode]);

  // 应用 aspect ratio
  useEffect(() => {
    if (!video) return;
    if (!video.videoWidth) return;
    const out = AspectEngine.compute({
      sourceW: video.videoWidth,
      sourceH: video.videoHeight,
      target: aspectRatio,
      mode: fitMode,
    });
    video.style.transform = `scale(${out.transform.scaleX}, ${out.transform.scaleY})`;
    video.style.objectFit = out.objectFit;
  }, [video, aspectRatio, fitMode]);

  // 持久化变更
  useEffect(() => {
    const domain = extractDomain(location.href);
    if (!domain) return;
    void store.getState().updateDomain(domain, {
      lastMaximize: maximized,
      lastAspectRatio: aspectRatio,
      lastFitMode: fitMode,
      lastMaskOpacity: maskOpacity,
    });
  }, [maximized, aspectRatio, fitMode, maskOpacity, store]);

  // Mask
  const maskClipPath = useMemo(() => {
    if (!maskOn || !video) return null;
    const rect = video.getBoundingClientRect();
    return MaskEngine.computeClipPath(
      { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom },
      { width: window.innerWidth, height: window.innerHeight },
    );
  }, [maskOn, video, maximized]);

  const handlePopOut = async () => {
    if (!video) return;
    try {
      const engine = new PopOutEngine(video);
      const result = await engine.popOut();
      setToast(`Popped out via ${result.strategy}`);
    } catch (e) {
      setToast(`Pop out failed: ${(e as Error).message}`);
    }
  };

  const handleOpenInWindow = async () => {
    if (!video) return;
    try {
      const engine = new PopOutEngine(video);
      await engine.openStandaloneWindow();
      setToast('Opening in new window...');
    } catch (e) {
      setToast(`Cannot open: ${(e as Error).message}`);
    }
  };

  if (!video) return null;

  return (
    <>
      {maskClipPath && (
        <div
          className="fixed inset-0"
          style={{
            background: MaskEngine.formatOpacityColor(maskOpacity),
            clipPath: maskClipPath,
            pointerEvents: 'none',
            zIndex: 2147483646,
          }}
        />
      )}
      <FloatingToolbar
        isMaximized={maximized}
        isMaskOn={maskOn}
        onToggleMaximize={() => setMaximized((v) => !v)}
        onToggleMask={() => setMaskOn((v) => !v)}
        onPopOut={handlePopOut}
        onOpenSettings={() => setSettingsOpen(true)}
      />
      <SettingsPanel
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        aspectRatio={aspectRatio}
        onAspectRatioChange={setAspectRatio}
        fitMode={fitMode}
        onFitModeChange={setFitMode}
        maskOpacity={maskOpacity}
        onMaskOpacityChange={setMaskOpacity}
        onOpenInWindow={handleOpenInWindow}
      />
      <Toast message={toast} onClose={() => setToast(null)} />
    </>
  );
}
