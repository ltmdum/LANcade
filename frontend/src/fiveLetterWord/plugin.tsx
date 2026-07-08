import type { GamePlugin, GameComponentProps } from '../plugins/types';
import type { FiveLetterWordState } from '@lancade/shared';
import { FiveLetterWordGame } from './FiveLetterWordGame';

/**
 * Check if the Five Letter Word plugin can render this server state.
 * @param serverState Current server state.
 * @param gameId Current game id.
 * @returns True when the plugin can render.
 */
function canRender(serverState: unknown, gameId: string): boolean {
  if (gameId !== 'fiveletterword') return false;
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
  return (serverState as FiveLetterWordState).match.state;
}

/**
 * Get header category text for the UI.
 * @param _serverState Current server state.
 * @returns Header category label.
 */
function getHeaderCategory(_serverState: unknown): string {
  return 'Guess the Word';
}

/**
 * Render the Five Letter Word game component.
 * @param props Shared game component props.
 * @returns React element.
 */
function render(props: GameComponentProps) {
  return (
    <FiveLetterWordGame
      serverState={props.serverState as FiveLetterWordState}
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
    id: "fiveletterword",
    name: "5 Letter Word",
    slogan: "Race to guess the word before anyone else!",
    description: "Everyone races to guess a 5-letter word in 6 tries. First to solve wins!",
    instructions: [
      { heading: "Goal", text: "Guess the secret 5-letter word in 6 attempts." },
      { heading: "Green", text: "Correct letter in the right position." },
      { heading: "Yellow", text: "Correct letter in the wrong position." },
      { heading: "Gray", text: "Letter is not in the word." },
      { heading: "Race", text: "Everyone plays simultaneously. Be the first to solve it!" },
      { heading: "Leaderboard", text: "A mini display shows the current leader's result on each row." },
    ],
    hideTimer: true,
    roundControlTitle: 'Game Control',
    joinPanelTitle: 'Join the Game',
    minPlayers: 1,
  },
  canRender,
  getPhase,
  getHeaderCategory,
  render,
};
