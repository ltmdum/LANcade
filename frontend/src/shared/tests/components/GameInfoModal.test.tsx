import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { GameInfoModal } from '../../components/GameInfoModal';

const defaultProps = {
  name: 'Test Game',
  description: 'A short description of the game.',
  instructions: [{ heading: 'Step one', text: 'Do this first.' }, { heading: 'Step two', text: 'Do this second.' }, { heading: 'Step three', text: 'Do this third.' }],
  gameId: 'testgame',
  onClose: vi.fn(),
};

function getToggle() {
  return screen.getByRole('button', { name: /how to play/i });
}

describe('GameInfoModal', () => {
  it('renders game name and description', () => {
    render(<GameInfoModal {...defaultProps} />);
    expect(screen.getByText('Test Game')).toBeInTheDocument();
    expect(screen.getByText('A short description of the game.')).toBeInTheDocument();
  });

  it('starts with instructions collapsed', () => {
    render(<GameInfoModal {...defaultProps} />);
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });

  it('shows instructions when toggle is clicked', () => {
    render(<GameInfoModal {...defaultProps} />);
    fireEvent.click(getToggle());
    const items = screen.getAllByRole('listitem');
    expect(items[0]).toHaveTextContent('Step one: Do this first.');
    expect(items[1]).toHaveTextContent('Step two: Do this second.');
    expect(items[2]).toHaveTextContent('Step three: Do this third.');
  });

  it('renders expanded instructions as an unordered list', () => {
    render(<GameInfoModal {...defaultProps} />);
    fireEvent.click(getToggle());
    const list = screen.getByRole('list');
    expect(list.tagName).toBe('UL');
    expect(list.children).toHaveLength(3);
  });

  it('hides instructions when toggle is clicked twice', () => {
    render(<GameInfoModal {...defaultProps} />);
    fireEvent.click(getToggle());
    expect(screen.getByRole('list')).toBeInTheDocument();
    fireEvent.click(getToggle());
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });

  it('renders a link to the online docs', () => {
    render(<GameInfoModal {...defaultProps} gameId="quickfire" />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', 'https://ltmdum.github.io/LANcade/games/quickfire.html');
    expect(link).toHaveAttribute('target', '_blank');
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
