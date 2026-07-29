import { Panel } from '../../shared/components/Panel';
import type { MindMatchRoundResult } from '@lancade/shared';
import './ResultsPanel.css';

interface ResultsPanelProps {
  result: MindMatchRoundResult;
}

/**
 * Panel displaying round results.
 * @param props Results panel props.
 * @returns Results panel element.
 */
export function ResultsPanel({ result }: ResultsPanelProps) {
  return (
    <Panel title="Round Results">
      <div className="results-panel-groups">
        {result.groups.map((group, index) => (
          <div
            key={index}
            className={`results-panel-group ${group.points > 0 ? 'scored' : 'no-score'}`}
          >
            <div className="results-panel-word">{group.word.toLowerCase()}</div>
            <div className="results-panel-players">
              {group.playerNames.join(', ')}
            </div>
            <div className="results-panel-points">
              {group.points > 0 ? `+${group.points} each` : 'No points'}
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}
