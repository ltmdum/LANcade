import type { MedalTally } from '@lancade/shared';
import { Panel } from './Panel';
import './OlympicsMedals.css';

interface OlympicsMedalsProps {
  tally: MedalTally;
  players: { id: string; name: string }[];
  playerName?: string;
}

export function OlympicsMedals({ tally, players, playerName }: OlympicsMedalsProps) {
  const playerNames = [...new Set([
    ...Object.keys(tally),
    ...players.map(p => p.name),
  ])];

  const entries = playerNames
    .map(name => ({
      name,
      medals: tally[name] || { gold: 0, silver: 0, bronze: 0, total: 0 },
    }))
    .sort((a, b) => b.medals.gold - a.medals.gold || b.medals.silver - a.medals.silver || b.medals.bronze - a.medals.bronze);

  if (entries.length === 0) return null;

  return (
    <Panel title="Medal Tally">
      <table className="olympics-medals-table">
        <thead>
          <tr>
            <th>Player</th>
            <th aria-label="Gold">🥇</th>
            <th aria-label="Silver">🥈</th>
            <th aria-label="Bronze">🥉</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {entries.map(({ name, medals }) => (
            <tr key={name} className={name === playerName ? 'olympics-current-player' : undefined}>
              <td className="olympics-player-name">{name}</td>
              <td className="olympics-medal-count">{medals.gold}</td>
              <td className="olympics-medal-count">{medals.silver}</td>
              <td className="olympics-medal-count">{medals.bronze}</td>
              <td className="olympics-medal-count">{medals.total}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Panel>
  );
}
