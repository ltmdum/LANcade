import { buildPodiumFromScores, medalEmojiForPodium } from '@lancade/shared';

interface UndercoverScoreBoardProps {
  scores: Record<string, number>;
  roundPoints: Record<string, number>;
  winningScore: number;
  playerLookup: Record<string, string>;
  winnerIds: string[];
}

export function UndercoverScoreBoard({
  scores,
  roundPoints,
  winningScore,
  playerLookup,
  winnerIds,
}: UndercoverScoreBoardProps) {
  const entries = Object.entries(scores)
    .sort(([, a], [, b]) => b - a);

  if (entries.length === 0) return null;

  const { podium, playerCount } = buildPodiumFromScores(entries.map(([id, score]) => [(playerLookup[id] || id), score]));

  return (
    <div className="undercover-scoreboard">
      <div className="undercover-scoreboard-header">
        Scores (Target: {winningScore})
      </div>
      {entries.map(([playerId, score]) => {
        const isWinner = winnerIds.includes(playerId);
        const roundPointsForPlayer = roundPoints[playerId];
        const showRoundPoints = roundPointsForPlayer > 0;
        const name = playerLookup[playerId] || playerId;
        return (
          <div
            key={playerId}
            className={`undercover-score-row ${isWinner ? 'undercover-score-row--winner' : ''}`}
          >
            <span className="undercover-score-name">
              {medalEmojiForPodium(podium, playerCount, name)} {name}
            </span>
            <span className="undercover-score-value">
              {showRoundPoints && <span className="undercover-score-round">+{roundPointsForPlayer}</span>}
              {score}
            </span>
          </div>
        );
      })}
    </div>
  );
}
