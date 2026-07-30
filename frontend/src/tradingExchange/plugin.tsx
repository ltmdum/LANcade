import type { GamePlugin, GameComponentProps } from '../plugins/types';
import type { TradingExchangeState, GameState } from '@lancade/shared';
import { TradingExchangeGame } from './TradingExchangeGame';

export const plugin: GamePlugin = {
  config: {
    id: "tradingexchange",
    name: "Trading Exchange",
    slogan: "Buy low, sell high, read the market",
    description:
      "Everyone is dealt cards and trades based on the total value of all cards in play.",
    instructions: [
      { heading: "Deal", text: "Everyone is dealt cards (Ace=1, 2-10, Jack=11, Queen=12, King=13). Estimate the total value of all cards and trade to profit." },
      { heading: "Auction", text: "Enter a bid (max you'd pay) and offer (min you'd sell for). If your bid exceeds another's offer you automatically buy; if your offer is below another's bid you automatically sell." },
      { heading: "Trade", text: "Update your bid and offer anytime. Trades happen instantly when they cross." },
      { heading: "Reveal", text: "Each round reveals one card per player. If trades stall, more cards are revealed. All cards are shown in the final round." },
      { heading: "Profit", text: "A BUY trade profits if the final card value is higher than your trade price. A SELL trade profits if the final value is lower." },
      { heading: "Winner", text: "All trades settle at the total card value. Most profit wins! Ties are possible." },
    ],
    defaultTimer: { minutes: '00', seconds: '30' },
    gameSettings: [
      {
        key: 'cardsPerPlayer',
        label: 'Cards Each',
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
    roundControlTitle: 'Card Reveal Timer',
    joinPanelTitle: 'Join the Exchange',
    minPlayers: 2,
    olympics: true,
  },

  canRender: (serverState: GameState, gameId: string): boolean => {
    return gameId === 'tradingexchange' && !!serverState &&
      typeof serverState === 'object' && 'exchange' in serverState;
  },

  getPhase: (serverState: GameState): string => {
    const state = serverState as TradingExchangeState;
    const phase = state.exchange.state;
    if (phase === 'auction' || phase === 'trading') return 'active';
    return phase;
  },

  getHeaderCategory: (serverState: GameState): string => {
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
