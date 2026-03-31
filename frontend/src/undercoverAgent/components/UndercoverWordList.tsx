import type { UndercoverSubmission } from '@lancade/shared';

interface UndercoverWordListProps {
  submissions: UndercoverSubmission[];
}

/**
 * Display a table of all player submissions across rounds.
 * Each row shows a player's name and their submitted words.
 * @param props Word list props.
 * @returns Word list table element.
 */
export function UndercoverWordList({ submissions }: UndercoverWordListProps) {
  if (submissions.length === 0) {
    return <p className="undercover-turn-info">No submissions yet.</p>;
  }

  const maxWords = Math.max(...submissions.map((s) => s.words.length), 1);
  const roundHeaders = Array.from({ length: maxWords }, (_, i) => `R${i + 1}`);

  return (
    <table className="undercover-submissions-table">
      <thead>
        <tr>
          <th>Player</th>
          {roundHeaders.map((header) => (
            <th key={header}>{header}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {submissions.map((sub) => (
          <tr key={sub.playerId}>
            <td>{sub.playerName}</td>
            {roundHeaders.map((_, i) => (
              <td key={i}>{sub.words[i] || '-'}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
