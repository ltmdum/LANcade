import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { GameInfoModal } from '../../components/GameInfoModal';

const defaultProps = {
  name: 'Test Game',
  description: 'A short description of the game.',
  instructions: ['Step one.', 'Step two.', 'Step three.'],
  onClose: vi.fn(),
};

describe('GameInfoModal', () => {
  it('renders game name and description', () => {
    render(<GameInfoModal {...defaultProps} />);
    expect(screen.getByText('Test Game')).toBeInTheDocument();
    expect(screen.getByText('A short description of the game.')).toBeInTheDocument();
  });

  it('renders all instruction steps', () => {
    render(<GameInfoModal {...defaultProps} />);
    expect(screen.getByText('Step one.')).toBeInTheDocument();
    expect(screen.getByText('Step two.')).toBeInTheDocument();
    expect(screen.getByText('Step three.')).toBeInTheDocument();
  });

  it('renders instructions as an unordered list', () => {
    render(<GameInfoModal {...defaultProps} />);
    const list = screen.getByRole('list');
    expect(list.tagName).toBe('UL');
    expect(list.children).toHaveLength(3);
  });

  it('calls onClose when close button is clicked', () => {
    const onClose = vi.fn();
    render(<GameInfoModal {...defaultProps} onClose={onClose} />);
    fireEvent.click(screen.getByLabelText('Close'));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('calls onClose when overlay is clicked', () => {
    const onClose = vi.fn();
    const { container } = render(<GameInfoModal {...defaultProps} onClose={onClose} />);
    fireEvent.click(container.querySelector('.game-info-overlay')!);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('does not close when modal content is clicked', () => {
    const onClose = vi.fn();
    const { container } = render(<GameInfoModal {...defaultProps} onClose={onClose} />);
    fireEvent.click(container.querySelector('.game-info-modal')!);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('calls onClose on Escape key', () => {
    const onClose = vi.fn();
    render(<GameInfoModal {...defaultProps} onClose={onClose} />);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledOnce();
  });
});
