import type { GamePlugin, GameComponentProps } from '../plugins/types';
import type { MindMatchState } from '@lancade/shared';
import { MindMatchGame } from './MindMatchGame';

/**
 * Check if the blankslate plugin can render this server state.
 * @param serverState Current server state.
 * @param gameId Current game id.
 * @returns True when the plugin can render.
 */
function canRender(serverState: unknown, gameId: string): boolean {
  if (gameId !== 'mindmatch') return false;
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
  const state = serverState as MindMatchState;
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
    return 'Mind Match';
  }
  const state = serverState as MindMatchState;
  if (state.round?.prompt) {
    const prompt = state.round.prompt;
    return prompt.blankPosition === 'before'
      ? `_____ ${prompt.text}`
      : `${prompt.text} _____`;
  }
  return 'Mind Match';
}

/**
 * Render the BlankSlate game component.
 * @param props Shared game component props.
 * @returns React element.
 */
function render(props: GameComponentProps) {
  return (
    <MindMatchGame
      serverState={props.serverState as MindMatchState}
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
    id: 'mindmatch',
    name: 'Mind Match',
    slogan: 'Match minds with your fellow players.',
    description: 'Everyone fills in the same blank. Match with exactly one other player to score 3 points, or match with a group for 1 point each. Unique answers can claim to be the same as others - if the vote passes, they join that group. First to 25 wins!',
    instructions: [
      'Each round shows a phrase with a blank to fill in.',
      'Secretly submit your word. Try to match with other players!',
      'Match with exactly one other player: 3 points each.',
      'Match with a group of 3+: 1 point each.',
      'Unique answers score 0 points, but you can claim yours matches another group. The other players vote to decide.',
      'First to 25 points wins!',
    ],
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
