import '../undercovershared.css';
import { Panel } from '../../shared/components/Panel';
import { submitWord } from '../../shared/utils/api';

interface DiscussionPanelProps {
  playerId: string;
  accessKey: string;
  isReady: boolean;
  readyCount: number;
  totalCount: number;
}

export function DiscussionPanel({
  playerId,
  accessKey,
  isReady,
  readyCount,
  totalCount,
}: DiscussionPanelProps) {
  async function handleReady() {
    await submitWord(playerId, 'READY_FOR_VOTE', accessKey);
  }

  return (
    <Panel title="Discussion">
      <p className="undercover-turn-info undercover-turn-info--active">
        Discuss who you think the Undercover Agent is!
      </p>
      {isReady ? (
        <p className="undercover-turn-info">
          Waiting for all players to be ready ({readyCount}/{totalCount})...
        </p>
      ) : (
        <div className="undercover-vote-options">
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleReady}
          >
            Ready to Vote
          </button>
        </div>
      )}
    </Panel>
  );
}
