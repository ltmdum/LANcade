import type { GamePlugin, GameComponentProps } from '../plugins/types';
import type { AlphabetRaceState } from '@lancade/shared';
import { AlphabetRaceGame } from './AlphabetRaceGame';

/**
 * Check if the alphabetrace plugin can render this server state.
 * @param serverState Current server state.
 * @param gameId Current game id.
 * @returns True when the plugin can render.
 */
function canRender(serverState: unknown, gameId: string): boolean {
  if (gameId !== 'alphabetrace') return false;
  return serverState !== null && typeof serverState === 'object' && 'match' in serverState;
}

/**
 * Get the match phase from server state.
 * @param serverState Current server state.
 * @returns Phase string.
 */
function getPhase(serverState: unknown): string {
  if (!serverState || typeof serverState !== 'object' || !('match' in serverState)) {
    return 'idle';
  }
  return (serverState as AlphabetRaceState).match.state;
}

/**
 * Get header category text for the UI.
 * @param serverState Current server state.
 * @returns Header category label.
 */
function getHeaderCategory(serverState: unknown): string {
  if (!serverState || typeof serverState !== 'object' || !('settings' in serverState)) {
    return 'Category';
  }
  const state = serverState as AlphabetRaceState;
  return state.settings?.selectedCategory || 'Category';
}

/**
 * Render the Alphabet Race game component.
 * @param props Shared game component props.
 * @returns React element.
 */
function render(props: GameComponentProps) {
  return (
    <AlphabetRaceGame
      serverState={props.serverState as AlphabetRaceState}
      connection={props.connection}
      playerId={props.playerId}
      playerName={props.playerName}
      playerPassword={props.playerPassword}
      adminSessionId={props.adminSessionId}
      isAdmin={props.isAdmin}
      setShowConfig={props.setShowConfig}
    />
  );
}

export const plugin: GamePlugin = {
  config: {
    id: 'alphabetrace',
    name: 'Alphabet Race',
    slogan: 'A race through the alphabet!',
    description: 'Race to submit words for each letter. Other players vote to accept or reject. Get rejected and you sit out! Complete all 26 letters to finish.',
    instructions: [
      'Race through all 26 letters of the alphabet!',
      'Be the first to submit a valid word for the current letter and category.',
      'Other players vote to accept or reject your word.',
      'If rejected, you sit out this letter AND the next one as a penalty.',
      'Accepted words score 1 point, then play moves to the next letter.',
      'The player with the most points after all 26 letters wins!',
    ],
    defaultTimer: {
      minutes: '00',
      seconds: '10',
    },
    roundControlTitle: 'Game Control',
    joinPanelTitle: 'Join the Race',
    minPlayers: 2,
  },
  canRender,
  getPhase,
  getHeaderCategory,
  render,
};
