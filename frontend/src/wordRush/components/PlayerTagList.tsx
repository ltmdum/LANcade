import { Panel } from '../../shared/components/Panel';
import type { PlayerInfo } from '@lancade/shared';
import './PlayerTagList.css';

interface PlayerTagListProps {
  players: PlayerInfo[];
  eliminatedIds: string[];
}

/**
 * Display player tags with eliminated styling.
 * @param props Player tag list props.
 * @returns Player tag list element.
 */
export function PlayerTagList({ players, eliminatedIds }: PlayerTagListProps) {
  return (
    <Panel title="Players">
      <div className="player-tag-list">
        {players.map((player) => (
          <span
            key={player.id}
            className={`tag ${eliminatedIds.includes(player.id) ? 'player-tag-eliminated' : ''}`}
          >
            {player.name}
          </span>
        ))}
      </div>
    </Panel>
  );
}
