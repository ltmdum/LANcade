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
      'Everyone is dealt hidden cards (A=1, 2-10, J=11, Q=12, K=13). You can see your own cards but nobody else\'s.',
      'Think of it like this: you\'re making agreements to buy or sell a nugget of gold at a certain price. None of the agreements are settled until the end, when the bank reveals its price — the sum of ALL cards in play.',
      'A BUY agreement means you\'ve agreed to pay someone a fixed price for a nugget. If the bank\'s price turns out higher, you profit (you got it cheap). If lower, you lose.',
      'A SELL agreement means someone has agreed to pay you a fixed price for a nugget. If the bank\'s price turns out lower, you profit (you sold it dear). If higher, you lose.',
      'First, the Auction: enter a bid (the most you\'d pay) and an offer (the least you\'d sell for). Your bid must be lower than your offer. If your bid is higher than someone else\'s offer, an agreement is made automatically.',
      'Then, Trading begins: update your bid and offer as many times as you like. When your bid matches someone else\'s offer (or vice versa), an agreement is made instantly.',
      'Each round, one card per player is flipped face-up for everyone to see. As more cards are revealed, you get a better idea of the bank\'s final price. Race to update your numbers before others react!',
      'If nobody trades for a while, the round ends and more cards are revealed. In the final round, all cards are shown — so the bank\'s price is known!',
      'If auto-submit is enabled and one of your orders gets filled, you have a limited time to adjust before your current values are automatically resubmitted. The countdown shows on the Submit button.',
      'At the end, all agreements are settled and the bank buys or sells any remaining nuggets at the final price. The player who made the most profit wins!',
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
