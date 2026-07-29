import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { OlympicsMedals } from '../../components/OlympicsMedals';

const sampleTally = {
  Alice: { gold: 3, silver: 1, bronze: 0, total: 4 },
  Bob: { gold: 1, silver: 2, bronze: 1, total: 4 },
  Charlie: { gold: 0, silver: 1, bronze: 3, total: 4 },
};

const samplePlayers = [
  { id: '1', name: 'Alice' },
  { id: '2', name: 'Bob' },
  { id: '3', name: 'Charlie' },
];

describe('OlympicsMedals', () => {
  it('renders title', () => {
    render(<OlympicsMedals tally={sampleTally} players={samplePlayers} />);
    expect(screen.getByText(/Medal Tally/)).toBeInTheDocument();
  });

  it('renders column headers', () => {
    render(<OlympicsMedals tally={sampleTally} players={samplePlayers} />);
    expect(screen.getByText('Player')).toBeInTheDocument();
    expect(screen.getByText('Total')).toBeInTheDocument();
  });

  it('renders all player rows', () => {
    render(<OlympicsMedals tally={sampleTally} players={samplePlayers} />);
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.getByText('Charlie')).toBeInTheDocument();
  });

  it('displays medal counts', () => {
    render(<OlympicsMedals tally={sampleTally} players={samplePlayers} />);
    const rows = screen.getAllByRole('row');
    // header + 3 data rows
    expect(rows).toHaveLength(4);
  });

  it('sorts by gold medals descending', () => {
    render(<OlympicsMedals tally={sampleTally} players={samplePlayers} />);
    const rows = screen.getAllByRole('row');
    // First data row should be Alice (3 gold)
    expect(rows[1]).toHaveTextContent('Alice');
    expect(rows[1]).toHaveTextContent('3');
    // Second data row should be Bob (1 gold)
    expect(rows[2]).toHaveTextContent('Bob');
    expect(rows[2]).toHaveTextContent('1');
  });

  it('returns null for empty tally and no players', () => {
    const { container } = render(<OlympicsMedals tally={{}} players={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('shows players even with zero medals', () => {
    render(<OlympicsMedals tally={{}} players={samplePlayers} />);
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.getByText('Charlie')).toBeInTheDocument();
    // All should show zero counts
    const rows = screen.getAllByRole('row');
    expect(rows).toHaveLength(4);
    const cells = screen.getAllByRole('cell');
    // All medal cells should be 0 for all players
    expect(cells[1]).toHaveTextContent('0');
    expect(cells[2]).toHaveTextContent('0');
    expect(cells[3]).toHaveTextContent('0');
    expect(cells[4]).toHaveTextContent('0');
  });

  it('renders single player', () => {
    render(<OlympicsMedals tally={{
      Alice: { gold: 1, silver: 0, bronze: 0, total: 1 },
    }} players={[{ id: '1', name: 'Alice' }]} />);
    expect(screen.getByText('Alice')).toBeInTheDocument();
    const countCells = screen.getAllByRole('cell');
    expect(countCells).toHaveLength(5);
    expect(countCells[1]).toHaveTextContent('1');
    expect(countCells[4]).toHaveTextContent('1');
  });

  it('shows total column', () => {
    render(<OlympicsMedals tally={{
      Alice: { gold: 2, silver: 1, bronze: 3, total: 6 },
    }} players={[{ id: '1', name: 'Alice' }]} />);
    const cells = screen.getAllByRole('cell');
    const totalCell = cells[cells.length - 1];
    expect(totalCell).toHaveTextContent('6');
  });
});
