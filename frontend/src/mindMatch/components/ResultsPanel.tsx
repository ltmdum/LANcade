import { Panel } from '../../shared/components/Panel';
import type { MindMatchRoundResult } from '@lancade/shared';
import './ResultsPanel.css';

interface ResultsPanelProps {
  result: MindMatchRoundResult;
  playerLookup: Record<string, string>;
}

/**
 * Panel displaying round results.
 * @param props Results panel props.
 * @returns Results panel element.
 */
export function ResultsPanel({ result, playerLookup }: ResultsPanelProps) {
  return (
    <Panel title="Round Results">
      <div className="results-panel-groups">
        {result.groups.map((group, index) => (
          <div
            key={index}
            className={`results-panel-group ${group.points > 0 ? 'scored' : 'no-score'}`}
          >
            <div className="results-panel-word">"{group.word}"</div>
            <div className="results-panel-players">
              {group.playerNames.join(', ')}
            </div>
            <div className="results-panel-points">
              {group.points > 0 ? `+${group.points} each` : 'No points'}
            </div>
          </div>
        ))}
      </div>

      <div className="results-panel-changes">
        <h4>Score Changes</h4>
        {Object.entries(result.scoreChanges)
          .sort(([, a], [, b]) => b - a)
          .map(([playerId, change]) => (
            <div key={playerId} className="results-panel-change">
              <span className="results-panel-name">
                {playerLookup[playerId] || 'Unknown'}
              </span>
              <span className={`results-panel-delta ${change > 0 ? 'positive' : ''}`}>
                {change > 0 ? `+${change}` : change}
              </span>
            </div>
          ))}
      </div>
    </Panel>
  );
}
