import { Panel } from '../../shared/components/Panel';
import type { PlayerWordResult } from '@lancade/shared';
import './PlayerResults.css';

interface PlayerResultsProps {
  words: PlayerWordResult[];
  /** For multi-category games, show the category in brackets under each word */
  showCategory?: boolean;
}

/**
 * Map result status to a display emoji.
 * @param status Result status string.
 * @param blockedByName Name of blocker if any.
 * @returns Emoji string for the status.
 */
function statusEmoji(status: string | null, blockedByName: string | null): string {
  if (status === 'accepted') return '✅';
  if (blockedByName) return '⛔';
  if (status === null) return '-';
  return '❌';
}

/**
 * Transposed results table: each submitted word is a column, with the player's
 * status, downvotes and blockers as the fixed row headings. The table overflows
 * its container and scrolls horizontally, keeping the row-heading column fixed
 * on the left for the whole scroll range.
 * @param props Player results props.
 * @returns Player results element.
 */
export function PlayerResults({ words, showCategory = false }: PlayerResultsProps) {
  if (words.length === 0) {
    return (
      <Panel title="Your Results">
        <p>No words this round.</p>
      </Panel>
    );
  }

  return (
    <Panel title="Your Results">
      <div className="player-results-table-container">
        <table className="player-results-table">
          <thead>
            <tr>
              <th className="player-results-fixed-col player-results-heading">
                <div className="player-results-fixed-content">Word</div>
              </th>
              {words.map((word) => (
                <th
                  key={`${word.word}-${word.category ?? ''}`}
                  className="player-results-heading player-results-word-heading"
                >
                  <span className="player-results-word">{word.word}</span>
                  {showCategory && word.category && (
                    <span className="player-results-category">({word.category})</span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <th className="player-results-fixed-col">
                <div className="player-results-fixed-content">Status</div>
              </th>
              {words.map((word) => (
                <td key={`${word.word}-${word.category ?? ''}`}>
                  {statusEmoji(word.status, word.blockedByName)}
                </td>
              ))}
            </tr>
            <tr>
              <th className="player-results-fixed-col">
                <div className="player-results-fixed-content">Votes to Reject</div>
              </th>
              {words.map((word) => (
                <td key={`${word.word}-${word.category ?? ''}`}>
                  {word.downvotedByNames.length > 0 ? word.downvotedByNames.join(', ') : '-'}
                </td>
              ))}
            </tr>
            <tr>
              <th className="player-results-fixed-col">
                <div className="player-results-fixed-content">Already Taken</div>
              </th>
              {words.map((word) => (
                <td key={`${word.word}-${word.category ?? ''}`}>{word.blockedByName || '-'}</td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
