import type { GamePlugin, GameFactoryOptions, BaseGame } from '../plugins/types.js';
import { createGame } from './tradingexchange.js';

/**
 * Create a Trading Exchange game instance for the registry.
 * @param options Factory options from the server.
 * @returns Game instance implementing the BaseGame interface.
 */
function factory(options: GameFactoryOptions): BaseGame {
  return createGame({
    onStateChange: options.onStateChange,
    playerStore: options.playerStore,
  });
}

export const plugin: GamePlugin = {
  definition: {
    id: 'tradingexchange',
    name: 'Trading Exchange',
    factory,
  },
};
