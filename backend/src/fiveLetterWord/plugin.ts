import type { GamePlugin, GameFactoryOptions, BaseGame } from '../plugins/types.js';
import { createGame } from './fiveletterword.js';

/**
 * Create a Five Letter Word game instance for the registry.
 * @param options Factory options from the server.
 * @returns Game instance implementing the BaseGame interface.
 */
function factory(options: GameFactoryOptions): BaseGame {
  return createGame({
    onStateChange: options.onStateChange,
    playerStore: options.playerStore,
    clientGraceMs: options.clientGraceMs,
  });
}

export const plugin: GamePlugin = {
  definition: {
    id: 'fiveletterword',
    name: '5 Letter Word',
    factory,
  },
};
