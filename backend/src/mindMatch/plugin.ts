import type { GamePlugin, GameFactoryOptions, BaseGame } from '../plugins/types.js';
import { createGame, MindMatchGame } from './mindmatch.js';

/**
 * Adapt the Mind Match game interface to the BaseGame interface.
 * @param game Mind Match game instance.
 * @returns BaseGame compatible interface.
 */
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
  };
}

/**
 * Create a Mind Match game instance for the registry.
 * @param options Factory options from the server.
 * @returns Game instance implementing the BaseGame interface.
 */
function factory(options: GameFactoryOptions): BaseGame {
  const game = createGame({
    onStateChange: options.onStateChange,
    playerStore: options.playerStore,
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
