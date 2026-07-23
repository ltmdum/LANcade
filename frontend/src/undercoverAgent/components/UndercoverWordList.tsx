import type { UndercoverSubmission } from '@lancade/shared';

interface UndercoverWordListProps {
  submissions: UndercoverSubmission[];
}

export function UndercoverWordList({ submissions }: UndercoverWordListProps) {
  if (submissions.length === 0) {
    return <p className="undercover-turn-info">No submissions yet.</p>;
  }

  return (
    <table className="undercover-submissions-table">
      <tbody>
        {submissions.map((sub) => (
          <tr key={sub.playerId}>
            <td><strong>{sub.playerName}</strong></td>
            <td>{sub.words[0] || '-'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
