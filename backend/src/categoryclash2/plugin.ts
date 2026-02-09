import type { GamePlugin, GameFactoryOptions, BaseGame } from '../plugins/types.js';
import { createGame } from './categoryclash2.js';

/**
 * Create a Category Clash v2 game instance for the registry.
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
    id: 'categoryclash2',
    name: 'Category Clash v2.0',
    factory,
  },
};
