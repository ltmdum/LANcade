import { Panel } from '../../shared/components/Panel';
import './WinnerDisplay.css';

interface PodiumEntry {
  name: string;
  medal: '🥇' | '🥈' | '🥉';
}

interface WinnerDisplayProps {
  gold: PodiumEntry;
  silver?: PodiumEntry;
  bronze?: PodiumEntry;
}

/**
 * Display the podium for Last Word Standing.
 * @param props Winner display props.
 * @returns Winner display element.
 */
export function WinnerDisplay({ gold, silver, bronze }: WinnerDisplayProps) {
  return (
    <Panel title="Podium">
      <div className="lws-podium">
        <div className="lws-podium__entry lws-podium__entry--gold">
          <span className="lws-podium__medal">{gold.medal}</span>
          <span className="lws-podium__name">{gold.name}</span>
        </div>
        {silver && (
          <div className="lws-podium__entry lws-podium__entry--silver">
            <span className="lws-podium__medal">{silver.medal}</span>
            <span className="lws-podium__name">{silver.name}</span>
          </div>
        )}
        {bronze && (
          <div className="lws-podium__entry lws-podium__entry--bronze">
            <span className="lws-podium__medal">{bronze.medal}</span>
            <span className="lws-podium__name">{bronze.name}</span>
          </div>
        )}
      </div>
    </Panel>
  );
}
