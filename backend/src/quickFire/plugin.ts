import type { GamePlugin, GameFactoryOptions, BaseGame } from '../plugins/types.js';
import { createGame } from './quickfire.js';

/**
 * Create a Category Clash v1 game instance for the registry.
 * @param options Factory options from the server.
 * @returns Game instance implementing the BaseGame interface.
 */
function factory(options: GameFactoryOptions): BaseGame {
  return createGame({
    onStateChange: options.onStateChange,
    clientGraceMs: options.clientGraceMs,
    playerStore: options.playerStore,
    sessionStore: options.sessionStore,
  });
}

export const plugin: GamePlugin = {
  definition: {
    id: 'quickfire',
    name: 'Category Clash: Quick Fire',
    factory,
  },
};
