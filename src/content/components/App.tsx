import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { DragHandles } from './DragHandles';
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
  const [freeMode, setFreeMode] = useState(false);
  const [freeRect, setFreeRect] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [maskTick, setMaskTick] = useState(0); // force re-compute on resize/scroll

  const ctrlRef = useRef<VideoController | null>(null);
  const maxEngineRef = useRef<MaximizeEngine | null>(null);

  const store = useMemo(() => createSettingsStore(), []);

  // 视频识别
  useEffect(() => {
    const detector = new VideoDetector();
    const update = () => setVideo(detector.getTargetVideo());
    update();
    detector.on('videochange', update);
    return () => detector.destroy();
  }, []);

  // 维护 ctrl / engine 实例（singleton per video）
  useEffect(() => {
    if (!video) {
      ctrlRef.current = null;
      maxEngineRef.current = null;
      return;
    }
    const ctrl = new VideoController(video);
    const engine = new MaximizeEngine(ctrl);
    ctrlRef.current = ctrl;
    maxEngineRef.current = engine;
    return () => {
      if (engine.isMaximized()) engine.restore();
      if (ctrl.isAttached()) ctrl.detach();
      ctrlRef.current = null;
      maxEngineRef.current = null;
    };
  }, [video]);

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

  // 应用 maximize / aspect — 统一通过同一个 ctrl/engine
  useEffect(() => {
    const ctrl = ctrlRef.current;
    const engine = maxEngineRef.current;
    if (!ctrl || !engine || !video) return;
    const hasAspect = aspectRatio !== 'original';
    const anyActive = maximized || hasAspect;

    if (!anyActive) {
      if (engine.isMaximized()) engine.restore();
      else if (ctrl.isAttached()) ctrl.detach();
      return;
    }

    if (maximized) {
      engine.maximize({ keepAspect: fitMode === 'letterbox' });
    } else if (engine.isMaximized()) {
      // dropping maximize but keeping aspect — undo position but keep attached
      ctrl.detach();
      ctrl.attach();
    } else if (!ctrl.isAttached()) {
      ctrl.attach();
    }

    if (hasAspect && video.videoWidth) {
      const out = AspectEngine.compute({
        sourceW: video.videoWidth,
        sourceH: video.videoHeight,
        target: aspectRatio,
        mode: fitMode,
      });
      ctrl.applyTransform({
        scaleX: out.transform.scaleX,
        scaleY: out.transform.scaleY,
        objectFit: out.objectFit,
      });
    }
  }, [video, maximized, aspectRatio, fitMode]);

  // freeRect 初始化
  useEffect(() => {
    if (!video || !maximized) {
      setFreeRect(null);
      return;
    }
    const rect = video.getBoundingClientRect();
    setFreeRect({ x: rect.left, y: rect.top, width: rect.width, height: rect.height });
  }, [video, maximized]);

  // 持久化
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

  // 监听 resize / scroll，重算 mask
  useEffect(() => {
    if (!maskOn) return;
    const tick = () => setMaskTick((n) => n + 1);
    window.addEventListener('resize', tick);
    window.addEventListener('scroll', tick, true);
    return () => {
      window.removeEventListener('resize', tick);
      window.removeEventListener('scroll', tick, true);
    };
  }, [maskOn]);

  // SPA 路由切换 — 重置当前 video 引用并触发恢复
  useEffect(() => {
    const onNav = () => {
      // 让 detector 重新扫描；状态留给 per-domain effect 重读
      setVideo(null);
      setMaximized(false);
      setMaskOn(false);
    };
    const origPush = history.pushState;
    const origReplace = history.replaceState;
    history.pushState = function (...args: Parameters<typeof origPush>) {
      const r = origPush.apply(this, args);
      onNav();
      return r;
    };
    history.replaceState = function (...args: Parameters<typeof origReplace>) {
      const r = origReplace.apply(this, args);
      onNav();
      return r;
    };
    window.addEventListener('popstate', onNav);
    return () => {
      history.pushState = origPush;
      history.replaceState = origReplace;
      window.removeEventListener('popstate', onNav);
    };
  }, []);

  // Mask clip-path
  const maskClipPath = useMemo(() => {
    if (!maskOn || !video) return null;
    void maskTick; // dependency
    const rect = video.getBoundingClientRect();
    return MaskEngine.computeClipPath(
      { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom },
      { width: window.innerWidth, height: window.innerHeight },
    );
  }, [maskOn, video, maskTick]);

  const handlePopOut = useCallback(async () => {
    if (!video) return;
    try {
      const engine = new PopOutEngine(video);
      const result = await engine.popOut();
      const label = result.strategy === 'document-pip' ? '画中画' : result.strategy === 'native-pip' ? '原生画中画' : '新窗口';
      setToast(`已弹出到${label}`);
    } catch (e) {
      setToast(`弹出失败：${(e as Error).message}`);
    }
  }, [video]);

  const handleOpenInWindow = useCallback(async () => {
    if (!video) return;
    try {
      const engine = new PopOutEngine(video);
      await engine.openStandaloneWindow();
      setToast('正在打开新窗口...');
    } catch (e) {
      setToast(`无法打开：${(e as Error).message}`);
    }
  }, [video]);

  const handleDrag = useCallback(
    (e: { handle: string; dx: number; dy: number; isFirst: boolean; isLast: boolean }) => {
      const engine = maxEngineRef.current;
      if (!engine || !freeRect) return;
      const next = { ...freeRect };
      switch (e.handle) {
        case 'move': next.x = freeRect.x + e.dx; next.y = freeRect.y + e.dy; break;
        case 'r': next.width = Math.max(100, freeRect.width + e.dx); break;
        case 'l': next.x = freeRect.x + e.dx; next.width = Math.max(100, freeRect.width - e.dx); break;
        case 'b': next.height = Math.max(60, freeRect.height + e.dy); break;
        case 't': next.y = freeRect.y + e.dy; next.height = Math.max(60, freeRect.height - e.dy); break;
        case 'br': next.width = Math.max(100, freeRect.width + e.dx); next.height = Math.max(60, freeRect.height + e.dy); break;
        case 'bl': next.x = freeRect.x + e.dx; next.width = Math.max(100, freeRect.width - e.dx); next.height = Math.max(60, freeRect.height + e.dy); break;
        case 'tr': next.y = freeRect.y + e.dy; next.width = Math.max(100, freeRect.width + e.dx); next.height = Math.max(60, freeRect.height - e.dy); break;
        case 'tl': next.x = freeRect.x + e.dx; next.y = freeRect.y + e.dy; next.width = Math.max(100, freeRect.width - e.dx); next.height = Math.max(60, freeRect.height - e.dy); break;
      }
      if (e.isLast) setFreeRect(next);
      engine.setSize(next);
    },
    [freeRect],
  );

  const handleNativeFullscreen = useCallback(() => {
    if (!video) return;
    if (document.fullscreenElement) void document.exitFullscreen();
    else void video.requestFullscreen();
  }, [video]);

  // Esc
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (maximized) setMaximized(false);
      else if (maskOn) setMaskOn(false);
      else if (settingsOpen) setSettingsOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [maximized, maskOn, settingsOpen]);

  // Command listener
  useEffect(() => {
    const listener = (msg: { type: string; command?: string }) => {
      if (msg.type !== 'command') return;
      if (msg.command === 'toggle-maximize') setMaximized((v) => !v);
      if (msg.command === 'toggle-mask') setMaskOn((v) => !v);
      if (msg.command === 'pop-out') void handlePopOut();
    };
    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, [handlePopOut]);

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
      {freeMode && maximized && freeRect && (
        <DragHandles rect={freeRect} onDrag={handleDrag} />
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
        freeMode={freeMode}
        onFreeModeToggle={setFreeMode}
        onNativeFullscreen={handleNativeFullscreen}
      />
      <Toast message={toast} onClose={() => setToast(null)} />
    </>
  );
}
