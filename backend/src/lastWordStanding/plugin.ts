import type { GamePlugin, GameFactoryOptions, BaseGame } from '../plugins/types.js';
import { START_COUNTDOWN_MS } from '@lancade/shared';
import { createGame } from './lastwordstanding.js';
import { buildPodiumFromScores } from '@lancade/shared';

function factory(options: GameFactoryOptions): BaseGame {
  const game = createGame({
    onStateChange: options.onStateChange,
    playerStore: options.playerStore,
    sessionStore: options.sessionStore,
  });
  return {
    getState: () => game.getState(),
    getPhase: () => game.getPhase(),
    joinPlayer: (payload) => game.joinPlayer(payload),
    submitWord: (playerId, word) => game.submitWord(playerId, word),
    submitVotes: (playerId, votes) => game.submitVotes(playerId, votes),
    startRound: (durationMs) => game.startRound(durationMs),
    endGame: () => game.endGame(),
    selectCategory: (category: string) => game.selectCategory(category),
    selectRandomCategory: () => game.selectRandomCategory(),
    addCategory: (name: string) => game.addCategory(name),
    getOlympicsResult: () => {
      const state = game.getState();
      if (state.match.state !== 'finished') return null;
      if (state.match.winnerIds.length === 0) return null;
      const nameMap = new Map(state.players.map(p => [p.id, p.name]));
      const scored: [string, number][] = [];
      for (const playerId of state.match.order) {
        scored.push([nameMap.get(playerId) || playerId, state.match.scores[playerId] || 0]);
      }
      const { podium, playerCount } = buildPodiumFromScores(scored);
      return { podium, playerCount };
    },
  };
}

export const plugin: GamePlugin = {
  definition: {
    id: 'lastwordstanding',
    name: 'Last Word Standing',
    startCountdownMs: START_COUNTDOWN_MS,
    factory,
  },
};
