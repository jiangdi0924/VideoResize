import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FloatingToolbar } from '@content/components/FloatingToolbar';

describe('FloatingToolbar', () => {
  it('renders four action buttons', () => {
    render(
      <FloatingToolbar
        isMaximized={false}
        isMaskOn={false}
        onToggleMaximize={() => {}}
        onToggleMask={() => {}}
        onPopOut={() => {}}
        onOpenSettings={() => {}}
      />,
    );
    expect(screen.getAllByLabelText('Toggle Maximize').length).toBeGreaterThan(0);
    expect(screen.getAllByLabelText('Toggle Mask').length).toBeGreaterThan(0);
    expect(screen.getAllByLabelText('Pop Out').length).toBeGreaterThan(0);
    expect(screen.getAllByLabelText('Settings').length).toBeGreaterThan(0);
  });

  it('triggers callback when Maximize clicked', () => {
    const onToggle = vi.fn();
    render(
      <FloatingToolbar
        isMaximized={false}
        isMaskOn={false}
        onToggleMaximize={onToggle}
        onToggleMask={() => {}}
        onPopOut={() => {}}
        onOpenSettings={() => {}}
      />,
    );
    const buttons = screen.getAllByLabelText('Toggle Maximize');
    const lastButton = buttons[buttons.length - 1];
    if (lastButton) {
      fireEvent.click(lastButton);
    }
    expect(onToggle).toHaveBeenCalled();
  });
});
