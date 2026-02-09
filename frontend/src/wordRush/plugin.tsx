import type { GamePlugin, GameComponentProps } from '../plugins/types';
import type { WordRushState } from '@lancade/shared';
import { WordRushGame } from './WordRushGame';

/**
 * Check if the wordrush plugin can render this server state.
 * @param serverState Current server state.
 * @param gameId Current game id.
 * @returns True when the plugin can render.
 */
function canRender(serverState: unknown, gameId: string): boolean {
  if (gameId !== 'wordrush') return false;
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
  return (serverState as WordRushState).match.state;
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
  const state = serverState as WordRushState;
  return state.settings?.selectedCategory || 'Category';
}

/**
 * Render the WordRush game component.
 * @param props Shared game component props.
 * @returns React element.
 */
function render(props: GameComponentProps) {
  return (
    <WordRushGame
      serverState={props.serverState as WordRushState}
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
    id: 'wordrush',
    name: 'WordRush',
    slogan: 'Race the clock and survive the votes.',
    description: 'Players take turns saying words that fit the category and start with the current letter. Other players vote to accept or reject each word. Get rejected twice and you\'re eliminated. Last player standing wins!',
    defaultTimer: {
      minutes: '00',
      seconds: '20',
    },
    roundControlTitle: 'Game Control',
    joinPanelTitle: 'Join the Game',
    minPlayers: 2,
  },
  canRender,
  getPhase,
  getHeaderCategory,
  render,
};
