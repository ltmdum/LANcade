import type { GamePlugin, GameComponentProps } from '../plugins/types';
import type { MindMatchState } from '@lancade/shared';
import { MindMatchGame } from './MindMatchGame';

/**
 * Check if the Mind Match plugin can render this server state.
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
  if (state.winnerIds?.length > 0) {
    return 'finished';
  }
  // Keep EndGameButton visible while showing interim results between rounds
  if (state.round?.state === 'results') return 'active';
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
 * Render the Mind Match game component.
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
      accessKey={props.accessKey}
      isAdmin={props.isAdmin}
      isParticipating={props.isParticipating}
      setShowConfig={props.setShowConfig}
    />
  );
}

export const plugin: GamePlugin = {
  config: {
    id: "mindmatch",
    name: "Mind Match",
    slogan: "Match minds with your fellow players.",
    description: "Everyone fills in the same blank hoping to match with other players.",
    instructions: [
      { heading: "Prompt", text: "Each round shows a phrase with a blank to fill in." },
      { heading: "Submit", text: "Secretly submit your word hoping to match with other players!" },
      { heading: "Match", text: "Match with exactly one other player: 3 points each. Match with a group of 3+: 1 point each. Unique answers score 0." },
      { heading: "Claims", text: "You may claim your word matches another similar word. Other players vote to decide." },
      { heading: "Winner", text: "First to reach the target score wins! (Default: 25)" },
    ],
    defaultTimer: {
      minutes: '00',
      seconds: '30',
    },
    roundControlTitle: 'Round Control',
    joinPanelTitle: 'Join the Game',
    minPlayers: 3,
    hideTimer: true,
    gameSettings: [
      {
        key: 'winningScore',
        label: 'Winning Score',
        type: 'select',
        options: Array.from({ length: 20 }, (_, i) => ({
          label: `${(i + 1) * 5} points`,
          value: (i + 1) * 5,
        })),
        defaultValue: 25,
      },
    ],
  },
  canRender,
  getPhase,
  getHeaderCategory,
  render,
};
