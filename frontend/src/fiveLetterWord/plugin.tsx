import type { GamePlugin, GameComponentProps } from '../plugins/types';
import type { FiveLetterWordState } from '@lancade/shared';
import { FiveLetterWordGame } from './FiveLetterWordGame';

/**
 * Check if the wordsprint plugin can render this server state.
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
 * Render the Word Sprint game component.
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
      playerPassword={props.playerPassword}
      adminSessionId={props.adminSessionId}
      isAdmin={props.isAdmin}
      setShowConfig={props.setShowConfig}
    />
  );
}

export const plugin: GamePlugin = {
  config: {
    id: 'fiveletterword',
    name: '5 Letter Word',
    slogan: 'Race to guess the word before anyone else!',
    description: 'A competitive Guess-style racing game. Everyone plays Guess simultaneously, racing to guess a 5-letter word in 6 tries. Green = correct letter in correct position, yellow = correct letter in wrong position. First to solve wins! A mini display shows how well other players are doing on each row.',
    instructions: [
      'Guess the secret 5-letter word in 6 attempts.',
      'Green = correct letter in the right position.',
      'Yellow = correct letter in the wrong position.',
      'Gray = letter is not in the word.',
      'Everyone plays simultaneously. Race to be the first to solve it!',
      'A mini display shows how other players are progressing on each row.',
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
