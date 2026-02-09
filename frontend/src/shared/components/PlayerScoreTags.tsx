import './PlayerScoreTags.css';

interface PlayerScoreTagsProps {
  playerName?: string;
  score: number;
  extraTags?: React.ReactNode;
}

/**
 * Display tags for player name and score.
 * @param props Player score tag props.
 * @returns Player score tags element.
 */
export function PlayerScoreTags({ playerName, score, extraTags }: PlayerScoreTagsProps) {
  return (
    <div className="player-score-tags">
      {playerName && <span className="tag">Player: {playerName}</span>}
      <span className="tag">Score: {score}</span>
      {extraTags}
    </div>
  );
}
