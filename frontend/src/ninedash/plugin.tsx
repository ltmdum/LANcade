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
      "A 3x3 grid of nine letters is revealed.",
      "Submit as many words as you can using only those letters.",
      "Each available letter can be used once per word.",
      "Every accepted word scores one point per letter.",
      "The hidden nine-letter word scores double (18 points) if you find it!",
      "When time's up, vote to accept or reject other players' words.",
      "Words that receive too many downvotes are removed. Highest score wins!",
    ],
    defaultTimer: {
      minutes: '02',
      seconds: '00',
    },
    roundControlTitle: 'Round Control',
    joinPanelTitle: 'Join the Round',
    minPlayers: 1,
  },
  canRender,
  getPhase,
  getHeaderCategory,
  render,
};
