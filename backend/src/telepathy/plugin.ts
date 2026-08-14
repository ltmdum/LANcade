import type { GamePlugin, GameFactoryOptions, BaseGame } from '../plugins/types.js';
import { createGame } from './telepathy.js';
import { START_COUNTDOWN_MS } from '@lancade/shared';

function factory(options: GameFactoryOptions): BaseGame {
  return createGame({
    onStateChange: options.onStateChange,
    playerStore: options.playerStore,
  });
}

export const plugin: GamePlugin = {
  definition: {
    id: 'telepathy',
    name: 'Telepathy',
    startCountdownMs: START_COUNTDOWN_MS,
    factory,
  },
};
