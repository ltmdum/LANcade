import type { GamePlugin, GameComponentProps } from '../plugins/types';
import type { LastWordStandingState, GameState } from '@lancade/shared';
import { LastWordStandingGame } from './LastWordStandingGame';

/**
 * Check if the Last Word Standing plugin can render this server state.
 * @param serverState Current server state.
 * @param gameId Current game id.
 * @returns True when the plugin can render.
 */
function canRender(serverState: GameState, gameId: string): boolean {
  if (gameId !== 'lastwordstanding') return false;
  return serverState !== null && typeof serverState === 'object' && 'match' in serverState;
}

/**
 * Get the match phase from server state.
 * @param serverState Current server state.
 * @returns Phase string.
 */
function getPhase(serverState: GameState): string {
  if (!serverState || typeof serverState !== 'object' || !('match' in serverState)) {
    return 'idle';
  }
  return (serverState as LastWordStandingState).match.state;
}

/**
 * Get header category text for the UI.
 * @param serverState Current server state.
 * @returns Header category label.
 */
function getHeaderCategory(serverState: GameState): string {
  if (!serverState || typeof serverState !== 'object' || !('settings' in serverState)) {
    return 'Category';
  }
  const state = serverState as LastWordStandingState;
  return state.settings?.selectedCategory || 'Category';
}

/**
 * Render the Last Word Standing game component.
 * @param props Shared game component props.
 * @returns React element.
 */
function render(props: GameComponentProps) {
  return (
    <LastWordStandingGame
      serverState={props.serverState as LastWordStandingState}
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
    id: "lastwordstanding",
    name: "Last Word Standing",
    slogan: "Race the clock and survive the votes.",
    description: "1 player is chosen to submit a word that fits the category and the assigned letter. The last player standing wins!",
    instructions: [
      { heading: "Turns", text: "Players get assigned turns. When it's your turn, you get a random letter." },
      { heading: "Submit", text: "Submit a word that fits the category and starts with that letter before time runs out." },
      { heading: "Vote", text: "Other players vote to accept or reject your word." },
      { heading: "Penalty", text: "If rejected, you get one more chance with half the time." },
      { heading: "Elimination", text: "Run out of time or get rejected twice and you're eliminated." },
      { heading: "Reactivation", text: "If eliminated, you may come back in if everyone fails on the same round as you." },
      { heading: "Winner", text: "The last player standing wins." },
    ],
    defaultTimer: {
      minutes: '00',
      seconds: '20',
    },
    roundControlTitle: 'Turn Timer',
    joinPanelTitle: 'Join the Game',
    minPlayers: 2,
    sharesWordPool: true,
    olympics: true,
  },
  canRender,
  getPhase,
  getHeaderCategory,
  render,
};
