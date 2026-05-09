import type { GamePlugin, GameComponentProps } from '../plugins/types';
import type { TradingExchangeState } from '@lancade/shared';
import { TradingExchangeGame } from './TradingExchangeGame';

export const plugin: GamePlugin = {
  config: {
    id: 'tradingexchange',
    name: 'Trading Exchange',
    slogan: 'Buy low, sell high, read the market',
    description:
      'Everyone gets secret cards and tries to guess the total value of ALL cards in play. ' +
      'Buy low and sell high to make profit! Cards are revealed one by one ' +
      'so you can refine your estimate as you learn more. Biggest profit wins!',
    instructions: [
      'Everyone is dealt hidden cards (A=1, 2-10, J=11, Q=12, K=13). You can see your own cards but not anyone else\'s.',
      'Your goal: guess what all the cards in play add up to, then buy low and sell high to make profit.',
      'First, the Auction: enter two numbers — a low guess (your "bid", the price you\'d buy at) and a high guess (your "offer", the price you\'d sell at). Your bid must be lower than your offer.',
      'If your low guess is higher than someone else\'s high guess, a trade happens automatically between you. You don\'t see anyone else\'s guesses until the auction is over.',
      'Then, Trading begins: you can update your bid and offer as many times as you like. If your bid is high enough to match someone else\'s offer (or vice versa), a trade happens instantly.',
      'Buying means you\'re betting the true total is HIGHER than the price you paid. Selling means you\'re betting it\'s LOWER.',
      'Each round, one card per player is flipped face-up for everyone to see. With new information, race to update your numbers before others react!',
      'If nobody trades for a while, the round ends and more cards are revealed. In the final round, all cards are shown.',
      'If auto-submit is enabled and one of your orders gets filled, you have a limited time to adjust before your current values are automatically resubmitted. The countdown shows on the Submit button.',
      'At the end, any remaining positions are settled at the actual total. The player who made the most profit wins!',
    ],
    defaultTimer: { minutes: '00', seconds: '30' },
    gameSettings: [
      {
        key: 'cardsPerPlayer',
        label: 'Cards per Player',
        type: 'select',
        options: Array.from({ length: 13 }, (_, i) => ({
          label: String(i + 1),
          value: i + 1,
        })),
        defaultValue: 2,
      },
      {
        key: 'autoSubmitMs',
        label: 'Auto-Submit Timer',
        type: 'select',
        options: [
          { label: 'None', value: 0 },
          { label: '3 seconds', value: 3000 },
          { label: '5 seconds', value: 5000 },
          { label: '10 seconds', value: 10000 },
          { label: '15 seconds', value: 15000 },
          { label: '20 seconds', value: 20000 },
          { label: '30 seconds', value: 30000 },
        ],
        defaultValue: 0,
      },
    ],
    roundControlTitle: 'Start Trading',
    joinPanelTitle: 'Join the Exchange',
    minPlayers: 2,
  },

  canRender: (serverState: unknown, gameId: string): boolean => {
    return gameId === 'tradingexchange' && !!serverState &&
      typeof serverState === 'object' && 'exchange' in serverState;
  },

  getPhase: (serverState: unknown): string => {
    const state = serverState as TradingExchangeState;
    const phase = state.exchange.state;
    if (phase === 'auction' || phase === 'trading') return 'active';
    return phase;
  },

  getHeaderCategory: (serverState: unknown): string => {
    const state = serverState as TradingExchangeState;
    const ex = state.exchange;
    if (ex.state === 'auction') return 'Auction';
    if (ex.state === 'trading') {
      return `Round ${ex.currentRound} of ${ex.totalRounds}`;
    }
    if (ex.state === 'finished') return 'Final Results';
    return '';
  },

  render: (props: GameComponentProps) => <TradingExchangeGame {...props} />,
};
