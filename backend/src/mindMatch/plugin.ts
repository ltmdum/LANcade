import type { GamePlugin, GameFactoryOptions, BaseGame } from '../plugins/types.js';
import { createGame, MindMatchGame } from './mindmatch.js';
import { buildPodiumFromScores } from '@lancade/shared';

function adaptToBaseGame(game: MindMatchGame): BaseGame {
  return {
    getState: () => game.getState(),
    getPhase: () => game.getPhase(),
    joinPlayer: (payload) => game.joinPlayer(payload),
    submitWord: (playerId, word) => game.submitWord(playerId, word),
    submitVotes: (playerId, votes) => game.submitVotes(playerId, votes),
    startRound: (durationMs) => game.startRound(durationMs),
    finishRound: (playerId, roundId) => game.finishRound(playerId, roundId),
    endGame: () => game.endGame(),
    updateSettings: (settings) => game.updateSettings(settings),
    getOlympicsResult: () => {
      const state = game.getState();
      if (state.winnerIds.length === 0) return null;
      const nameMap = new Map(state.players.map(p => [p.id, p.name]));
      const scored = Object.entries(state.scores)
        .map(([id, score]) => [nameMap.get(id) || id, score] as [string, number]);
      const { podium, playerCount } = buildPodiumFromScores(scored);
      return { podium, playerCount };
    },
  };
}

function factory(options: GameFactoryOptions): BaseGame {
  const game = createGame({
    onStateChange: options.onStateChange,
    playerStore: options.playerStore,
    sessionStore: options.sessionStore,
  });
  return adaptToBaseGame(game);
}

export const plugin: GamePlugin = {
  definition: {
    id: 'mindmatch',
    name: 'Mind Match',
    factory,
  },
};
