import type { GamePlugin, GameComponentProps } from '../plugins/types';
import type { TradingExchangeState } from '@lancade/shared';
import { TradingExchangeGame } from './TradingExchangeGame';

export const plugin: GamePlugin = {
  config: {
    id: "tradingexchange",
    name: "Trading Exchange",
    slogan: "Buy low, sell high, read the market",
    description:
      "Everyone is dealt cards and trades based on the total value of all cards in play.",
    instructions: [
      "Everyone is dealt cards (Ace=1, 2-10, Jack=11, Queen=12, King=13). Estimate the total value of all cards and trade to profit.",
      "Each round reveals one card per player. If trades stall, more cards are revealed. All cards are shown in the final round.",
      "Enter a bid (max you'd pay) and offer (min you'd sell for). If your bid exceeds another's offer you automatically buy; if your offer is below another's bid you automatically sell.",
      "Update your bid and offer anytime. Trades happen instantly when they cross.",
      "A BUY trade profits if the final card value is higher than your trade price. A SELL trade profits if the final value is lower.",
      "All trades settle at the final card value. Most profit wins!",
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
