import type { GamePlugin, GameFactoryOptions, BaseGame } from '../plugins/types.js';
import { createGame } from './fiveletterword.js';

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
    updateSettings: (settings) => game.updateSettings(settings),
    getOlympicsResult: () => {
      const state = game.getState();
      if (state.match.state !== 'finished') return null;
      const nameMap = new Map(state.players.map(p => [p.id, p.name]));
      const solvers = state.match.finishOrder.filter(e => e.solved);
      const nonSolvers = state.match.finishOrder.filter(e => !e.solved);
      if (solvers.length === 0) return null;
      const getName = (e: { playerId: string }) => nameMap.get(e.playerId) || e.playerId;
      const podium: string[][] = [[getName(solvers[0])]];
      if (solvers.length === 1) {
        const silver = nonSolvers.map(getName);
        if (silver.length > 0) podium.push(silver);
      } else if (solvers.length === 2) {
        podium.push([getName(solvers[1])]);
        const bronze = nonSolvers.map(getName);
        if (bronze.length > 0) podium.push(bronze);
      } else {
        for (let i = 1; i < 3; i++) podium.push([getName(solvers[i])]);
      }
      return { podium, playerCount: state.players.length };
    },
  };
}

export const plugin: GamePlugin = {
  definition: {
    id: 'fiveletterword',
    name: '5 Letter Word',
    factory,
  },
};
