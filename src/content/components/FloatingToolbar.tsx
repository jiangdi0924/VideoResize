interface FloatingToolbarProps {
  isMaximized: boolean;
  isMaskOn: boolean;
  onToggleMaximize: () => void;
  onToggleMask: () => void;
  onPopOut: () => void;
  onOpenSettings: () => void;
}

export function FloatingToolbar(props: FloatingToolbarProps) {
  return (
    <div
      className="fixed top-4 right-4 flex gap-1 p-1.5 rounded-lg bg-background/90 backdrop-blur border border-border shadow-lg"
      role="toolbar"
      aria-label="VideoResize controls"
    >
      <ToolButton
        active={props.isMaximized}
        label="Toggle Maximize"
        onClick={props.onToggleMaximize}
        icon="⛶"
      />
      <ToolButton
        active={props.isMaskOn}
        label="Toggle Mask"
        onClick={props.onToggleMask}
        icon="◐"
      />
      <ToolButton active={false} label="Pop Out" onClick={props.onPopOut} icon="⤢" />
      <ToolButton active={false} label="Settings" onClick={props.onOpenSettings} icon="⚙" />
    </div>
  );
}

function ToolButton({
  active,
  label,
  onClick,
  icon,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  icon: string;
}) {
  return (
    <button
      aria-label={label}
      onClick={onClick}
      className={`w-9 h-9 rounded-md text-sm flex items-center justify-center transition-colors ${
        active ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50 text-foreground'
      }`}
    >
      <span aria-hidden>{icon}</span>
    </button>
  );
}
