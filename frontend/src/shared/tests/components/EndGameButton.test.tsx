import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { EndGameButton } from '../../components/EndGameButton';

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

describe('EndGameButton component', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the End Game button', () => {
    render(
      <EndGameButton
        accessKey="admin-123"
        onUnauthorized={vi.fn()}
        onEnded={vi.fn()}
      />
    );

    expect(screen.getByRole('button', { name: /end game/i })).toBeInTheDocument();
  });

  it('disables button when accessKey is empty', () => {
    render(
      <EndGameButton
        accessKey=""
        onUnauthorized={vi.fn()}
        onEnded={vi.fn()}
      />
    );

    expect(screen.getByRole('button', { name: /end game/i })).toBeDisabled();
  });

  it('enables button when accessKey is provided', () => {
    render(
      <EndGameButton
        accessKey="admin-123"
        onUnauthorized={vi.fn()}
        onEnded={vi.fn()}
      />
    );

    expect(screen.getByRole('button', { name: /end game/i })).toBeEnabled();
  });

  it('shows confirmation popup when button is clicked', () => {
    render(
      <EndGameButton
        accessKey="admin-123"
        onUnauthorized={vi.fn()}
        onEnded={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /end game/i }));

    expect(screen.getByText(/are you sure/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    // There are now two "End Game" buttons - the original and the confirm one
    expect(screen.getAllByRole('button', { name: /end game/i }).length).toBe(2);
  });

  it('hides confirmation popup when cancel is clicked', () => {
    render(
      <EndGameButton
        accessKey="admin-123"
        onUnauthorized={vi.fn()}
        onEnded={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /end game/i }));
    expect(screen.getByText(/are you sure/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(screen.queryByText(/are you sure/i)).not.toBeInTheDocument();
  });

  it('calls API and onEnded when confirmed successfully', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ ok: true }),
    });

    const onEnded = vi.fn();
    render(
      <EndGameButton
        accessKey="admin-123"
        onUnauthorized={vi.fn()}
        onEnded={onEnded}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /end game/i }));

    // Click the confirm button (second "End Game" button in the popup)
    const buttons = screen.getAllByRole('button', { name: /end game/i });
    fireEvent.click(buttons[1]);

    await waitFor(() => {
      expect(onEnded).toHaveBeenCalled();
    });

    expect(mockFetch).toHaveBeenCalledWith('/api/admin/end', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ key: 'admin-123' }),
    }));
  });

  it('calls onUnauthorized when API returns 401', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: () => Promise.resolve({ error: 'unauthorized' }),
    });

    const onUnauthorized = vi.fn();
    const onEnded = vi.fn();
    render(
      <EndGameButton
        accessKey="admin-123"
        onUnauthorized={onUnauthorized}
        onEnded={onEnded}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /end game/i }));
    const buttons = screen.getAllByRole('button', { name: /end game/i });
    fireEvent.click(buttons[1]);

    await waitFor(() => {
      expect(onUnauthorized).toHaveBeenCalled();
    });

    expect(onEnded).not.toHaveBeenCalled();
  });

  it('shows error message when API fails', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: () => Promise.resolve({ ok: false, reason: 'not_active' }),
    });

    render(
      <EndGameButton
        accessKey="admin-123"
        onUnauthorized={vi.fn()}
        onEnded={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /end game/i }));
    const buttons = screen.getAllByRole('button', { name: /end game/i });
    fireEvent.click(buttons[1]);

    await waitFor(() => {
      expect(screen.getByText(/no active game/i)).toBeInTheDocument();
    });
  });
});
