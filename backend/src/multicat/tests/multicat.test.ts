import { describe, it, expect } from 'vitest';
import { createGame } from '../multicat.js';
import { createPlayerStore } from '../../shared/stores/player-store.js';
import { withFakeTimers } from '../../shared/tests/helpers.js';

describe('multicat', () => {
  it('allows updating a word for a category', async () => {
    await withFakeTimers((_timers) => {
      const store = createPlayerStore();
      const alice = store.joinPlayer({ name: 'Alice' }).playerId!;
      const bob = store.joinPlayer({ name: 'Bob' }).playerId!;

      const game = createGame({ playerStore: store, clientGraceMs: 0 });
      const start = game.startRound(2000);
      const letter = start.letter!;

      const state = game.getState();
      const category = state.round.categories[0];

      const first = game.submitWord(alice, `${letter}lpha`, category);
      expect(first.ok).toBe(true);

      // Should be able to update the word for the same category
      const second = game.submitWord(alice, `${letter}pple`, category);
      expect(second.ok).toBe(true);

      // Old word should be removed and available for others
      const bobWord = game.submitWord(bob, `${letter}lpha`, category);
      expect(bobWord.ok).toBe(true);

      // Alice's current word should still be taken
      const duplicate = game.submitWord(bob, `${letter}pple`, category);
      expect(duplicate.ok).toBe(false);
      expect(duplicate.reason).toBe('duplicate');
    });
  });

  it('rejects invalid categories and includes categories in results', async () => {
    await withFakeTimers((_timers) => {
      const store = createPlayerStore();
      const player = store.joinPlayer({ name: 'Player' }).playerId!;

      const game = createGame({ playerStore: store, clientGraceMs: 0 });
      const start = game.startRound(2000);
      const letter = start.letter!;
      const state = game.getState();
      const category = state.round.categories[0];

      const invalid = game.submitWord(player, `${letter}tomic`, 'Unknown');
      expect(invalid.ok).toBe(false);
      expect(invalid.reason).toBe('invalid_category');

      game.submitWord(player, `${letter}tomic`, category);
      game.finishRound(player, state.round.id);
      const votingState = game.getState();
      expect(votingState.round.state).toBe('voting');

      game.submitVotes(player, []);
      const results = game.getState();
      expect(results.round.state).toBe('results');

      const playerResults = results.round.resultsByPlayer![player];
      expect(playerResults.words[0].category).toBe(category);
    });
  });

  it('accepts empty vote payloads without throwing', async () => {
    await withFakeTimers((_timers) => {
      const store = createPlayerStore();
      const alice = store.joinPlayer({ name: 'Alice' }).playerId!;
      const bob = store.joinPlayer({ name: 'Bob' }).playerId!;

      const game = createGame({ playerStore: store, clientGraceMs: 0 });
      const start = game.startRound(2000);
      const letter = start.letter!;
      const state = game.getState();
      const categories = state.round.categories;

      // Both players submit words so both can vote
      game.submitWord(alice, `${letter}lpha`, categories[0]);
      game.submitWord(bob, `${letter}nother`, categories[0]);
      game.finishRound(alice, state.round.id);
      game.finishRound(bob, state.round.id);

      const votingState = game.getState();
      expect(votingState.round.state).toBe('voting');

      // Empty/invalid vote payloads should be tolerated
      const aliceVote = game.submitVotes(alice, { votes: ['fake'] });
      const bobVote = game.submitVotes(bob, undefined);
      expect(aliceVote.ok).toBe(true);
      expect(bobVote.ok).toBe(true);

      const results = game.getState();
      expect(results.round.state).toBe('results');
    });
  });

  it('does not auto-advance to voting when all categories are filled', async () => {
    await withFakeTimers((_timers) => {
      const store = createPlayerStore();
      const alice = store.joinPlayer({ name: 'Alice' }).playerId!;
      const bob = store.joinPlayer({ name: 'Bob' }).playerId!;

      const game = createGame({ playerStore: store, clientGraceMs: 9999 });
      const start = game.startRound(5000);
      const letter = start.letter!;
      const state = game.getState();
      const categories = state.round.categories;

      // Fill all categories for both players
      categories.forEach((category, index) => {
        game.submitWord(alice, `${letter}wordA${index}`, category);
        game.submitWord(bob, `${letter}wordB${index}`, category);
      });

      // Should still be active since we removed auto-advance
      const afterState = game.getState();
      expect(afterState.round.state).toBe('active');

      // Players must explicitly finish
      game.finishRound(alice, state.round.id);
      game.finishRound(bob, state.round.id);

      const votingState = game.getState();
      expect(votingState.round.state).toBe('voting');
    });
  });

  it('ends an active round and transitions to idle', async () => {
    await withFakeTimers(() => {
      const store = createPlayerStore();
      store.joinPlayer({ name: 'Alex' });
      store.joinPlayer({ name: 'Bri' });

      const game = createGame({ playerStore: store });

      const start = game.startRound(5000);
      expect(start.ok).toBe(true);

      let state = game.getState();
      expect(state.round.state).toBe('active');

      const result = game.endGame();
      expect(result.ok).toBe(true);

      state = game.getState();
      expect(state.round.state).toBe('idle');
    });
  });

  it('ends a voting round and transitions to idle', async () => {
    await withFakeTimers((timers) => {
      const store = createPlayerStore();
      const alex = store.joinPlayer({ name: 'Alex' }).playerId!;
      const bri = store.joinPlayer({ name: 'Bri' }).playerId!;

      const game = createGame({ playerStore: store, clientGraceMs: 0 });

      game.startRound(1000);

      let state = game.getState();
      const letter = state.round.letter!;
      const category = state.round.categories[0];
      game.submitWord(alex, `${letter}word`, category);
      game.submitWord(bri, `${letter}other`, category);

      // Move to voting
      timers.advance(1100);
      state = game.getState();
      expect(state.round.state).toBe('voting');

      const result = game.endGame();
      expect(result.ok).toBe(true);

      state = game.getState();
      expect(state.round.state).toBe('idle');
    });
  });

  it('returns error when ending game that is already idle', async () => {
    await withFakeTimers(() => {
      const store = createPlayerStore();
      store.joinPlayer({ name: 'Alex' });

      const game = createGame({ playerStore: store });

      const state = game.getState();
      expect(state.round.state).toBe('idle');

      const result = game.endGame();
      expect(result.ok).toBe(false);
      expect(result.reason).toBe('not_active');
    });
  });

  it('clears pending timers when ending game', async () => {
    await withFakeTimers((timers) => {
      const store = createPlayerStore();
      store.joinPlayer({ name: 'Alex' });
      store.joinPlayer({ name: 'Bri' });

      let changeCount = 0;
      const game = createGame({
        playerStore: store,
        onStateChange: () => { changeCount++; },
        clientGraceMs: 1000,
      });

      game.startRound(5000);
      const beforeEnd = changeCount;

      game.endGame();

      // Advancing time past the round end should not trigger voting transition
      // because the round timer should have been cleared
      timers.advance(10000);
      expect(changeCount).toBe(beforeEnd + 1); // Only the endGame change
    });
  });

  it('transitions to results with empty resultsByPlayer when no one submits', async () => {
    await withFakeTimers((timers) => {
      const store = createPlayerStore();
      store.joinPlayer({ name: 'Alice' });
      store.joinPlayer({ name: 'Bob' });

      const game = createGame({
        playerStore: store,
        clientGraceMs: 0,
      });

      game.startRound(1000);

      // Nobody submits any words - let the timer run out
      timers.advance(1100);

      const state = game.getState();
      // Should transition through voting to results
      expect(state.round.state).toBe('results');
      // resultsByPlayer should be empty (no submissions)
      expect(state.round.resultsByPlayer).toEqual({});
    });
  });

  it('blocks a player from reusing a word they already have in a different category', async () => {
    await withFakeTimers((_timers) => {
      const store = createPlayerStore();
      const alice = store.joinPlayer({ name: 'Alice' }).playerId!;
      store.joinPlayer({ name: 'Bob' });

      const game = createGame({ playerStore: store, clientGraceMs: 0 });
      const start = game.startRound(5000);
      const letter = start.letter!;
      const state = game.getState();
      const categories = state.round.categories;

      // Alice submits a word in the first category
      const first = game.submitWord(alice, `${letter}lpha`, categories[0]);
      expect(first.ok).toBe(true);

      // Alice tries to submit the exact same word in a second category — must be blocked
      const duplicate = game.submitWord(alice, `${letter}lpha`, categories[1]);
      expect(duplicate.ok).toBe(false);
      expect(duplicate.reason).toBe('already_used_by_self');
      expect(duplicate.blockedWord).toBe(`${letter}lpha`);
      expect(duplicate.blockedCategory).toBe(categories[0]);
    });
  });

  it('blocks reuse case-insensitively across categories', async () => {
    await withFakeTimers((_timers) => {
      const store = createPlayerStore();
      const alice = store.joinPlayer({ name: 'Alice' }).playerId!;
      store.joinPlayer({ name: 'Bob' });

      const game = createGame({ playerStore: store, clientGraceMs: 0 });
      const start = game.startRound(5000);
      const letter = start.letter!;
      const state = game.getState();
      const categories = state.round.categories;

      game.submitWord(alice, `${letter}lpha`, categories[0]);

      // Submitting the same word in different casing should also be blocked
      const duplicate = game.submitWord(alice, `${letter.toLowerCase()}lpha`, categories[1]);
      expect(duplicate.ok).toBe(false);
      expect(duplicate.reason).toBe('already_used_by_self');
    });
  });

  it('allows the same word in the same category as an update, not a self-reuse error', async () => {
    await withFakeTimers((_timers) => {
      const store = createPlayerStore();
      const alice = store.joinPlayer({ name: 'Alice' }).playerId!;
      store.joinPlayer({ name: 'Bob' });

      const game = createGame({ playerStore: store, clientGraceMs: 0 });
      const start = game.startRound(5000);
      const letter = start.letter!;
      const state = game.getState();
      const category = state.round.categories[0];

      game.submitWord(alice, `${letter}lpha`, category);

      // Re-submitting the same word to the same category is an update, not a self-reuse block
      const update = game.submitWord(alice, `${letter}lpha`, category);
      expect(update.ok).toBe(true);
    });
  });

  it('does not block a different player from using the same word as another player in a different category', async () => {
    await withFakeTimers((_timers) => {
      const store = createPlayerStore();
      const alice = store.joinPlayer({ name: 'Alice' }).playerId!;
      const bob = store.joinPlayer({ name: 'Bob' }).playerId!;

      const game = createGame({ playerStore: store, clientGraceMs: 0 });
      const start = game.startRound(5000);
      const letter = start.letter!;
      const state = game.getState();
      const categories = state.round.categories;

      // Alice takes the word in category 0
      game.submitWord(alice, `${letter}lpha`, categories[0]);

      // Bob trying the same word in category 0 is a normal duplicate (taken by Alice)
      const bobSame = game.submitWord(bob, `${letter}lpha`, categories[0]);
      expect(bobSame.ok).toBe(false);
      expect(bobSame.reason).toBe('duplicate');
      expect(bobSame.blockedByName).toBe('Alice');

      // Bob using a completely different word in category 1 is fine
      const bobOther = game.submitWord(bob, `${letter}nother`, categories[1]);
      expect(bobOther.ok).toBe(true);
    });
  });

  it('populates anonymousWords in submission order during voting and omits it outside voting', async () => {
    await withFakeTimers((_timers) => {
      const store = createPlayerStore();
      const alice = store.joinPlayer({ name: 'Alice' }).playerId!;
      const bob = store.joinPlayer({ name: 'Bob' }).playerId!;

      const game = createGame({ playerStore: store, clientGraceMs: 0 });
      const start = game.startRound(5000);
      const letter = start.letter!;
      const state = game.getState();
      const categories = state.round.categories;

      // Not present while active
      expect(state.round.anonymousWords).toBeUndefined();

      // Alice submits first, then Bob
      game.submitWord(alice, `${letter}lpha`, categories[0]);
      game.submitWord(bob, `${letter}eta`, categories[1]);

      game.finishRound(alice, state.round.id);
      game.finishRound(bob, state.round.id);

      const votingState = game.getState();
      expect(votingState.round.state).toBe('voting');

      // Present during voting, flat, submission-order, includes category, no player identity
      expect(votingState.round.anonymousWords).toBeDefined();
      expect(votingState.round.anonymousWords!).toHaveLength(2);
      expect(votingState.round.anonymousWords![0].word).toBe(`${letter}lpha`);
      expect(votingState.round.anonymousWords![0].category).toBe(categories[0]);
      expect(votingState.round.anonymousWords![1].word).toBe(`${letter}eta`);
      expect(votingState.round.anonymousWords![1].category).toBe(categories[1]);
      expect('playerId' in votingState.round.anonymousWords![0]).toBe(false);
      expect('playerName' in votingState.round.anonymousWords![0]).toBe(false);

      // Vote IDs from anonymousWords must resolve correctly
      game.submitVotes(alice, [votingState.round.anonymousWords![1].id]);
      game.submitVotes(bob, []);

      const resultsState = game.getState();
      expect(resultsState.round.state).toBe('results');

      // Not present once results are shown
      expect(resultsState.round.anonymousWords).toBeUndefined();
    });
  });

  it('scores only the final word when a player updates a category', async () => {
    await withFakeTimers((_timers) => {
      const store = createPlayerStore();
      const alice = store.joinPlayer({ name: 'Alice' }).playerId!;
      const bob = store.joinPlayer({ name: 'Bob' }).playerId!;

      const game = createGame({ playerStore: store, clientGraceMs: 0 });
      const start = game.startRound(5000);
      const letter = start.letter!;
      const state = game.getState();
      const category = state.round.categories[0];

      // Alice submits a word, then changes her mind
      game.submitWord(alice, `${letter}lpha`, category);
      game.submitWord(alice, `${letter}pple`, category);

      // Bob submits a word so voting can proceed
      game.submitWord(bob, `${letter}nother`, category);

      game.finishRound(alice, state.round.id);
      game.finishRound(bob, state.round.id);

      // Vote without downvoting anything
      game.submitVotes(alice, []);
      game.submitVotes(bob, []);

      const results = game.getState();
      expect(results.round.state).toBe('results');

      const aliceResults = results.round.resultsByPlayer![alice];
      // Alice should score 1 (only the final word), not 2
      expect(aliceResults.finalScore).toBe(1);
    });
  });

  it('allows adding a custom category before starting', async () => {
    await withFakeTimers((_timers) => {
      const store = createPlayerStore();
      store.joinPlayer({ name: 'Alice' });

      const game = createGame({ playerStore: store });

      const result = (game as unknown as { addCategory: (name: string) => { ok: boolean; category?: string; reason?: string } }).addCategory('My Custom');
      expect(result.ok).toBe(true);
      expect(result.category).toBe('My Custom');

      const state = game.getState();
      expect(state.settings.categories).toContain('My Custom');
    });
  });

  it('transitions to results with empty resultsByPlayer when all players finish without submitting', async () => {
    await withFakeTimers((_timers) => {
      const store = createPlayerStore();
      const alice = store.joinPlayer({ name: 'Alice' }).playerId!;
      const bob = store.joinPlayer({ name: 'Bob' }).playerId!;

      const game = createGame({
        playerStore: store,
        clientGraceMs: 0,
      });

      game.startRound(5000);
      const state = game.getState();

      // Both players finish without submitting words
      game.finishRound(alice, state.round.id);
      game.finishRound(bob, state.round.id);

      const finalState = game.getState();
      expect(finalState.round.state).toBe('results');
      expect(finalState.round.resultsByPlayer).toEqual({});
    });
  });
});
