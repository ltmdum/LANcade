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
      { heading: "No Communication", text: "Absolutely no discussion of cards or strategy during a round. This is the core of the game. Read the table, not each other." },
      { heading: "Deal", text: "Each player is dealt a hand of numbered cards (1–100)." },
      { heading: "Rounds", text: "Round 1 gives each player 1 card, round 2 gives 2 cards, and so on." },
      { heading: "Play", text: 'Press "Place" to put your lowest card onto the shared pile.' },
      { heading: "Loss", text: "If you place a card higher than another player's unplayed card, the round is lost immediately." },
      { heading: "Penalty", text: "On a loss, the game drops back one round and everyone gets new cards." },
      { heading: "Goal", text: "See how high you can go!" },
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
        defaultValue: 3,
      },
    ],
    olympics: false,
  },
  canRender,
  getPhase,
  getHeaderCategory,
  render,
};
