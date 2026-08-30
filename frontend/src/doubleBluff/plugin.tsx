import type { GamePlugin, GameComponentProps } from '../plugins/types';
import type { DoubleBluffState, GameState } from '@lancade/shared';
import { DoubleBluffGame } from './DoubleBluffGame';

function canRender(serverState: GameState, gameId: string): boolean {
  if (gameId !== 'doublebluff') return false;
  return serverState !== null && typeof serverState === 'object' && 'match' in serverState;
}

function getPhase(serverState: GameState): string {
  if (!serverState || typeof serverState !== 'object' || !('match' in serverState)) {
    return 'idle';
  }
  const match = (serverState as DoubleBluffState).match;
  if (match.winnerIds?.length > 0) return 'finished';
  // Keep EndGameButton visible while showing round results between rounds
  if (match.state === 'idle' && match.finishReason !== null) return 'active';
  return match.state;
}

function getHeaderCategory(_serverState: GameState): string {
  return 'Undercover Agent: Double Bluff';
}

function render(props: GameComponentProps) {
  return (
    <DoubleBluffGame
      serverState={props.serverState as DoubleBluffState}
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
    id: "doublebluff",
    name: "Undercover Agent: Double Bluff",
    slogan: "Find the imposter among you! Two simultaneous clues each.",
    description: "Everyone submits two clues at the same time, but only one is revealed. Can you spot the impostor?",
    instructions: [
      { heading: "Roles", text: "Everyone is shown the same secret word, except the undercover agent." },
      { heading: "First Clue", text: "All players submit a clue at the same time. The agent writes whatever they like, it won't be used." },
      { heading: "Second Clue", text: "All players submit a second clue while the agent is also shown everyone's first clues." },
      { heading: "Reveal", text: "One random clue from each civilian pair is displayed. Only the agent's second clue is shown." },
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
    olympics: true,
  },
  canRender,
  getPhase,
  getHeaderCategory,
  render,
};
