import type { GamePlugin, GameComponentProps } from '../plugins/types';
import type { CategoryClashState } from '@lancade/shared';
import { GridlockGame } from './GridlockGame';

/**
 * Check if the Gridlock plugin can render this server state.
 * @param serverState Current server state.
 * @param gameId Current game id.
 * @returns True when the plugin can render.
 */
function canRender(serverState: unknown, gameId: string): boolean {
  if (gameId !== 'gridlock') return false;
  return serverState !== null && typeof serverState === 'object' && 'round' in serverState;
}

/**
 * Get the round phase from server state.
 * @param serverState Current server state.
 * @returns Phase string.
 */
function getPhase(serverState: unknown): string {
  if (!serverState || typeof serverState !== 'object' || !('round' in serverState)) {
    return 'idle';
  }
  return (serverState as CategoryClashState).round.state;
}

/**
 * Gridlock has no category, so the header label is empty.
 * @returns Empty string.
 */
function getHeaderCategory(): string {
  return '';
}

/**
 * Render the Gridlock game component.
 * @param props Shared game component props.
 * @returns React element.
 */
function render(props: GameComponentProps) {
  return (
    <GridlockGame
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
    id: 'gridlock',
    name: 'Gridlock',
    slogan: 'Nine letters, endless words.',
    description: 'A 3x3 grid of jumbled letters is drawn from a hidden nine-letter word. Make as many words as you can from the available tiles before time runs out — longer words score more. When the timer ends, vote to reject words you do not think are valid.',
    instructions: [
      'A 3x3 grid of nine jumbled letters is revealed.',
      'Submit as many words as you can using only those letters.',
      'Each letter tile can be used once per word; repeated tiles can be reused that many times.',
      'Every accepted word scores one point per letter, so longer words are worth more.',
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
