import type { GamePlugin, GameComponentProps } from '../plugins/types';
import type { CategoryClashState, GameState } from '@lancade/shared';
import { QuickFireGame } from './QuickFireGame';

/**
 * Check if the Quick Fire plugin can render this server state.
 * @param serverState Current server state.
 * @param gameId Current game id.
 * @returns True when the plugin can render.
 */
function canRender(serverState: GameState, gameId: string): boolean {
  if (gameId !== 'quickfire') return false;
  return serverState !== null && typeof serverState === 'object' && 'round' in serverState;
}

/**
 * Get the round phase from server state.
 * @param serverState Current server state.
 * @returns Phase string.
 */
function getPhase(serverState: GameState): string {
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
function getHeaderCategory(serverState: GameState): string {
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
    id: "quickfire",
    name: "Category Clash: Quick Fire",
    slogan: "One letter, one category, most words wins.",
    description: "Race to submit as many words in the chosen category that start with the given letter as you can before time runs out.",
    instructions: [
      { heading: "Setup", text: "Admin chooses a category and a random letter is given." },
      { heading: "Submit", text: "Submit as many words as you can that start with the letter and fit the category." },
      { heading: "Be quick", text: "You can't submit a word that another player has already submitted." },
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
    sharesWordPool: true,
    olympics: true,
  },
  canRender,
  getPhase,
  getHeaderCategory,
  render,
};
