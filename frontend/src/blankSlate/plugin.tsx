import type { GamePlugin, GameComponentProps } from '../plugins/types';
import type { BlankSlateState } from '@lancade/shared';
import { BlankSlateGame } from './BlankSlateGame';

/**
 * Check if the blankslate plugin can render this server state.
 * @param serverState Current server state.
 * @param gameId Current game id.
 * @returns True when the plugin can render.
 */
function canRender(serverState: unknown, gameId: string): boolean {
  if (gameId !== 'blankslate') return false;
  return serverState !== null && typeof serverState === 'object' && 'round' in serverState && 'scores' in serverState;
}

/**
 * Get the round phase from server state.
 * @param serverState Current server state.
 * @returns Phase string.
 */
function getPhase(serverState: unknown): string {
  if (!serverState || typeof serverState !== 'object') {
    return 'idle';
  }
  const state = serverState as BlankSlateState;
  if (state.winnerId) {
    return 'finished';
  }
  return state.round?.state || 'idle';
}

/**
 * Get header category text for the UI.
 * @param serverState Current server state.
 * @returns Header category label.
 */
function getHeaderCategory(serverState: unknown): string {
  if (!serverState || typeof serverState !== 'object' || !('round' in serverState)) {
    return 'BlankSlate';
  }
  const state = serverState as BlankSlateState;
  if (state.round?.prompt) {
    const prompt = state.round.prompt;
    return prompt.blankPosition === 'before'
      ? `_____ ${prompt.text}`
      : `${prompt.text} _____`;
  }
  return 'BlankSlate';
}

/**
 * Render the BlankSlate game component.
 * @param props Shared game component props.
 * @returns React element.
 */
function render(props: GameComponentProps) {
  return (
    <BlankSlateGame
      serverState={props.serverState as BlankSlateState}
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
    id: 'blankslate',
    name: 'BlankSlate',
    slogan: 'Match minds with your fellow players.',
    description: 'Everyone fills in the same blank. Match with exactly one other player to score 3 points, or match with a group for 1 point each. Unique answers can claim to be the same as others - if the vote passes, they join that group. First to 25 wins!',
    defaultTimer: {
      minutes: '00',
      seconds: '30',
    },
    roundControlTitle: 'Round Control',
    joinPanelTitle: 'Join the Game',
    minPlayers: 3,
    hideTimer: true,
  },
  canRender,
  getPhase,
  getHeaderCategory,
  render,
};
