import type { GamePlugin, GameComponentProps } from '../plugins/types';
import type { UndercoverAgentState } from '@lancade/shared';
import { UndercoverAgentGame } from './UndercoverAgentGame';

/**
 * Check if the undercover agent plugin can render this server state.
 * @param serverState Current server state.
 * @param gameId Current game id.
 * @returns True when the plugin can render.
 */
function canRender(serverState: unknown, gameId: string): boolean {
  if (gameId !== 'undercoveragent') return false;
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
  return (serverState as UndercoverAgentState).match.state;
}

/**
 * Get header category text for the UI.
 * @param _serverState Current server state.
 * @returns Header category label.
 */
function getHeaderCategory(_serverState: unknown): string {
  return 'Undercover Agent';
}

/**
 * Render the Undercover Agent game component.
 * @param props Shared game component props.
 * @returns React element.
 */
function render(props: GameComponentProps) {
  return (
    <UndercoverAgentGame
      serverState={props.serverState as UndercoverAgentState}
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
    id: 'undercoveragent',
    name: 'Undercover Agent',
    slogan: 'Find the imposter among you!',
    description: 'All players see the same word except the undercover agent. Submit clues, then vote to find the spy. Unanimous vote needed to end the game!',
    instructions: [
      '1. Everyone is shown the same secret word, except the undercover agent.',
      '2. Click "Reveal" to learn your role, then click "Ready".',
      '3. Take turns submitting a clue word related to the secret word. The agent must bluff!',
      '4. Be careful! If anyone submits the actual secret word, the game ends immediately.',
      '5. After clue rounds, vote for who you think is the agent. A unanimous vote is required.',
      '6. If the agent is correctly identified, they get one final guess at the secret word.',
    ],
    roundControlTitle: 'Game Control',
    joinPanelTitle: 'Join the Game',
    minPlayers: 3,
    hideTimer: true,
    gameSettings: [
      {
        key: 'totalRounds',
        label: 'Submission Rounds',
        type: 'select',
        options: [
          { label: '1 round', value: 1 },
          { label: '2 rounds', value: 2 },
          { label: '3 rounds', value: 3 },
          { label: '4 rounds', value: 4 },
          { label: '5 rounds', value: 5 },
        ],
        defaultValue: 2,
      },
    ],
  },
  canRender,
  getPhase,
  getHeaderCategory,
  render,
};
