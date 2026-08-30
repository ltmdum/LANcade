/** Outcome of a resolved round, applied by the calling engine. */
export interface RoundOutcome {
  roundPoints: Record<string, number>;
  winnerIsUndercover: boolean;
  finishReason: string;
}

interface RoundOutcomeParams {
  participants: string[];
  undercoverPlayerId: string;
  currentVotes: Map<string, string>;
  scores: Record<string, number>;
}

/**
 * Ensure every participant has a score entry.
 * @param participants Participant player IDs.
 * @param scores Score record to initialize.
 */
function initScores(participants: string[], scores: Record<string, number>): void {
  for (const pid of participants) {
    scores[pid] = scores[pid] || 0;
  }
}

/**
 * Award points to voters who voted for the undercover agent.
 * @param currentVotes Map of voter ID to target ID.
 * @param undercoverPlayerId The agent's player ID.
 * @param roundPoints Round points record to update.
 * @param scores Score record to update.
 */
function awardCorrectVoters(
  currentVotes: Map<string, string>,
  undercoverPlayerId: string,
  roundPoints: Record<string, number>,
  scores: Record<string, number>
): void {
  for (const [voterId, targetId] of currentVotes.entries()) {
    if (targetId === undercoverPlayerId) {
      scores[voterId] += 1;
      roundPoints[voterId] += 1;
    }
  }
}

/**
 * Compute the outcome when the round ends without the secret word being
 * submitted: agent caught by vote (with optional final guess) or surviving.
 * @param params Round context including agentWasCaught/agentGuessedCorrectly.
 * @returns Round outcome with updated scores mutated in place.
 */
export function computeRoundOutcome(params: RoundOutcomeParams & {
  agentWasCaught: boolean;
  agentGuessedCorrectly: boolean | null;
}): RoundOutcome {
  const { participants, undercoverPlayerId, currentVotes, scores } = params;
  const roundPoints: Record<string, number> = {};
  for (const pid of participants) {
    roundPoints[pid] = 0;
  }

  if (!params.agentWasCaught) {
    initScores(participants, scores);
    scores[undercoverPlayerId] += 3;
    roundPoints[undercoverPlayerId] = 3;
    awardCorrectVoters(currentVotes, undercoverPlayerId, roundPoints, scores);
    return { roundPoints, winnerIsUndercover: true, finishReason: 'wrong_vote' };
  }

  if (params.agentGuessedCorrectly) {
    initScores(participants, scores);
    scores[undercoverPlayerId] += 1;
    roundPoints[undercoverPlayerId] = 1;
    awardCorrectVoters(currentVotes, undercoverPlayerId, roundPoints, scores);
    return {
      roundPoints,
      winnerIsUndercover: true,
      finishReason: 'agent_final_guess_correct',
    };
  }

  initScores(participants, scores);
  for (const pid of participants) {
    if (pid !== undercoverPlayerId) {
      scores[pid] += 1;
      roundPoints[pid] = 1;
    }
  }
  awardCorrectVoters(currentVotes, undercoverPlayerId, roundPoints, scores);
  return {
    roundPoints,
    winnerIsUndercover: false,
    finishReason: params.agentGuessedCorrectly === null ? 'wrong_vote' : 'agent_final_guess_wrong',
  };
}

/**
 * Compute the outcome when someone submits the secret word:
 * the agent immediately wins the round for 2 points.
 * @param params Round context including who submitted the word.
 * @returns Round outcome with updated scores mutated in place.
 */
export function computeSecretWordOutcome(params: RoundOutcomeParams & {
  revealerId: string;
}): RoundOutcome {
  const { participants, undercoverPlayerId, scores } = params;
  const roundPoints: Record<string, number> = {};
  initScores(participants, scores);
  for (const pid of participants) {
    roundPoints[pid] = 0;
  }
  scores[undercoverPlayerId] += 2;
  roundPoints[undercoverPlayerId] = 2;
  return {
    roundPoints,
    winnerIsUndercover: true,
    finishReason: params.revealerId === undercoverPlayerId
      ? 'agent_found_word'
      : 'civilian_revealed_word',
  };
}

/**
 * Check for a winner after score updates.
 * Among players at or above winningScore, the highest scorer wins.
 * If multiple players share the highest score, they all win (tie).
 * @param scores Score record.
 * @param winningScore Score required to qualify.
 * @returns Array of winning player IDs (empty when nobody qualified).
 */
export function checkForWinner(
  scores: Record<string, number>,
  winningScore: number
): string[] {
  const qualified: { id: string; score: number }[] = [];
  for (const [playerId, score] of Object.entries(scores)) {
    if (score >= winningScore) {
      qualified.push({ id: playerId, score });
    }
  }

  if (qualified.length === 0) {
    return [];
  }

  const maxScore = Math.max(...qualified.map((p) => p.score));
  const topPlayers = qualified.filter((p) => p.score === maxScore);

  if (topPlayers.length === 1) {
    return [topPlayers[0].id];
  }
  return topPlayers.map((p) => p.id);
}
