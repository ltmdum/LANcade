import { describe, it, expect } from 'vitest';
import { createGame } from '../quickfire.js';
import { createPlayerStore } from '../../shared/stores/player-store.js';
import { withFakeTimers, pickOtherLetter } from '../../shared/tests/helpers.js';

describe('quickfire', () => {
  it('rejects words when no active round', async () => {
    await withFakeTimers((_timers) => {
      const store = createPlayerStore();
      const game = createGame({ playerStore: store });
      const result = game.submitWord('player-1', 'Apple');
      expect(result.ok).toBe(false);
      expect(result.reason).toBe('round_not_active');
    });
  });

  it('rejects a word already submitted by the same player', async () => {
    await withFakeTimers(() => {
      const store = createPlayerStore();
      const alice = store.joinPlayer({ name: 'Alice' }).playerId!;
      const game = createGame({ playerStore: store, clientGraceMs: 0 });
      const start = game.startRound(2000);
      const letter = start.letter!;
      const word = `${letter}lpha`;

      expect(game.submitWord(alice, word).ok).toBe(true);
      const duplicate = game.submitWord(alice, word.toLowerCase());
      expect(duplicate.ok).toBe(false);
      expect(duplicate.reason).toBe('already_used_by_self');
      expect(duplicate.blockedWord).toBe(word.toLowerCase());
      expect(duplicate.blockedByName).toBeUndefined();
    });
  });

  it('rejects a word already submitted by another player', async () => {
    await withFakeTimers(() => {
      const store = createPlayerStore();
      const alice = store.joinPlayer({ name: 'Alice' }).playerId!;
      const bob = store.joinPlayer({ name: 'Bob' }).playerId!;
      const game = createGame({ playerStore: store, clientGraceMs: 0 });
      const start = game.startRound(2000);
      const letter = start.letter!;
      const word = `${letter}lpha`;

      expect(game.submitWord(alice, word).ok).toBe(true);
      const duplicate = game.submitWord(bob, word);
      expect(duplicate.ok).toBe(false);
      expect(duplicate.reason).toBe('duplicate');
      expect(duplicate.blockedByName).toBe('Alice');
      expect(duplicate.blockedWord).toBeUndefined();
    });
  });

  it('accepts, rejects, and tallies votes correctly', async () => {
    await withFakeTimers((_timers) => {
      const store = createPlayerStore();
      const alice = store.joinPlayer({ name: 'Alice' }).playerId!;
      const bob = store.joinPlayer({ name: 'Bob' }).playerId!;

      const game = createGame({ playerStore: store, clientGraceMs: 0 });
      const start = game.startRound(2000);
      const letter = start.letter!;
      const validWord = `${letter}lpha`;
      const invalidWord = `${pickOtherLetter(letter)}og`;

      const accepted = game.submitWord(alice, validWord);
      expect(accepted.ok).toBe(true);

      const duplicate = game.submitWord(bob, validWord.toLowerCase());
      expect(duplicate.ok).toBe(false);
      expect(duplicate.reason).toBe('duplicate');
      expect(duplicate.blockedByName).toBe('Alice');

      const selfDuplicate = game.submitWord(alice, validWord.toLowerCase());
      expect(selfDuplicate.ok).toBe(false);
      expect(selfDuplicate.reason).toBe('already_used_by_self');
      expect(selfDuplicate.blockedWord).toBeDefined();

      const invalid = game.submitWord(bob, invalidWord);
      expect(invalid.ok).toBe(false);
      expect(invalid.reason).toBe('invalid_letter');

      const stateAfterSubmit = game.getState();
      expect(stateAfterSubmit.round.state).toBe('active');
      expect(stateAfterSubmit.round.participants).toEqual([alice, bob]);

      const wrongFinish = game.finishRound(alice, stateAfterSubmit.round.id + 1);
      expect(wrongFinish.ok).toBe(false);
      expect(wrongFinish.reason).toBe('wrong_round');

      const finishAlice = game.finishRound(alice, stateAfterSubmit.round.id);
      const finishBob = game.finishRound(bob, stateAfterSubmit.round.id);
      expect(finishAlice.ok).toBe(true);
      expect(finishBob.ok).toBe(true);

      const votingState = game.getState();
      expect(votingState.round.state).toBe('voting');

      const wordGroup = votingState.round.wordsByPlayer.find((group) => group.playerId === alice);
      const acceptedWordId = wordGroup!.words[0].id;

      const aliceVote = game.submitVotes(alice, [acceptedWordId]);
      const bobVote = game.submitVotes(bob, [acceptedWordId]);
      expect(aliceVote.ok).toBe(true);
      expect(bobVote.ok).toBe(true);

      const resultsState = game.getState();
      expect(resultsState.round.state).toBe('results');

      const aliceResults = resultsState.round.resultsByPlayer![alice];
      expect(aliceResults.votedOut).toBe(1);
      expect(aliceResults.finalScore).toBe(0);
      expect(aliceResults.words[0].status).toBe('voted_out');
      expect(aliceResults.words[0].downvotedByNames.includes('Bob')).toBe(true);
      expect(aliceResults.words[0].downvotedByNames.includes('Alice')).toBe(false);

      const bobResults = resultsState.round.resultsByPlayer![bob];
      expect(bobResults.rejected).toBe(2);
      expect(bobResults.words.some((entry) => entry.blockedByName === 'Alice')).toBe(true);
    });
  });

  it('tolerates non-array vote payloads', async () => {
    await withFakeTimers((_timers) => {
      const store = createPlayerStore();
      const alice = store.joinPlayer({ name: 'Alice' }).playerId!;
      const bob = store.joinPlayer({ name: 'Bob' }).playerId!;

      const game = createGame({ playerStore: store, clientGraceMs: 0 });
      const start = game.startRound(2000);
      const letter = start.letter!;
      const state = game.getState();

      // Both players submit words so both can vote
      game.submitWord(alice, `${letter}lpha`);
      game.submitWord(bob, `${letter}nother`);
      game.finishRound(alice, state.round.id);
      game.finishRound(bob, state.round.id);

      const votingState = game.getState();
      expect(votingState.round.state).toBe('voting');

      // Non-array payloads should be tolerated
      const aliceVote = game.submitVotes(alice, { votes: ['fake'] });
      const bobVote = game.submitVotes(bob, null);
      expect(aliceVote.ok).toBe(true);
      expect(bobVote.ok).toBe(true);

      const resultsState = game.getState();
      expect(resultsState.round.state).toBe('results');
    });
  });

  it('excludes non-playing participants from voting', async () => {
    await withFakeTimers((_timers) => {
      const store = createPlayerStore();
      const alice = store.joinPlayer({ name: 'Alice' }).playerId!;
      const bob = store.joinPlayer({ name: 'Bob' }).playerId!;
      const charlie = store.joinPlayer({ name: 'Charlie' }).playerId!;

      const game = createGame({ playerStore: store, clientGraceMs: 0 });
      const start = game.startRound(2000);
      const letter = start.letter!;
      const state = game.getState();

      // Only Alice and Bob submit words; Charlie does nothing
      game.submitWord(alice, `${letter}lpha`);
      game.submitWord(bob, `${letter}nother`);

      game.finishRound(alice, state.round.id);
      game.finishRound(bob, state.round.id);
      game.finishRound(charlie, state.round.id);

      const votingState = game.getState();
      expect(votingState.round.state).toBe('voting');

      // Charlie should NOT be able to vote since they didn't play
      const charlieVote = game.submitVotes(charlie, []);
      expect(charlieVote.ok).toBe(false);
      expect(charlieVote.reason).toBe('not_participant');

      // Alice and Bob can vote
      const aliceVote = game.submitVotes(alice, []);
      const bobVote = game.submitVotes(bob, []);
      expect(aliceVote.ok).toBe(true);
      expect(bobVote.ok).toBe(true);

      const resultsState = game.getState();
      expect(resultsState.round.state).toBe('results');
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
      game.submitWord(alex, `${letter}word`);
      game.submitWord(bri, `${letter}other`);

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

  it('populates anonymousWords in submission order during voting and omits it outside voting', async () => {
    await withFakeTimers((_timers) => {
      const store = createPlayerStore();
      const alice = store.joinPlayer({ name: 'Alice' }).playerId!;
      const bob = store.joinPlayer({ name: 'Bob' }).playerId!;

      const game = createGame({ playerStore: store, clientGraceMs: 0 });
      const start = game.startRound(5000);
      const letter = start.letter!;
      const state = game.getState();

      // Not present while active
      expect(state.round.anonymousWords).toBeUndefined();

      // Alice submits first, then Bob
      game.submitWord(alice, `${letter}lpha`);
      game.submitWord(bob, `${letter}eta`);

      game.finishRound(alice, state.round.id);
      game.finishRound(bob, state.round.id);

      const votingState = game.getState();
      expect(votingState.round.state).toBe('voting');

      // Present during voting, flat, submission-order, no player identity
      expect(votingState.round.anonymousWords).toBeDefined();
      expect(votingState.round.anonymousWords!).toHaveLength(2);
      expect(votingState.round.anonymousWords![0].word).toBe(`${letter}lpha`);
      expect(votingState.round.anonymousWords![1].word).toBe(`${letter}eta`);
      // Each entry must have an id (usable for voting) but no playerId or playerName
      expect(votingState.round.anonymousWords![0].id).toBeTruthy();
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

  it('allows adding a custom category before starting', async () => {
    await withFakeTimers((_timers) => {
      const store = createPlayerStore();
      store.joinPlayer({ name: 'Alice' });

      const game = createGame({ playerStore: store });

      const result = game.addCategory!('My Custom');
      expect(result.ok).toBe(true);
      expect(result.category).toBe('My Custom');

      const state = game.getState();
      expect(state.settings.categories).toContain('My Custom');
      expect(state.settings.selectedCategory).toBe('My Custom');
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
