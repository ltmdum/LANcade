import type { GamePlugin, GameComponentProps } from '../plugins/types';
import type { CategoryClashState } from '@lancade/shared';
import { CategoryClash2Game } from './CategoryClash2Game';

/**
 * Check if the categoryclash2 plugin can render this server state.
 * @param serverState Current server state.
 * @param gameId Current game id.
 * @returns True when the plugin can render.
 */
function canRender(serverState: unknown, gameId: string): boolean {
  if (gameId !== 'categoryclash2') return false;
  return serverState !== null && typeof serverState === 'object' && 'round' in serverState;
}

/**
 * Get the round phase from server state.
 * @param serverState Current server state.
 * @returns Phase string.
 */
function getPhase(serverState: unknown): string {
  if (!serverState || typeof serverState !== 'object' || !('round' in serverState)) {
    return 'idle';
  }
  return (serverState as CategoryClashState).round.state;
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
  const state = serverState as CategoryClashState;
  const selectedCategories = state.settings?.selectedCategories || [];
  if (selectedCategories.length > 0) {
    return selectedCategories.join(' · ');
  }
  return state.settings?.selectedCategory || 'Category';
}

/**
 * Render the categoryclash2 game component.
 * @param props Shared game component props.
 * @returns React element.
 */
function render(props: GameComponentProps) {
  return (
    <CategoryClash2Game
      serverState={props.serverState as CategoryClashState}
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
    id: 'categoryclash2',
    name: 'Category Clash v2.0',
    slogan: 'Multiple categories, one shared letter.',
    description: 'Like Category Clash v1.0, but with multiple categories per round. Submit one word per category, all starting with the same letter. You can update your answers until time runs out. Strategic word choice is key!',
    defaultTimer: {
      minutes: '01',
      seconds: '30',
    },
    roundControlTitle: 'Round Control',
    joinPanelTitle: 'Join the Round',
    minPlayers: 1,
  },
  canRender,
  getPhase,
  getHeaderCategory,
  render,
};
