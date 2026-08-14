import type { GamePlugin, GameFactoryOptions, BaseGame } from '../plugins/types.js';
import { START_COUNTDOWN_MS } from '@lancade/shared';
import { createGame } from './ninedash.js';

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
    id: 'ninedash',
    name: 'Nine Dash',
    startCountdownMs: START_COUNTDOWN_MS,
    factory,
  },
};
