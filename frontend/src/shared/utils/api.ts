/**
 * Send a JSON POST request and parse the JSON response.
 * @param url Request URL.
 * @param data Payload to send.
 * @param authToken Optional bearer token.
 * @returns Parsed response JSON.
 */
export async function apiPost<T>(url: string, data: unknown, authToken?: string): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }
  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
  });
  return response.json();
}

/**
 * Claim an admin session using the admin password.
 * @param password Admin password.
 * @returns Response and parsed payload.
 */
export async function claimAdmin(password: string) {
  const response = await fetch('/api/admin/claim', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: password.trim() }),
  });
  return { response, data: await response.json() };
}

/**
 * Join as a player and get an assigned id.
 * @param name Player name.
 * @param playerId Existing player id or null.
 * @param password Player password.
 * @returns Response and parsed payload.
 */
export async function joinPlayer(name: string, playerId: string | null, password: string) {
  const response = await fetch('/api/players/join', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: name.trim(), playerId, password: password.trim() }),
  });
  return { response, data: await response.json() };
}

/**
 * Select a game as admin.
 * @param gameId Game identifier.
 * @param sessionId Admin session id.
 * @returns Response and parsed payload.
 */
export async function selectGame(gameId: string, sessionId: string) {
  const response = await fetch('/api/admin/game', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${sessionId}`,
    },
    body: JSON.stringify({ gameId }),
  });
  return { response, data: await response.json() };
}

/**
 * Select a category as admin.
 * @param category Category name.
 * @param sessionId Admin session id.
 * @returns Response and parsed payload.
 */
export async function selectCategory(category: string, sessionId: string) {
  const response = await fetch('/api/admin/category', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${sessionId}`,
    },
    body: JSON.stringify({ category }),
  });
  return { response, data: await response.json() };
}

/**
 * Select random categories as admin.
 * @param sessionId Admin session id.
 * @param count Optional number of categories to select.
 * @returns Response and parsed payload.
 */
export async function selectRandomCategory(sessionId: string, count?: number) {
  const response = await fetch('/api/admin/category', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${sessionId}`,
    },
    body: JSON.stringify({ random: true, count }),
  });
  return { response, data: await response.json() };
}

/**
 * Select multiple categories as admin.
 * @param categories Categories to select.
 * @param sessionId Admin session id.
 * @returns Response and parsed payload.
 */
export async function selectCategories(categories: string[], sessionId: string) {
  const response = await fetch('/api/admin/category', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${sessionId}`,
    },
    body: JSON.stringify({ categories }),
  });
  return { response, data: await response.json() };
}

/**
 * Add a custom category as admin.
 * @param category Category name to add.
 * @param sessionId Admin session id.
 * @returns Response and parsed payload.
 */
export async function addCustomCategory(category: string, sessionId: string) {
  const response = await fetch('/api/admin/category', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${sessionId}`,
    },
    body: JSON.stringify({ addCustom: category }),
  });
  return { response, data: await response.json() };
}

/**
 * Start a new round as admin.
 * @param durationMs Round duration in milliseconds.
 * @param sessionId Admin session id.
 * @returns Response and parsed payload.
 */
export async function startRound(durationMs: number, sessionId: string) {
  const response = await fetch('/api/admin/start', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${sessionId}`,
    },
    body: JSON.stringify({ durationMs }),
  });
  return { response, data: await response.json() };
}

/**
 * Submit a word during the round.
 * @param playerId Player identifier.
 * @param word Submitted word.
 * @param password Player password.
 * @param category Optional category selection.
 * @returns Response and parsed payload.
 */
export async function submitWord(playerId: string, word: string, password: string, category?: string) {
  const response = await fetch('/api/round/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ playerId, word, category, password }),
  });
  return { response, data: await response.json() };
}

/**
 * Mark a player finished with the round.
 * @param playerId Player identifier.
 * @param roundId Round identifier.
 * @param password Player password.
 * @returns Response and parsed payload.
 */
export async function finishRound(playerId: string, roundId: number, password: string) {
  const response = await fetch('/api/round/finish', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ playerId, roundId, password }),
  });
  return { response, data: await response.json() };
}

/**
 * Submit votes for the current voting phase.
 * @param playerId Player identifier.
 * @param votes Vote payload or decision.
 * @param password Player password.
 * @returns Response and parsed payload.
 */
export async function submitVotes(playerId: string, votes: string[] | { decision: string }, password: string) {
  const body: Record<string, unknown> = { playerId, password };
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
 * @param sessionId Admin session id.
 * @returns Response and parsed payload.
 */
export async function ejectPlayer(playerId: string, sessionId: string) {
  const response = await fetch('/api/admin/eject', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${sessionId}`,
    },
    body: JSON.stringify({ playerId }),
  });
  return { response, data: await response.json() };
}

/**
 * End the current game early as admin.
 * @param sessionId Admin session id.
 * @returns Response and parsed payload.
 */
export async function endGame(sessionId: string) {
  const response = await fetch('/api/admin/end', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${sessionId}`,
    },
    body: JSON.stringify({}),
  });
  return { response, data: await response.json() };
}
