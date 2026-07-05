import type { TelepathyState } from '@lancade/shared';
import type { GameProps } from '../shared/types/GameProps';
import { gameAction } from '../shared/utils/api';
import { Panel } from '../shared/components/Panel';
import './TelepathyGame.css';

interface TelepathyGameProps extends GameProps {
  serverState: TelepathyState;
}

/** Idle phase — waiting for game to start. */
function IdlePhase() {
  return (
    <Panel title="Telepathy">
      <p className="telepathy-idle">Waiting for the game to start...</p>
    </Panel>
  );
}

/** Won phase — congratulations with back-to-config button for admin. */
function WonPhase({ targetRound, isAdmin, onBack }: {
  targetRound: number;
  isAdmin: boolean;
  onBack: () => void;
}) {
  return (
    <div className="telepathy-won">
      <h2 className="telepathy-won-title">Congratulations!</h2>
      <p className="telepathy-won-message">
        All cards placed in round {targetRound} — you win!
      </p>
      {isAdmin && (
        <button type="button" className="btn btn-primary telepathy-won-button" onClick={onBack}>
          Back to Config
        </button>
      )}
    </div>
  );
}

/** Lost phase — shows who blocked whom and allows admin to continue. */
function LostPhase({ tp, players, isAdmin, onProgress }: {
  tp: TelepathyState['telepathy'];
  players: TelepathyState['players'];
  isAdmin: boolean;
  onProgress: () => void;
}) {
  const details = tp.lossDetails;
  const playerName = players.find((p) => p.id === details?.placedByPlayerId)?.name || 'Unknown';
  const blockedName = players.find((p) => p.id === details?.blockedByPlayerId)?.name || 'Unknown';

  return (
    <div className="telepathy-lost">
      <div className="telepathy-lost-flash">
        <h2 className="telepathy-lost-title">Round Lost!</h2>
        <p className="telepathy-lost-detail">
          {playerName} placed {details?.placedCard} but {blockedName} still has {details?.blockedCard}.
        </p>
        <p className="telepathy-lost-back">
          {tp.round === 1
            ? 'Round 1 — staying at 1 card per player.'
            : `Going back to ${tp.round - 1} card${tp.round - 1 !== 1 ? 's' : ''} per player.`}
        </p>
      </div>
      {isAdmin && (
        <button type="button" className="btn btn-primary telepathy-lost-button" onClick={onProgress}>
          Continue
        </button>
      )}
    </div>
  );
}

/** Round complete phase — shared pile, round info, continue button for admin. */
function RoundCompletePhase({ tp, isAdmin, onProgress }: {
  tp: TelepathyState['telepathy'];
  isAdmin: boolean;
  onProgress: () => void;
}) {
  return (
    <div className="telepathy-round-complete">
      <SharedPile lastPlaced={tp.lastPlaced} />
      <div className="telepathy-round-complete-banner">
        <h2 className="telepathy-round-complete-title">Round {tp.round} Complete!</h2>
      </div>
      {isAdmin ? (
        <button type="button" className="btn btn-primary telepathy-round-complete-button" onClick={onProgress}>
          Continue to Round {tp.round + 1}
        </button>
      ) : (
        <p className="telepathy-round-complete-waiting">Waiting for admin to continue...</p>
      )}
    </div>
  );
}

/** Active game view — shared pile, round info, player hand. */
function ActiveGame({ tp, playerId, isParticipating, onPlace }: {
  tp: TelepathyState['telepathy'];
  playerId: string;
  isParticipating: boolean;
  onPlace: () => void;
}) {
  const myHand = tp.hands?.[playerId] || [];

  let cardLabel = `${tp.round} card`;
  if (tp.round !== 1) cardLabel += 's';

  return (
    <div className="telepathy-container">
      <SharedPile lastPlaced={tp.lastPlaced} />
      <div className="telepathy-info">
        Round {tp.round} &middot; {cardLabel} each &middot; {tp.totalPlaced} of {tp.totalCardsInRound} placed
      </div>
      <PlayerHand
        cards={myHand}
        onPlace={onPlace}
        canPlace={isParticipating && myHand.length > 0}
        isParticipating={isParticipating}
      />
    </div>
  );
}

/** Main game component for Telepathy — dispatches to phase sub-components. */
export function TelepathyGame({
  serverState,
  playerId,
  accessKey,
  isAdmin,
  isParticipating,
  setShowConfig,
}: TelepathyGameProps) {
  const tp = serverState.telepathy;

  async function handlePlace() {
    await gameAction(playerId, { type: 'place' }, accessKey);
  }

  async function handleProgress() {
    await gameAction(playerId, { type: 'progress' }, accessKey);
  }

  switch (tp.phase) {
    case 'idle':
      return <IdlePhase />;
    case 'won':
      return <WonPhase targetRound={tp.targetRound} isAdmin={isAdmin} onBack={() => setShowConfig(true)} />;
    case 'lost':
      return <LostPhase tp={tp} players={serverState.players} isAdmin={isAdmin} onProgress={handleProgress} />;
    case 'round_complete':
      return <RoundCompletePhase tp={tp} isAdmin={isAdmin} onProgress={handleProgress} />;
    default:
      return <ActiveGame tp={tp} playerId={playerId} isParticipating={isParticipating} onPlace={handlePlace} />;
  }
}

interface SharedPileProps {
  lastPlaced: number | null;
}

function SharedPile({ lastPlaced }: SharedPileProps) {
  return (
    <div className="telepathy-pile">
      <span className="telepathy-pile-label">Shared Pile</span>
      <div className="telepathy-pile-card">
        {lastPlaced !== null ? lastPlaced : '—'}
      </div>
    </div>
  );
}

interface PlayerHandProps {
  cards: number[];
  onPlace: () => void;
  canPlace: boolean;
  isParticipating: boolean;
}

function PlayerHand({ cards, onPlace, canPlace, isParticipating }: PlayerHandProps) {
  if (cards.length === 0 && isParticipating) {
    return (
      <div className="telepathy-hand">
        <p className="telepathy-hand-empty">No cards to place. Waiting for others...</p>
      </div>
    );
  }

  if (!isParticipating) {
    if (cards.length === 0) {
      return null;
    }
    return null;
  }

  return (
    <div className="telepathy-hand">
      <div className="telepathy-hand-cards">
        {cards.map((card, i) => (
          <span key={i} className="telepathy-hand-card">{card}</span>
        ))}
      </div>
      <button
        type="button"
        className="btn btn-primary telepathy-hand-place"
        onClick={onPlace}
        disabled={!canPlace}
      >
        Place
      </button>
    </div>
  );
}
