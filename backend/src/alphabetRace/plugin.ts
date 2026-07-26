import type { GamePlugin, GameFactoryOptions, BaseGame } from '../plugins/types.js';
import { createGame } from './alphabetrace.js';

/**
 * Create an Alphabet Race game instance for the registry.
 * @param options Factory options from the server.
 * @returns Game instance implementing the BaseGame interface.
 */
function factory(options: GameFactoryOptions): BaseGame {
  return createGame({
    onStateChange: options.onStateChange,
    playerStore: options.playerStore,
    sessionStore: options.sessionStore,
  });
}

export const plugin: GamePlugin = {
  definition: {
    id: 'alphabetrace',
    name: 'Alphabet Race',
    factory,
  },
};
