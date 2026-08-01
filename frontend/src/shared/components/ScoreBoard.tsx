import { useMemo } from 'react';
import { Panel } from './Panel';
import { buildPodiumFromScores, medalEmojiForPodium } from '@lancade/shared';
import './ScoreBoard.css';

interface ScoreBoardProps {
  title: string;
  players: { id: string; name: string }[];
  scores: Record<string, number>;
  targetScore?: number;
  winnerIds?: string[];
  roundPoints?: Record<string, number>;
  ineligiblePlayerIds?: string[];
}

export function ScoreBoard({
  title,
  players,
  scores,
  targetScore,
  winnerIds,
  roundPoints,
  ineligiblePlayerIds,
}: ScoreBoardProps) {
  const sortedPlayers = useMemo(() => {
    return [...players].sort((a, b) => (scores[b.id] || 0) - (scores[a.id] || 0));
  }, [players, scores]);

  const { podium, playerCount } = useMemo(
    () => buildPodiumFromScores(sortedPlayers.map(p => [p.name, scores[p.id] || 0])),
    [sortedPlayers, scores],
  );

  return (
    <Panel title={title}>
      {targetScore !== undefined && (
        <p className="live-scoreboard-target">First to {targetScore} wins!</p>
      )}
      <ul className="live-scoreboard-list">
        {sortedPlayers.map((player) => {
          const isIneligible = ineligiblePlayerIds?.includes(player.id);
          const isWinner = winnerIds?.includes(player.id);
          const rowClass = [
            'live-scoreboard-row',
            isIneligible ? 'live-scoreboard-row--ineligible' : '',
            isWinner ? 'live-scoreboard-row--winner' : '',
          ].filter(Boolean).join(' ');
          return (
            <li key={player.id} className={rowClass}>
              <span className="live-scoreboard-name">
                {medalEmojiForPodium(podium, playerCount, player.name)} {player.name}
                {isIneligible ? ' (out)' : ''}
              </span>
              <span className="live-scoreboard-value">
                {roundPoints && (roundPoints[player.id] || 0) > 0 && (
                  <span className="live-scoreboard-round">+{roundPoints[player.id]}</span>
                )}
                {scores[player.id] || 0}
              </span>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}
