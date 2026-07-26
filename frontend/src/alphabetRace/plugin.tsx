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
      accessKey={props.accessKey}
      isAdmin={props.isAdmin}
      isParticipating={props.isParticipating}
      setShowConfig={props.setShowConfig}
    />
  );
}

export const plugin: GamePlugin = {
  config: {
    id: "alphabetrace",
    name: "Alphabet Race",
    slogan: "A race around the alphabet!",
    description: "Be the first to submit a word for each letter of the alphabet.",
    instructions: [
      { heading: "Start", text: "Play starts on a random letter and progresses through the entire alphabet in random order." },
      { heading: "Race", text: "Be the first to submit a word for the current letter." },
      { heading: "Vote", text: "Players vote to accept or reject whether the word belongs to the category." },
      { heading: "Penalty", text: "If rejected, you sit out this letter AND the next one." },
      { heading: "Score", text: "Accepted words score 1 point, then play moves to the next letter." },
      { heading: "Skip", text: "The host can skip a letter if the group is stuck." },
      { heading: "Winner", text: "The player with the most points after all 26 letters wins! Ties are possible." },
    ],
    defaultTimer: {
      minutes: '00',
      seconds: '10',
    },
    roundControlTitle: 'Voting Timout',
    joinPanelTitle: 'Join the Race',
    minPlayers: 2,
    sharesWordPool: true,
  },
  canRender,
  getPhase,
  getHeaderCategory,
  render,
};
