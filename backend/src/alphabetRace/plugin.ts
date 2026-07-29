import type { GamePlugin, GameFactoryOptions, BaseGame } from '../plugins/types.js';
import { createGame } from './alphabetrace.js';
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
    handleAction: (playerId, action) => game.handleAction(playerId, action),
    selectCategory: (category: string) => game.selectCategory(category),
    selectRandomCategory: () => game.selectRandomCategory(),
    addCategory: (name: string) => game.addCategory(name),
    getOlympicsResult: () => {
      const state = game.getState();
      if (state.match.state !== 'finished') return null;
      const nameMap = new Map(state.players.map(p => [p.id, p.name]));
      const scored = Object.entries(state.match.scores)
        .map(([id, score]) => [nameMap.get(id) || id, score] as [string, number]);
      const { podium, playerCount } = buildPodiumFromScores(scored);
      return { podium, playerCount };
    },
  };
}

export const plugin: GamePlugin = {
  definition: {
    id: 'alphabetrace',
    name: 'Alphabet Race',
    factory,
  },
};
