import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SubmitPanel } from '../components/SubmitPanel';
import type { MindMatchPrompt, PlayerInfo } from '@lancade/shared';

// Mock fetch globally
vi.stubGlobal('fetch', vi.fn());

const testPrompt: MindMatchPrompt = { id: 1, text: 'body', blankPosition: 'before' };
const testPlayers: PlayerInfo[] = [
  { id: 'player-1', name: 'Alice' },
  { id: 'player-2', name: 'Bob' },
  { id: 'player-3', name: 'Charlie' },
];

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
        prompt={testPrompt}
        players={testPlayers}
        submittedPlayerIds={[]}
      />
    );

    expect(screen.getByRole('textbox')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /submit/i })).toBeInTheDocument();
  });

  it('shows server-provided submission when available', () => {
    render(
      <SubmitPanel
        playerId="player-1"
        accessKey="KEY123"
        hasSubmitted={true}
        playerSubmission={{ playerId: 'player-1', playerName: 'Alice', word: 'serverWord' }}
        prompt={testPrompt}
        players={testPlayers}
        submittedPlayerIds={['player-1']}
      />
    );

    expect(screen.getByText('serverWord')).toBeInTheDocument();
    expect(screen.getByText(/Waiting for other players/)).toBeInTheDocument();
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
        prompt={testPrompt}
        players={testPlayers}
        submittedPlayerIds={[]}
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
        prompt={testPrompt}
        players={testPlayers}
        submittedPlayerIds={['player-1']}
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
        prompt={testPrompt}
        players={testPlayers}
        submittedPlayerIds={[]}
      />
    );

    const submitButton = screen.getByRole('button', { name: /submit/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Please enter a word.')).toBeInTheDocument();
    });
  });

  it('lists players who have not yet submitted', () => {
    render(
      <SubmitPanel
        playerId="player-1"
        accessKey="KEY123"
        hasSubmitted={false}
        playerSubmission={undefined}
        prompt={testPrompt}
        players={testPlayers}
        submittedPlayerIds={['player-1']}
      />
    );

    expect(screen.getByText(/Waiting for:/)).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.getByText('Charlie')).toBeInTheDocument();
  });
});
