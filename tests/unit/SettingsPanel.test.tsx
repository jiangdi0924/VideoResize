import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SettingsPanel } from '@content/components/SettingsPanel';

describe('SettingsPanel', () => {
  const defaultProps = {
    open: true,
    onClose: vi.fn(),
    aspectRatio: '16:9' as const,
    onAspectRatioChange: vi.fn(),
    fitMode: 'letterbox' as const,
    onFitModeChange: vi.fn(),
    maskOpacity: 0.8,
    onMaskOpacityChange: vi.fn(),
    onOpenInWindow: vi.fn(),
    freeMode: false,
    onFreeModeToggle: vi.fn(),
    onNativeFullscreen: vi.fn(),
  };

  it('renders 7 aspect ratio preset buttons', () => {
    render(<SettingsPanel {...defaultProps} />);
    ['16:9', '4:3', '21:9', '32:9', '1:1', '9:16', 'original'].forEach((r) => {
      const buttons = screen.getAllByRole('button', { name: r });
      expect(buttons.length).toBeGreaterThan(0);
    });
  });

  it('calls onAspectRatioChange when preset clicked', () => {
    const onChange = vi.fn();
    const { container } = render(<SettingsPanel {...defaultProps} onAspectRatioChange={onChange} />);
    // Find all buttons with text '21:9' in the container
    const allButtons = container.querySelectorAll('button');
    let targetButton = null;
    for (const btn of Array.from(allButtons)) {
      if (btn.textContent === '21:9') {
        targetButton = btn;
        break;
      }
    }
    expect(targetButton).toBeTruthy();
    fireEvent.click(targetButton!);
    expect(onChange).toHaveBeenCalledWith('21:9');
  });

  it('renders three fit mode toggles', () => {
    render(<SettingsPanel {...defaultProps} />);
    const stretchRadios = screen.getAllByRole('radio', { name: /stretch/i });
    const letterboxRadios = screen.getAllByRole('radio', { name: /letterbox/i });
    const cropRadios = screen.getAllByRole('radio', { name: /crop/i });
    expect(stretchRadios.length).toBeGreaterThan(0);
    expect(letterboxRadios.length).toBeGreaterThan(0);
    expect(cropRadios.length).toBeGreaterThan(0);
  });

  it('renders "Open in new window" button', () => {
    render(<SettingsPanel {...defaultProps} />);
    const buttons = screen.getAllByRole('button', { name: /open in new window/i });
    expect(buttons.length).toBeGreaterThan(0);
  });
});
