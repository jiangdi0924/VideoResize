import { useEffect, useRef } from 'react';

export type HandlePosition = 'tl' | 't' | 'tr' | 'r' | 'br' | 'b' | 'bl' | 'l' | 'move';

export interface DragEvent {
  handle: HandlePosition;
  dx: number;
  dy: number;
  isFirst: boolean;
  isLast: boolean;
}

interface DragHandlesProps {
  rect: { x: number; y: number; width: number; height: number };
  onDrag: (e: DragEvent) => void;
}

export function DragHandles({ rect, onDrag }: DragHandlesProps) {
  const startRef = useRef<{ x: number; y: number; handle: HandlePosition } | null>(null);

  const handleDown = (handle: HandlePosition) => (e: React.PointerEvent) => {
    e.stopPropagation();
    startRef.current = { x: e.clientX, y: e.clientY, handle };
    onDrag({ handle, dx: 0, dy: 0, isFirst: true, isLast: false });
    (e.target as Element).setPointerCapture(e.pointerId);
  };

  useEffect(() => {
    function onMove(e: PointerEvent) {
      if (!startRef.current) return;
      onDrag({
        handle: startRef.current.handle,
        dx: e.clientX - startRef.current.x,
        dy: e.clientY - startRef.current.y,
        isFirst: false,
        isLast: false,
      });
    }
    function onUp(e: PointerEvent) {
      if (!startRef.current) return;
      onDrag({
        handle: startRef.current.handle,
        dx: e.clientX - startRef.current.x,
        dy: e.clientY - startRef.current.y,
        isFirst: false,
        isLast: true,
      });
      startRef.current = null;
    }
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [onDrag]);

  const handleStyle = 'absolute bg-foreground border-2 border-background rounded-sm';
  const size = 12;

  return (
    <div
      className="fixed pointer-events-none"
      style={{ left: rect.x, top: rect.y, width: rect.width, height: rect.height }}
    >
      {/* 移动整个 video */}
      <div
        className="absolute inset-0 cursor-move pointer-events-auto"
        onPointerDown={handleDown('move')}
      />
      {/* 8 handles */}
      {(['tl', 't', 'tr', 'r', 'br', 'b', 'bl', 'l'] as HandlePosition[]).map((h) => (
        <div
          key={h}
          className={`${handleStyle} pointer-events-auto`}
          style={handlePositionStyle(h, size)}
          onPointerDown={handleDown(h)}
        />
      ))}
    </div>
  );
}

function handlePositionStyle(h: HandlePosition, size: number): React.CSSProperties {
  const half = -size / 2;
  const styles: Record<string, React.CSSProperties> = {
    tl: { left: half, top: half, width: size, height: size, cursor: 'nwse-resize' },
    t: { left: '50%', top: half, marginLeft: half, width: size, height: size, cursor: 'ns-resize' },
    tr: { right: half, top: half, width: size, height: size, cursor: 'nesw-resize' },
    r: { right: half, top: '50%', marginTop: half, width: size, height: size, cursor: 'ew-resize' },
    br: { right: half, bottom: half, width: size, height: size, cursor: 'nwse-resize' },
    b: { left: '50%', bottom: half, marginLeft: half, width: size, height: size, cursor: 'ns-resize' },
    bl: { left: half, bottom: half, width: size, height: size, cursor: 'nesw-resize' },
    l: { left: half, top: '50%', marginTop: half, width: size, height: size, cursor: 'ew-resize' },
  };
  return styles[h] ?? {};
}
