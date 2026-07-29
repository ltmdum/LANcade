import type { GamePlugin, GameFactoryOptions, BaseGame } from '../plugins/types.js';
import { createGame } from './tradingexchange.js';
import { buildPodiumFromScores } from '@lancade/shared';

function factory(options: GameFactoryOptions): BaseGame {
  const game = createGame({
    onStateChange: options.onStateChange,
    playerStore: options.playerStore,
  });
  return {
    getState: () => game.getState(),
    getPhase: () => game.getPhase(),
    joinPlayer: (payload) => game.joinPlayer(payload),
    submitWord: () => game.submitWord(),
    submitVotes: () => game.submitVotes(),
    startRound: (durationMs) => game.startRound(durationMs),
    endGame: () => game.endGame(),
    handleAction: (playerId, action) => game.handleAction(playerId, action),
    updateSettings: (settings) => game.updateSettings(settings),
    getOlympicsResult: () => {
      const state = game.getState();
      if (state.exchange.state !== 'finished') return null;
      const nameMap = new Map(state.players.map(p => [p.id, p.name]));
      if (!state.exchange.leaderboard) return null;
      const scored: [string, number][] = [];
      for (const entry of state.exchange.leaderboard) {
        scored.push([nameMap.get(entry.playerId) || entry.playerId, entry.pnl]);
      }
      const { podium, playerCount } = buildPodiumFromScores(scored);
      return { podium, playerCount };
    },
  };
}

export const plugin: GamePlugin = {
  definition: {
    id: 'tradingexchange',
    name: 'Trading Exchange',
    factory,
  },
};
