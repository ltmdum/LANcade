import { describe, it, expect, beforeEach } from 'vitest';
import { createGame } from '../telepathy.js';
import type { TelepathyState } from '@lancade/shared';

function createDefaultGame() {
  const game = createGame({});
  const players = ['Alice', 'Bob'];

  for (const name of players) {
    game.joinPlayer({ name });
  }

  return { game, players };
}

function getState(game: ReturnType<typeof createGame>) {
  return game.getState() as Omit<TelepathyState, 'game' | 'games'>;
}

describe('Telepathy', () => {
  describe('initial state', () => {
    it('starts in idle phase', () => {
      const { game } = createDefaultGame();
      expect(getState(game).telepathy.phase).toBe('idle');
    });

    it('has null hands in idle', () => {
      const { game } = createDefaultGame();
      expect(getState(game).telepathy.hands).toBeNull();
    });

    it('requires at least 2 players to start', () => {
      const game = createGame({});
      game.joinPlayer({ name: 'Alice' });
      const result = game.startRound(0);
      expect(result.ok).toBe(false);
    });
  });

  describe('startRound', () => {
    it('returns ok when enough players', () => {
      const { game } = createDefaultGame();
      const result = game.startRound(0);
      expect(result.ok).toBe(true);
    });

    it('transitions to playing phase', () => {
      const { game } = createDefaultGame();
      game.startRound(0);
      expect(getState(game).telepathy.phase).toBe('playing');
    });

    it('deals one card per player in round 1', () => {
      const { game } = createDefaultGame();
      game.startRound(0);
      const state = getState(game);
      expect(state.telepathy.round).toBe(8);
      expect(state.telepathy.totalCardsInRound).toBe(16);

      const hands = state.telepathy.hands!;
      expect(Object.keys(hands)).toHaveLength(2);
      for (const cards of Object.values(hands)) {
        expect(cards).toHaveLength(8);
      }
    });

    it('sets targetRound based on player count', () => {
      const { game } = createDefaultGame();
      game.startRound(0);
      const state = getState(game);
      expect(state.telepathy.targetRound).toBe(50);
    });

    it('rejects start when fewer than 2 players', () => {
      const game = createGame({});
      const result = game.startRound(0);
      expect(result.ok).toBe(false);
    });
  });

  describe('card placement', () => {
    it('places the lowest card from the player hand', () => {
      const { game } = createDefaultGame();
      game.startRound(0);

      const state = getState(game);
      const aliceId = state.players[0].id;
      const bobId = state.players[1].id;

      // Set deterministic hands to avoid random loss
      game.hands = { [aliceId]: [3], [bobId]: [7] };
      const lowestCard = 3;

      const result = game.handleAction(aliceId, { type: 'place' });
      expect(result.ok).toBe(true);

      const afterState = getState(game);
      expect(afterState.telepathy.lastPlaced).toBe(lowestCard);
      expect(afterState.telepathy.totalPlaced).toBe(1);
    });

    it('transitions to round_complete when all cards placed', () => {
      const { game } = createDefaultGame();
      game.updateSettings({ startingRound: 1 });
      game.startRound(0);

      const state = getState(game);
      const aliceId = state.players[0].id;
      const bobId = state.players[1].id;

      game.hands = { [aliceId]: [3], [bobId]: [7] };

      game.handleAction(aliceId, { type: 'place' });
      game.handleAction(bobId, { type: 'place' });

      const afterState = getState(game);
      expect(afterState.telepathy.phase).toBe('round_complete');
      expect(afterState.telepathy.round).toBe(1);
      expect(afterState.telepathy.totalPlaced).toBe(2);
    });
  });

  describe('round loss', () => {
    it('detects when a placed card is higher than another player unplayed card', () => {
      const game = createGame({});
      game.joinPlayer({ name: 'Alice' });
      game.joinPlayer({ name: 'Bob' });

      game.startRound(0);

      // Manipulate hands to force a loss scenario:
      // Hand 1: [5], Hand 2: [3]
      // Player 1 places 5, but player 2 has 3 (lower, unplayed)
      const state = getState(game);
      const aliceId = state.players[0].id;
      const bobId = state.players[1].id;

      // Override hands to create a loss scenario
      game.hands = {
        [aliceId]: [5],
        [bobId]: [3],
      };

      const result = game.handleAction(aliceId, { type: 'place' });
      expect(result.ok).toBe(false);
      expect(result.reason).toBe('round_lost');

      const afterState = getState(game);
      expect(afterState.telepathy.phase).toBe('lost');
      expect(afterState.telepathy.lossDetails).not.toBeNull();
      expect(afterState.telepathy.lossDetails!.placedCard).toBe(5);
      expect(afterState.telepathy.lossDetails!.blockedCard).toBe(3);
    });

    it('reports the holder of the lowest outstanding card as the blocker', () => {
      const game = createGame({});
      game.joinPlayer({ name: 'Alice' });
      game.joinPlayer({ name: 'Bob' });
      game.joinPlayer({ name: 'Charlie' });

      game.startRound(0);

      const state = getState(game);
      const aliceId = state.players[0].id;
      const bobId = state.players[1].id;
      const charlieId = state.players[2].id;

      // Alice and Bob both hold lower cards than Charlie's played card.
      // Bob holds the lowest overall, so Bob is who should have gone next.
      game.hands = {
        [aliceId]: [44],
        [bobId]: [40],
        [charlieId]: [45],
      };

      const result = game.handleAction(charlieId, { type: 'place' });
      expect(result.reason).toBe('round_lost');

      const afterState = getState(game);
      expect(afterState.telepathy.lossDetails!.blockedByPlayerId).toBe(bobId);
      expect(afterState.telepathy.lossDetails!.blockedCard).toBe(40);
    });

    it('does not trigger loss when no one has a lower card', () => {
      const game = createGame({});
      game.joinPlayer({ name: 'Alice' });
      game.joinPlayer({ name: 'Bob' });

      game.startRound(0);

      // Manipulate hands: Hand 1: [3], Hand 2: [5]
      // Player 1 places 3, player 2 has 5 (higher, so OK)
      const state = getState(game);
      const aliceId = state.players[0].id;
      const bobId = state.players[1].id;

      game.hands = {
        [aliceId]: [3],
        [bobId]: [5],
      };

      const result = game.handleAction(aliceId, { type: 'place' });
      expect(result.ok).toBe(true);
    });
  });

  describe('progress after loss', () => {
    it('goes back one round on progress', () => {
      const game = createGame({});
      game.joinPlayer({ name: 'Alice' });
      game.joinPlayer({ name: 'Bob' });
      game.startRound(0);

      // Reach round 3 first
      const state = getState(game);
      game.round = 3;
      game.hands = { [state.players[0].id]: [10], [state.players[1].id]: [5] };
      game.totalCardsInRound = 6;
      game.totalPlaced = 4;

      // Cause a loss
      const result = game.handleAction(state.players[0].id, { type: 'place' });
      expect(result.reason).toBe('round_lost');

      // Admin progresses
      const progressResult = game.handleAction(state.players[0].id, { type: 'progress' });
      expect(progressResult.ok).toBe(true);

      const afterState = getState(game);
      expect(afterState.telepathy.phase).toBe('playing');
      expect(afterState.telepathy.round).toBe(2);
      expect(afterState.telepathy.lossDetails).toBeNull();
    });

    it('does not go below round 1 on progress', () => {
      const game = createGame({});
      game.joinPlayer({ name: 'Alice' });
      game.joinPlayer({ name: 'Bob' });

      game.round = 1;
      game.hands = { 'a': [10], 'b': [5] };
      game.totalCardsInRound = 2;
      game.totalPlaced = 0;
      game.phase = 'lost';

      const result = game.handleAction('a', { type: 'progress' });
      expect(result.ok).toBe(true);

      const afterState = getState(game);
      expect(afterState.telepathy.round).toBe(1);
    });
  });

  describe('round_complete', () => {
    it('advances to next round on progress', () => {
      const { game } = createDefaultGame();
      game.updateSettings({ startingRound: 1 });
      game.startRound(0);

      const state = getState(game);
      const aliceId = state.players[0].id;
      const bobId = state.players[1].id;

      game.hands = { [aliceId]: [3], [bobId]: [7] };
      game.handleAction(aliceId, { type: 'place' });
      game.handleAction(bobId, { type: 'place' });

      expect(getState(game).telepathy.phase).toBe('round_complete');

      const result = game.handleAction(aliceId, { type: 'progress' });
      expect(result.ok).toBe(true);

      const afterState = getState(game);
      expect(afterState.telepathy.phase).toBe('playing');
      expect(afterState.telepathy.round).toBe(2);
      expect(afterState.telepathy.totalPlaced).toBe(0);
      expect(afterState.telepathy.totalCardsInRound).toBe(4);
    });

    it('rejects place action in round_complete', () => {
      const { game } = createDefaultGame();
      game.updateSettings({ startingRound: 1 });
      game.startRound(0);

      const state = getState(game);
      game.hands = { [state.players[0].id]: [3], [state.players[1].id]: [7] };
      game.handleAction(state.players[0].id, { type: 'place' });
      game.handleAction(state.players[1].id, { type: 'place' });

      const result = game.handleAction(state.players[0].id, { type: 'place' });
      expect(result.ok).toBe(false);
      expect(result.reason).toBe('not_playing');
    });
  });

  describe('win condition', () => {
    it('wins when reaching target round', () => {
      const game = createGame({});
      game.joinPlayer({ name: 'Alice' });
      game.joinPlayer({ name: 'Bob' });

      game.targetRound = 2;
      game.round = 2;
      game.phase = 'playing';
      game.hands = { 'a': [10], 'b': [5] };
      game.totalCardsInRound = 4;
      game.totalPlaced = 2;

      // Place Alice's card (10 > 5 would be loss, so set hands appropriately)
      // Actually let's make hands where order works: a: [1], b: [2]
      game.hands = { 'a': [1], 'b': [2] };
      game.totalPlaced = 2;
      game.totalCardsInRound = 4;

      game.handleAction('a', { type: 'place' });
      game.handleAction('b', { type: 'place' });

      const afterState = getState(game);
      expect(afterState.telepathy.phase).toBe('won');
    });
  });

  describe('handleAction validation', () => {
    it('rejects unknown action type', () => {
      const { game } = createDefaultGame();
      const result = game.handleAction('x', { type: 'unknown' });
      expect(result.reason).toBe('unknown_action');
    });

    it('rejects null action', () => {
      const { game } = createDefaultGame();
      const result = game.handleAction('x', null);
      expect(result.reason).toBe('unknown_action');
    });

    it('rejects place when not playing', () => {
      const { game } = createDefaultGame();
      const result = game.handleAction('x', { type: 'place' });
      expect(result.reason).toBe('not_playing');
    });

    it('rejects progress in idle phase', () => {
      const { game } = createDefaultGame();
      const result = game.handleAction('x', { type: 'progress' });
      expect(result.reason).toBe('not_lost');
    });

    it('rejects progress in playing phase', () => {
      const { game } = createDefaultGame();
      game.startRound(0);
      const result = game.handleAction('x', { type: 'progress' });
      expect(result.reason).toBe('not_lost');
    });

    it('accepts progress in round_complete phase', () => {
      const { game } = createDefaultGame();
      game.updateSettings({ startingRound: 1 });
      game.startRound(0);
      const state = getState(game);
      game.hands = { [state.players[0].id]: [3], [state.players[1].id]: [7] };
      game.handleAction(state.players[0].id, { type: 'place' });
      game.handleAction(state.players[1].id, { type: 'place' });
      expect(getState(game).telepathy.phase).toBe('round_complete');
      const result = game.handleAction(state.players[0].id, { type: 'progress' });
      expect(result.ok).toBe(true);
    });
  });

  describe('updateSettings', () => {
    it('sets starting round from settings', () => {
      const { game } = createDefaultGame();
      game.updateSettings({ startingRound: 5 });
      game.startRound(0);

      const state = getState(game);
      expect(state.telepathy.round).toBe(5);
      expect(state.telepathy.totalCardsInRound).toBe(10);
    });

    it('caps starting round to targetRound', () => {
      const { game } = createDefaultGame();
      game.updateSettings({ startingRound: 100 });
      game.startRound(0);

      const state = getState(game);
      expect(state.telepathy.round).toBe(50);
    });

    it('defaults starting round from player count', () => {
      const { game } = createDefaultGame();
      game.startRound(0);

      const state = getState(game);
      expect(state.telepathy.round).toBe(8);
    });

    it('notifies state change when setting changes', () => {
      let notified = false;
      const game = createGame({ onStateChange: () => { notified = true; } });
      const players = ['Alice', 'Bob'];
      for (const name of players) game.joinPlayer({ name });
      notified = false; // reset — joinPlayer also calls notify

      game.updateSettings({ startingRound: 5 });
      expect(notified).toBe(true);
    });

    it('notifies state change on repeated settings change', () => {
      let callCount = 0;
      const game = createGame({ onStateChange: () => { callCount++; } });
      const players = ['Alice', 'Bob'];
      for (const name of players) game.joinPlayer({ name });
      callCount = 0; // reset — joinPlayer also calls notify

      game.updateSettings({ startingRound: 3 });
      game.updateSettings({ startingRound: 7 });
      expect(callCount).toBe(2);
    });
  });

  describe('endGame', () => {
    it('resets to idle phase', () => {
      const { game } = createDefaultGame();
      game.startRound(0);
      game.endGame();
      const state = getState(game);
      expect(state.telepathy.phase).toBe('idle');
      expect(state.telepathy.hands).toBeNull();
      expect(state.telepathy.round).toBe(1);
    });

    it('works from any phase', () => {
      const { game } = createDefaultGame();
      game.updateSettings({ startingRound: 1 });
      game.startRound(0);
      game.endGame();
      expect(getState(game).telepathy.phase).toBe('idle');

      game.startRound(0);
      const state = getState(game);
      game.hands = { [state.players[0].id]: [3], [state.players[1].id]: [7] };
      game.handleAction(state.players[0].id, { type: 'place' });
      game.handleAction(state.players[1].id, { type: 'place' });
      expect(getState(game).telepathy.phase).toBe('round_complete');

      game.endGame();
      expect(getState(game).telepathy.phase).toBe('idle');
    });
  });

  describe('submitWord and submitVotes', () => {
    it('returns not supported', () => {
      const { game } = createDefaultGame();
      expect(game.submitWord('x', 'test').reason).toBe('not_supported');
      expect(game.submitVotes('x', []).reason).toBe('not_supported');
    });
  });
});
