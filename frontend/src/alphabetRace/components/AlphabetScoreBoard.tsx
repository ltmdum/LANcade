import { useMemo } from 'react';
import { Panel } from '../../shared/components/Panel';
import type { PlayerInfo } from '@lancade/shared';
import '../../alphabetRace/AlphabetRaceGame.css';

interface AlphabetScoreBoardProps {
  players: PlayerInfo[];
  scores: Record<string, number>;
  ineligiblePlayerIds: string[];
  participants: string[];
}

/**
 * Scoreboard for Alphabet Race showing player scores sorted descending.
 * Highlights ineligible (sitting out) players.
 * @param props Score board props.
 * @returns Score board element.
 */
export function AlphabetScoreBoard({
  players,
  scores,
  ineligiblePlayerIds,
  participants,
}: AlphabetScoreBoardProps) {
  const sortedPlayers = useMemo(() => {
    return players
      .filter((p) => participants.includes(p.id))
      .sort((a, b) => (scores[b.id] || 0) - (scores[a.id] || 0));
  }, [players, scores, participants]);

  return (
    <Panel title="Scores">
      <ul className="alphabet-score-list">
        {sortedPlayers.map((player) => {
          const isIneligible = ineligiblePlayerIds.includes(player.id);
          const className = [
            'alphabet-score-item',
            isIneligible ? 'alphabet-score-item--ineligible' : '',
          ]
            .filter(Boolean)
            .join(' ');
          return (
            <li key={player.id} className={className}>
              <span>{player.name}{isIneligible ? ' (out)' : ''}</span>
              <span>{scores[player.id] || 0}</span>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}
