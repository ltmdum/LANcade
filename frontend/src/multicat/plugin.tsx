import type { GamePlugin, GameComponentProps } from '../plugins/types';
import type { CategoryClashState } from '@lancade/shared';
import { MulticatGame } from './MulticatGame';

/**
 * Check if the Multicat plugin can render this server state.
 * @param serverState Current server state.
 * @param gameId Current game id.
 * @returns True when the plugin can render.
 */
function canRender(serverState: unknown, gameId: string): boolean {
  if (gameId !== 'multicat') return false;
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
 * Render the Multicat game component.
 * @param props Shared game component props.
 * @returns React element.
 */
function render(props: GameComponentProps) {
  return (
    <MulticatGame
      serverState={props.serverState as CategoryClashState}
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
    id: "multicat",
    name: "Category Clash: Multicat",
    slogan: "Multiple categories, one shared letter.",
    description: "Submit one word per category, all starting with the given letter.",
    instructions: [
      { heading: "Setup", text: "Admin chooses multiple categories, and a random letter is given." },
      { heading: "Submit", text: "Submit one word per category, all starting with the given letter." },
      { heading: "Update", text: "You may change your answers before the timer ends." },
      { heading: "Duplicate", text: "You cannot use a word twice or at all if another player has already used it." },
      { heading: "Voting", text: "When time's up, vote to accept or reject other players' words. Words that receive more than 50% downvotes are removed." },
      { heading: "Winner", text: "The player with the most accepted words wins! Ties are possible." },
    ],
    defaultTimer: {
      minutes: '01',
      seconds: '30',
    },
    roundControlTitle: 'Round Timer',
    joinPanelTitle: 'Join the Round',
    minPlayers: 1,
  },
  canRender,
  getPhase,
  getHeaderCategory,
  render,
};
