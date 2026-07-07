import type { GamePlugin, GameComponentProps } from '../plugins/types';
import type { TelepathyState } from '@lancade/shared';
import { TelepathyGame } from './TelepathyGame';

function canRender(serverState: unknown, gameId: string): boolean {
  if (gameId !== 'telepathy') return false;
  return serverState !== null && typeof serverState === 'object' && 'telepathy' in (serverState as Record<string, unknown>);
}

function getPhase(serverState: unknown): string {
  if (!serverState || typeof serverState !== 'object' || !('telepathy' in (serverState as Record<string, unknown>))) {
    return 'idle';
  }
  return (serverState as TelepathyState).telepathy.phase;
}

function getHeaderCategory(serverState: unknown): string {
  if (!serverState || typeof serverState !== 'object') return '';
  const tp = (serverState as TelepathyState).telepathy;
  if (tp.phase === 'playing') {
    return `Round ${tp.round}`;
  }
  if (tp.phase === 'lost') {
    return 'Round Lost';
  }
  if (tp.phase === 'won') {
    return 'Victory!';
  }
  return '';
}

function render(props: GameComponentProps) {
  return (
    <TelepathyGame
      serverState={props.serverState as TelepathyState}
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
    id: "telepathy",
    name: "Telepathy",
    slogan: "Can you read the deck?",
    description:
      "A cooperative card game where players must place their numbered cards onto the shared pile in ascending order.",
    instructions: [
      "Each player is dealt a hand of numbered cards (1–100).",
      "In round 1, each player gets 1 card. Round 2 gives 2 cards, and so on.",
      'Players press "Place" to put their lowest card onto the shared pile.',
      "If you place a card that is higher than a card another player still holds, the round is lost immediately.",
      "On a loss, the game drops back one round and everyone gets new cards.",
      "The goal is to reach the highest possible round.",
    ],
    roundControlTitle: 'Game Control',
    joinPanelTitle: 'Join the Game',
    hideTimer: true,
    minPlayers: 2,
    gameSettings: [
      {
        key: 'startingRound',
        label: 'Starting Round',
        type: 'select',
        options: Array.from({ length: 50 }, (_, i) => ({
          label: `${i + 1} card${i === 0 ? '' : 's'}`,
          value: i + 1,
        })),
        defaultValue: 1,
      },
    ],
  },
  canRender,
  getPhase,
  getHeaderCategory,
  render,
};
