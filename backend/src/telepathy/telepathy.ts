import type { TelepathyState, TelepathyGameState } from '@lancade/shared';
import { createGameBase } from '../shared/stores/game-base.js';

interface TelepathyOptions {
  onStateChange?: () => void;
  clientGraceMs?: number;
  playerStore?: import('../shared/stores/player-store.js').PlayerStore;
}

interface LossDetails {
  placedByPlayerId: string;
  placedCard: number;
  blockedByPlayerId: string;
  blockedCard: number;
}

const TOTAL_CARDS = 100;

function shuffleArray<T>(arr: T[]): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Create a Telepathy game instance.
 * @param options Game options.
 * @returns Game instance.
 */
export function createGame(options: TelepathyOptions) {
  const { onStateChange } = options;
  const base = createGameBase({ playerStore: options.playerStore });

  let phase: TelepathyGameState['phase'] = 'idle';
  let round = 1;
  let targetRound = 1;
  let startingRound = 1;
  let hands: Record<string, number[]> = {};
  let lastPlaced: number | null = null;
  let totalPlaced = 0;
  let totalCardsInRound = 0;
  let lossDetails: LossDetails | null = null;

  function notify() {
    onStateChange?.();
  }

  function dealCards(r: number) {
    const deck = shuffleArray(Array.from({ length: TOTAL_CARDS }, (_, i) => i + 1));
    const players = base.playerStore.listPlayers();
    const newHands: Record<string, number[]> = {};
    let cardIndex = 0;

    for (const player of players) {
      const hand: number[] = [];
      for (let i = 0; i < r; i++) {
        if (cardIndex < deck.length) {
          hand.push(deck[cardIndex++]);
        }
      }
      hand.sort((a, b) => a - b);
      newHands[player.id] = hand;
    }

    return newHands;
  }

  function getPhase() {
    return phase;
  }

  function getState(): Omit<TelepathyState, 'game' | 'games'> {
    return {
      serverTime: Date.now(),
      players: base.playerStore.listPlayers(),
      settings: base.categoryManager.getSettings(),
      gameSettings: { startingRound },
      telepathy: {
        phase,
        round,
        targetRound,
        lastPlaced,
        totalPlaced,
        totalCardsInRound,
        hands: phase === 'playing' ? hands : null,
        lossDetails: lossDetails
          ? { ...lossDetails, round }
          : null,
      },
    };
  }

  function joinPlayer(payload: { name?: string; playerId?: string }) {
    const players = base.playerStore.listPlayers();
    if (players.length >= 20) {
      return { ok: false as const, error: 'game_full' };
    }

    const name = (payload.name || '').trim();
    if (!name) {
      return { ok: false as const, error: 'name_required' };
    }

    const existing = players.find(
      (p) => p.name.toLowerCase() === name.toLowerCase() && p.id !== payload.playerId
    );
    if (existing) {
      return { ok: false as const, error: 'name_taken' };
    }

    const result = base.playerStore.joinPlayer({ name, playerId: payload.playerId });
    if (result.ok && phase === 'playing') {
      const newHand = dealCards(round);
      hands = { ...newHand };
    }
    if (result.ok) notify();
    return result;
  }

  function startRound(_durationMs: number) {
    const players = base.playerStore.listPlayers();
    if (players.length < 2) {
      return { ok: false as const, reason: 'Need at least 2 players.' };
    }

    targetRound = Math.floor(TOTAL_CARDS / players.length);
    round = Math.max(1, Math.min(startingRound, targetRound));
    lossDetails = null;
    lastPlaced = null;
    totalPlaced = 0;
    totalCardsInRound = players.length * round;
    hands = dealCards(round);
    phase = 'playing';

    notify();
    return { ok: true as const };
  }

  function handleAction(playerId: string, action: unknown) {
    if (!action || typeof action !== 'object' || !('type' in (action as Record<string, unknown>))) {
      return { ok: false as const, reason: 'unknown_action' };
    }

    const { type } = action as { type: string };

    if (type === 'place') {
      if (phase !== 'playing') {
        return { ok: false as const, reason: 'not_playing' };
      }

      const hand = hands[playerId];
      if (!hand || hand.length === 0) {
        return { ok: false as const, reason: 'no_cards' };
      }

      const placedCard = hand[0];

      for (const [pid, otherHand] of Object.entries(hands)) {
        if (pid === playerId || otherHand.length === 0) continue;
        const theirLowest = Math.min(...otherHand);
        if (theirLowest < placedCard) {
          phase = 'lost';
          lossDetails = {
            placedByPlayerId: playerId,
            placedCard,
            blockedByPlayerId: pid,
            blockedCard: theirLowest,
          };
          notify();
          return { ok: false as const, reason: 'round_lost' };
        }
      }

      hand.shift();
      lastPlaced = placedCard;
      totalPlaced++;

      if (totalPlaced >= totalCardsInRound) {
        if (round >= targetRound) {
          phase = 'won';
          hands = {};
        } else {
          phase = 'round_complete';
        }
      }

      notify();
      return { ok: true as const };
    }

    if (type === 'progress') {
      if (phase !== 'lost' && phase !== 'round_complete') {
        return { ok: false as const, reason: 'not_lost' };
      }

      if (phase === 'round_complete') {
        round++;
      } else {
        round = Math.max(1, round - 1);
      }

      lossDetails = null;
      lastPlaced = null;
      totalPlaced = 0;
      totalCardsInRound = base.playerStore.listPlayers().length * round;
      hands = dealCards(round);
      phase = 'playing';

      notify();
      return { ok: true as const };
    }

    return { ok: false as const, reason: 'unknown_action' };
  }

  function updateSettings(settings: Record<string, unknown>) {
    if (typeof settings.startingRound === 'number') {
      startingRound = Math.max(1, settings.startingRound);
      notify();
    }
    return { ok: true as const };
  }

  function submitWord() {
    return { ok: false as const, reason: 'not_supported' };
  }

  function submitVotes() {
    return { ok: false as const, reason: 'not_supported' };
  }

  function endGame() {
    phase = 'idle';
    round = 1;
    targetRound = 1;
    hands = {};
    lastPlaced = null;
    totalPlaced = 0;
    totalCardsInRound = 0;
    lossDetails = null;
    notify();
    return { ok: true as const };
  }

  function dispose() {
    // No timers or resources to clean up
  }

  return {
    getPhase,
    getState,
    joinPlayer,
    startRound,
    submitWord,
    submitVotes,
    handleAction,
    updateSettings,
    endGame,
    dispose,
    get hands() { return hands; },
    set hands(val) { hands = val; },
    get phase() { return phase; },
    set phase(val) { phase = val; },
    get round() { return round; },
    set round(val) { round = val; },
    get targetRound() { return targetRound; },
    set targetRound(val) { targetRound = val; },
    get totalCardsInRound() { return totalCardsInRound; },
    set totalCardsInRound(val) { totalCardsInRound = val; },
    get totalPlaced() { return totalPlaced; },
    set totalPlaced(val) { totalPlaced = val; },
    get lossDetails() { return lossDetails; },
    set lossDetails(val) { lossDetails = val; },
  };
}
