import type { GamePlugin, GameComponentProps } from '../plugins/types';
import type { CategoryClashState } from '@lancade/shared';
import { QuickFireGame } from './QuickFireGame';

/**
 * Check if the Quick Fire plugin can render this server state.
 * @param serverState Current server state.
 * @param gameId Current game id.
 * @returns True when the plugin can render.
 */
function canRender(serverState: unknown, gameId: string): boolean {
  if (gameId !== 'quickfire') return false;
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
  return state.settings?.selectedCategory || 'Category';
}

/**
 * Render the Quick Fire game component.
 * @param props Shared game component props.
 * @returns React element.
 */
function render(props: GameComponentProps) {
  return (
    <QuickFireGame
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
    id: 'quickfire',
    name: 'Category Clash: Quick Fire',
    slogan: 'Fast rounds, shared letter, and friendly disputes.',
    description: 'Everyone gets the same letter and category. Race to submit as many unique words as you can before time runs out. Duplicate words are blocked, and players vote on questionable answers. Most accepted words wins!',
    instructions: [
      'A category and letter are chosen for the round.',
      'Submit as many words as you can that start with the letter and fit the category.',
      'Be quick! The first player to submit a word claims it. Duplicates are rejected.',
      "When time's up, vote to challenge other players' words.",
      'Words that receive enough downvotes are removed. The player with the most accepted words wins!',
    ],
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
