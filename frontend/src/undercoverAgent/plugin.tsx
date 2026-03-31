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
      playerPassword={props.playerPassword}
      adminSessionId={props.adminSessionId}
      isAdmin={props.isAdmin}
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
    roundControlTitle: 'Game Control',
    joinPanelTitle: 'Join the Game',
    minPlayers: 3,
    customDuration: {
      label: 'Rounds',
      options: [
        { label: '1 round', durationMs: 1000 },
        { label: '2 rounds', durationMs: 2000 },
        { label: '3 rounds', durationMs: 3000 },
        { label: '4 rounds', durationMs: 4000 },
        { label: '5 rounds', durationMs: 5000 },
      ],
    },
  },
  canRender,
  getPhase,
  getHeaderCategory,
  render,
};
