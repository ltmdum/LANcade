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
    id: 'ninedash',
    name: 'Nine Dash',
    slogan: 'Nine letters, endless words.',
    description: 'A 3x3 grid of jumbled letters is drawn from a hidden nine-letter word. Make as many words as you can from the available tiles before time runs out — longer words score more. When the timer ends, vote to reject words you do not think are valid.',
    instructions: [
      'A 3x3 grid of nine jumbled letters is revealed.',
      'Submit as many words as you can using only those letters.',
      'Each letter tile can be used once per word; repeated tiles can be reused that many times.',
      'Every accepted word scores one point per letter, so longer words are worth more.',
      'The hidden nine-letter word scores double (18 points) if you find it!',
      'Words you have already submitted are rejected.',
      "When time's up, vote to challenge other players' words. Highest score wins!",
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
