/**
 * Join as a player and get an assigned id.
 * @param name Player name.
 * @param playerId Existing player id or null.
 * @param key Access key from the invite URL.
 * @returns Response and parsed payload.
 */
export async function joinPlayer(name: string, playerId: string | null, key: string) {
  const response = await fetch('/api/players/join', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: name.trim(), playerId, key }),
  });
  return { response, data: await response.json() };
}

/**
 * Select a game as admin.
 * @param gameId Game identifier.
 * @param key Admin access key.
 * @returns Response and parsed payload.
 */
export async function selectGame(gameId: string, key: string) {
  const response = await fetch('/api/admin/game', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ gameId, key }),
  });
  return { response, data: await response.json() };
}

/**
 * Select a category as admin.
 * @param category Category name.
 * @param key Admin access key.
 * @returns Response and parsed payload.
 */
export async function selectCategory(category: string, key: string) {
  const response = await fetch('/api/admin/category', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ category, key }),
  });
  return { response, data: await response.json() };
}

/**
 * Select random categories as admin.
 * @param key Admin access key.
 * @param count Optional number of categories to select.
 * @returns Response and parsed payload.
 */
export async function selectRandomCategory(key: string, count?: number) {
  const response = await fetch('/api/admin/category', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ random: true, count, key }),
  });
  return { response, data: await response.json() };
}

/**
 * Select multiple categories as admin.
 * @param categories Categories to select.
 * @param key Admin access key.
 * @returns Response and parsed payload.
 */
export async function selectCategories(categories: string[], key: string) {
  const response = await fetch('/api/admin/category', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ categories, key }),
  });
  return { response, data: await response.json() };
}

/**
 * Add a custom category as admin.
 * @param category Category name to add.
 * @param key Admin access key.
 * @returns Response and parsed payload.
 */
export async function addCustomCategory(category: string, key: string) {
  const response = await fetch('/api/admin/category', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ addCustom: category, key }),
  });
  return { response, data: await response.json() };
}

/**
 * Start a new round as admin.
 * @param durationMs Round duration in milliseconds.
 * @param key Admin access key.
 * @returns Response and parsed payload.
 */
export async function startRound(durationMs: number, key: string) {
  const response = await fetch('/api/admin/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ durationMs, key }),
  });
  return { response, data: await response.json() };
}

/**
 * Submit a word during the round.
 * @param playerId Player identifier.
 * @param word Submitted word.
 * @param key Access key (player or admin).
 * @param category Optional category selection.
 * @returns Response and parsed payload.
 */
export async function submitWord(playerId: string, word: string, key: string, category?: string) {
  const response = await fetch('/api/round/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ playerId, word, category, key }),
  });
  return { response, data: await response.json() };
}

/**
 * Mark a player finished with the round.
 * @param playerId Player identifier.
 * @param roundId Round identifier.
 * @param key Access key (player or admin).
 * @returns Response and parsed payload.
 */
export async function finishRound(playerId: string, roundId: number, key: string) {
  const response = await fetch('/api/round/finish', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ playerId, roundId, key }),
  });
  return { response, data: await response.json() };
}

/**
 * Submit votes for the current voting phase.
 * @param playerId Player identifier.
 * @param votes Vote payload or decision.
 * @param key Access key (player or admin).
 * @returns Response and parsed payload.
 */
export async function submitVotes(playerId: string, votes: string[] | { decision: string }, key: string) {
  const body: Record<string, unknown> = { playerId, key };
  if (Array.isArray(votes)) {
    body.downvotedWordIds = votes;
  } else {
    body.decision = votes.decision;
  }
  const response = await fetch('/api/round/votes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { response, data: await response.json() };
}

/**
 * Eject a player as admin.
 * @param playerId Player identifier.
 * @param key Admin access key.
 * @returns Response and parsed payload.
 */
export async function ejectPlayer(playerId: string, key: string) {
  const response = await fetch('/api/admin/eject', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ playerId, key }),
  });
  return { response, data: await response.json() };
}

/**
 * End the current game early as admin.
 * @param key Admin access key.
 * @returns Response and parsed payload.
 */
export async function endGame(key: string) {
  const response = await fetch('/api/admin/end', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key }),
  });
  return { response, data: await response.json() };
}

/**
 * Send a game-specific action from a player.
 * @param playerId Player identifier.
 * @param action Game-specific action payload.
 * @param key Access key (player or admin).
 * @returns Response and parsed payload.
 */
export async function gameAction(playerId: string, action: unknown, key: string) {
  const response = await fetch('/api/round/action', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ playerId, action, key }),
  });
  return { response, data: await response.json() };
}

/**
 * Update game-specific admin settings.
 * @param settings Key-value settings to update.
 * @param key Admin access key.
 * @returns Response and parsed payload.
 */
export async function updateGameSettings(settings: Record<string, unknown>, key: string) {
  const response = await fetch('/api/admin/settings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ settings, key }),
  });
  return { response, data: await response.json() };
}
