import type { GamePlugin, GameFactoryOptions, BaseGame } from '../plugins/types.js';
import { createGame } from './gridlock.js';

/**
 * Create a Gridlock game instance for the registry.
 * @param options Factory options from the server.
 * @returns Game instance implementing the BaseGame interface.
 */
function factory(options: GameFactoryOptions): BaseGame {
  return createGame({
    onStateChange: options.onStateChange,
    clientGraceMs: options.clientGraceMs,
    playerStore: options.playerStore,
  });
}

export const plugin: GamePlugin = {
  definition: {
    id: 'gridlock',
    name: 'Gridlock',
    factory,
  },
};
