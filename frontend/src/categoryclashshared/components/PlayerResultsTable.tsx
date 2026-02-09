import { useMemo } from 'react';
import { Panel } from '../../shared/components/Panel';
import type { PlayerWordResult } from '@lancade/shared';
import './PlayerResultsTable.css';

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

interface DisplayRow {
  category: string | null;
  word: string | null;
  status: 'accepted' | 'voted_out' | 'rejected' | null;
  blockedByName: string | null;
  downvotedByNames: string[];
}

interface PlayerResultsTableProps {
  words: PlayerWordResult[];
  showCategory?: boolean;
  /** For multi-category games, provide all categories to show missing ones */
  categories?: string[];
}

/**
 * Table view for a player's submitted words and results.
 * @param props Player results table props.
 * @returns Player results table element.
 */
export function PlayerResultsTable({ 
  words, 
  showCategory = false,
  categories,
}: PlayerResultsTableProps) {
  // Build display rows, including missing categories if provided
  const displayRows = useMemo((): DisplayRow[] => {
    if (!showCategory || !categories || categories.length === 0) {
      // No categories to fill in - just show words as-is
      return words.map((w) => ({
        category: w.category,
        word: w.word,
        status: w.status,
        blockedByName: w.blockedByName,
        downvotedByNames: w.downvotedByNames,
      }));
    }

    // Build a map of category -> word result
    const wordByCategory = new Map<string, PlayerWordResult>();
    for (const word of words) {
      if (word.category) {
        wordByCategory.set(word.category, word);
      }
    }

    // Create rows for all categories in order
    return categories.map((category): DisplayRow => {
      const wordResult = wordByCategory.get(category);
      if (wordResult) {
        return {
          category: wordResult.category,
          word: wordResult.word,
          status: wordResult.status,
          blockedByName: wordResult.blockedByName,
          downvotedByNames: wordResult.downvotedByNames,
        };
      }
      // No submission for this category
      return {
        category,
        word: null,
        status: null,
        blockedByName: null,
        downvotedByNames: [],
      };
    });
  }, [words, showCategory, categories]);

  return (
    <Panel title="Your Results">
      <div className="results-table-container">
        <table className="results-table">
          <thead>
            <tr className="player-results-header-row">
              {showCategory && <th>Category</th>}
              <th>Word</th>
              <th>Status</th>
              <th>Blocked By</th>
              <th>Downvoted By</th>
            </tr>
          </thead>
          <tbody>
            {displayRows.map((entry, index) => (
              <tr key={`${entry.category || entry.word}-${index}`}>
                {showCategory && <td>{entry.category || '-'}</td>}
                <td>{entry.word || '-'}</td>
                <td>{statusEmoji(entry.status, entry.blockedByName)}</td>
                <td>{entry.blockedByName || '-'}</td>
                <td>{entry.downvotedByNames.length > 0 ? entry.downvotedByNames.join(', ') : '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
