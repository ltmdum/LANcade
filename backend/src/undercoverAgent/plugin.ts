import type { GamePlugin, GameFactoryOptions, BaseGame } from '../plugins/types.js';
import { createGame, UndercoverAgentGame } from './undercoveragent.js';

/**
 * Adapt the Undercover Agent game interface to BaseGame.
 * @param game Undercover Agent game instance.
 * @returns BaseGame compatible interface.
 */
function adaptToBaseGame(game: UndercoverAgentGame): BaseGame {
  return {
    getState: () => game.getState(),
    getPhase: () => game.getPhase(),
    joinPlayer: (payload) => game.joinPlayer(payload),
    submitWord: (playerId, word) => game.submitWord(playerId, word),
    submitVotes: (playerId, votes) => game.submitVotes(playerId, votes),
    startRound: (durationMs) => game.startRound(durationMs),
    endGame: () => game.endGame(),
    updateSettings: (settings) => game.updateSettings(settings),
  };
}

/**
 * Create an Undercover Agent game instance for the registry.
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
    id: 'undercoveragent',
    name: 'Undercover Agent',
    factory,
  },
};
