import type { GamePlugin, GameComponentProps } from '../plugins/types';
import type { CategoryClashState } from '@lancade/shared';
import { NineDashGame } from './NineDashGame';

function canRender(serverState: unknown, gameId: string): boolean {
  if (gameId !== 'ninedash') return false;
  return serverState !== null && typeof serverState === 'object' && 'round' in serverState;
}

function getPhase(serverState: unknown): string {
  if (!serverState || typeof serverState !== 'object' || !('round' in serverState)) {
    return 'idle';
  }
  return (serverState as CategoryClashState).round.state;
}

function getHeaderCategory(): string {
  return '';
}

function render(props: GameComponentProps) {
  return (
    <NineDashGame
      serverState={props.serverState as CategoryClashState}
      connection={props.connection}
      playerId={props.playerId}
      playerName={props.playerName}
      accessKey={props.accessKey}
      isAdmin={props.isAdmin}
      isParticipating={props.isParticipating}
      setShowConfig={props.setShowConfig}
    />
  );
}

export const plugin: GamePlugin = {
  config: {
    id: "ninedash",
    name: "Nine Dash",
    slogan: "Nine letters, endless words.",
    description: "Make as many words as you can from the available 3x3 grid of letters before time runs out.",
    instructions: [
      { heading: "Grid", text: "A 3x3 grid of nine letters is revealed." },
      { heading: "Submit", text: "Tap letters on the grid to build words, then tap Submit. Each letter can be used once per word." },
      { heading: "Scoring", text: "Every accepted word scores one point per letter." },
      { heading: "Bonus", text: "The hidden nine-letter word scores double (18 points) if you find it!" },
      { heading: "Voting", text: "When time's up, vote to accept or reject other players' words. Words that receive too many downvotes are removed." },
      { heading: "Winner", text: "Highest score wins! Ties are possible." },
    ],
    defaultTimer: {
      minutes: '02',
      seconds: '00',
    },
    roundControlTitle: 'Round Control',
    joinPanelTitle: 'Join the Round',
    minPlayers: 1,
    olympics: true,
  },
  canRender,
  getPhase,
  getHeaderCategory,
  render,
};
