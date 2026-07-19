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
    id: "undercoveragent",
    name: "Undercover Agent",
    slogan: "Find the imposter among you!",
    description: "All players see the same word except the undercover agent.",
    instructions: [
      { heading: "Roles", text: "Everyone is shown the same secret word, except the undercover agent." },
      { heading: "Reveal", text: 'Click "Reveal" to learn your role, then click "Ready".' },
      { heading: "Clues", text: "Take turns submitting a clue word related to the secret word. The agent must bluff!" },
      { heading: "Danger", text: "If anyone submits the actual secret word, the agent wins immediately." },
      { heading: "Vote", text: "Vote who you think the agent is. A unanimous vote is required; if the group can't agree, the agent has a chance to sow doubt." },
      { heading: "Outcome", text: "If the group votes for the wrong player, the agent wins. If the agent is correctly identified, they get one final guess at the secret word." },
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
          { label: '1', value: 1 },
          { label: '2', value: 2 },
          { label: '3', value: 3 },
          { label: '4', value: 4 },
          { label: '5', value: 5 },
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
