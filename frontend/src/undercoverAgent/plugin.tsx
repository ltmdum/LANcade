import type { GamePlugin, GameComponentProps } from '../plugins/types';
import type { UndercoverAgentState } from '@lancade/shared';
import { UndercoverAgentGame } from './UndercoverAgentGame';

function canRender(serverState: unknown, gameId: string): boolean {
  if (gameId !== 'undercoveragent') return false;
  return serverState !== null && typeof serverState === 'object' && 'match' in serverState;
}

function getPhase(serverState: unknown): string {
  if (!serverState || typeof serverState !== 'object' || !('match' in serverState)) {
    return 'idle';
  }
  return (serverState as UndercoverAgentState).match.state;
}

function getHeaderCategory(_serverState: unknown): string {
  return 'Undercover Agent';
}

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
    description: "Earn points by bluffing or catching the undercover agent across multiple rounds.",
    instructions: [
      { heading: "Roles", text: "Everyone is shown the same secret word, except the undercover agent." },
      { heading: "Clues", text: "Take turns submitting a clue word related to the secret word. The agent must bluff!" },
      { heading: "Danger", text: "If anyone submits the actual secret word, the agent wins the round immediately." },
      { heading: "Vote", text: "Vote for who you think the agent is. The player with the most votes is the result. If there is a tie, everyone votes again." },
      { heading: "Guess", text: "If the agent is voted out, they get one final guess at the secret word to earn points." },
      { heading: "Score", text: "Points accumulate across rounds. The first player to reach the winning score wins." },
    ],
    roundControlTitle: 'Game Control',
    joinPanelTitle: 'Join the Game',
    minPlayers: 3,
    hideTimer: true,
    gameSettings: [
      {
        key: 'winningScore',
        label: 'Winning Score',
        type: 'select',
        options: [
          { label: '5', value: 5 },
          { label: '10', value: 10 },
          { label: '15', value: 15 },
          { label: '20', value: 20 },
          { label: '25', value: 25 },
          { label: '30', value: 30 },
        ],
        defaultValue: 10,
      },
    ],
  },
  canRender,
  getPhase,
  getHeaderCategory,
  render,
};
