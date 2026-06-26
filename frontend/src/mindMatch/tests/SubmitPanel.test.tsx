import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SubmitPanel } from '../components/SubmitPanel';

// Mock fetch globally
vi.stubGlobal('fetch', vi.fn());

describe('SubmitPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders input and submit button when not submitted', () => {
    render(
      <SubmitPanel
        playerId="player-1"
        accessKey="KEY123"
        hasSubmitted={false}
        playerSubmission={undefined}
      />
    );

    expect(screen.getByRole('textbox')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /submit/i })).toBeInTheDocument();
    expect(screen.getByText(/Enter a word/)).toBeInTheDocument();
  });

  it('shows server-provided submission when available', () => {
    render(
      <SubmitPanel
        playerId="player-1"
        accessKey="KEY123"
        hasSubmitted={true}
        playerSubmission={{ playerId: 'player-1', playerName: 'Alice', word: 'serverWord' }}
      />
    );

    expect(screen.getByText(/You submitted:/)).toBeInTheDocument();
    expect(screen.getByText('serverWord')).toBeInTheDocument();
  });

  it('shows locally tracked word after successful submission', async () => {
    // Mock successful submission
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ ok: true, accepted: true }),
    });
    vi.stubGlobal('fetch', mockFetch);

    render(
      <SubmitPanel
        playerId="player-1"
        accessKey="KEY123"
        hasSubmitted={false}
        playerSubmission={undefined}
      />
    );

    const input = screen.getByRole('textbox');
    const submitButton = screen.getByRole('button', { name: /submit/i });

    fireEvent.change(input, { target: { value: 'myLocalWord' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Submitted!')).toBeInTheDocument();
    });
  });

  it('shows waiting message after submission', () => {
    render(
      <SubmitPanel
        playerId="player-1"
        accessKey="KEY123"
        hasSubmitted={true}
        playerSubmission={{ playerId: 'player-1', playerName: 'Alice', word: 'testWord' }}
      />
    );

    expect(screen.getByText(/Waiting for other players/)).toBeInTheDocument();
  });

  it('shows error when submitting empty word', async () => {
    render(
      <SubmitPanel
        playerId="player-1"
        accessKey="KEY123"
        hasSubmitted={false}
        playerSubmission={undefined}
      />
    );

    const submitButton = screen.getByRole('button', { name: /submit/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Please enter a word.')).toBeInTheDocument();
    });
  });

  it('allows updating submission when already submitted', () => {
    render(
      <SubmitPanel
        playerId="player-1"
        accessKey="KEY123"
        hasSubmitted={true}
        playerSubmission={{ playerId: 'player-1', playerName: 'Alice', word: 'firstWord' }}
      />
    );

    // Should show Update button instead of Submit
    expect(screen.getByRole('button', { name: /update/i })).toBeInTheDocument();
  });
});
