import type { GamePlugin, GameFactoryOptions, BaseGame } from '../plugins/types.js';
import { createGame } from './lastwordstanding.js';

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
      const nameMap = new Map(state.players.map(p => [p.id, p.name]));
      const eliminated = state.match.eliminatedPlayerIds;
      const podium: string[][] = [];
      if (state.match.winnerId) {
        podium.push([nameMap.get(state.match.winnerId) || state.match.winnerId]);
      }
      if (eliminated.length > 0) {
        podium.push([nameMap.get(eliminated[eliminated.length - 1]) || eliminated[eliminated.length - 1]]);
      }
      if (eliminated.length > 1) {
        podium.push([nameMap.get(eliminated[eliminated.length - 2]) || eliminated[eliminated.length - 2]]);
      }
      return { podium, playerCount: state.players.length };
    },
  };
}

export const plugin: GamePlugin = {
  definition: {
    id: 'lastwordstanding',
    name: 'Last Word Standing',
    factory,
  },
};
