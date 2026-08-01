import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PlayerResults } from '../components/PlayerResults';
import type { PlayerWordResult } from '@lancade/shared';

const accepted: PlayerWordResult = {
  word: 'Apple',
  category: 'Animals',
  status: 'accepted',
  blockedByName: null,
  downvotedByNames: [],
};

const downvotedAccepted: PlayerWordResult = {
  word: 'Banana',
  category: 'Food',
  status: 'accepted',
  blockedByName: null,
  downvotedByNames: ['Bob', 'Carol'],
};

const votedOut: PlayerWordResult = {
  word: 'Cherry',
  category: 'Food',
  status: 'voted_out',
  blockedByName: null,
  downvotedByNames: ['Bob'],
};

const blocked: PlayerWordResult = {
  word: 'Dates',
  category: 'Food',
  status: 'rejected',
  blockedByName: 'Dave',
  downvotedByNames: [],
};

describe('PlayerResults', () => {
  it('renders the words as column headings', () => {
    render(<PlayerResults words={[accepted, downvotedAccepted, votedOut, blocked]} />);
    expect(screen.getByText('Word')).toBeInTheDocument();
    expect(screen.getByText('Apple')).toBeInTheDocument();
    expect(screen.getByText('Banana')).toBeInTheDocument();
    expect(screen.getByText('Cherry')).toBeInTheDocument();
    expect(screen.getByText('Dates')).toBeInTheDocument();
  });

  it('renders the fixed row headings without category by default', () => {
    render(<PlayerResults words={[accepted, downvotedAccepted]} />);
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('Votes to Reject')).toBeInTheDocument();
    expect(screen.getByText('Already Taken')).toBeInTheDocument();
    expect(screen.queryByText(/Animals/)).not.toBeInTheDocument();
  });

  it('shows the category in brackets when showCategory is set', () => {
    render(<PlayerResults words={[accepted, blocked]} showCategory />);
    expect(screen.getByText(/Animals/)).toBeInTheDocument();
    expect(screen.getByText(/Food/)).toBeInTheDocument();
    expect(screen.queryByText('Category')).not.toBeInTheDocument();
  });

  it('shows the status emoji for each word', () => {
    render(<PlayerResults words={[accepted, downvotedAccepted, votedOut, blocked]} />);
    expect(screen.getAllByText('✅').length).toBe(2);
    expect(screen.getByText('❌')).toBeInTheDocument();
    expect(screen.getByText('⛔')).toBeInTheDocument();
  });

  it('lists the players who voted to reject each word', () => {
    render(<PlayerResults words={[accepted, downvotedAccepted, votedOut]} />);
    expect(screen.getByText('Bob, Carol')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.getAllByText('-').length).toBeGreaterThan(0);
  });

  it('lists the player who took each word', () => {
    render(<PlayerResults words={[accepted, blocked]} />);
    expect(screen.getByText('Dave')).toBeInTheDocument();
  });

  it('renders a fallback when there are no words', () => {
    render(<PlayerResults words={[]} />);
    expect(screen.getByText(/no words this round/i)).toBeInTheDocument();
  });
});
