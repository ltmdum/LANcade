import React, { useId, useState } from 'react';
import { Panel } from './Panel';
import { joinPlayer } from '../utils/api';
import './JoinPanel.css';

interface JoinPanelProps {
  accessKey: string;
  playerName: string;
  setPlayerName: (name: string) => void;
  playerId: string;
  setPlayerId: (id: string) => void;
  title?: string;
}

/**
 * Player join form panel. Players authenticate via the access key embedded
 * in their invite URL, so only a display name is collected here.
 * @param props Join panel props.
 * @returns Join panel element.
 */
export function JoinPanel({
  accessKey,
  playerName,
  setPlayerName,
  playerId,
  setPlayerId,
  title = 'Join the Game',
}: JoinPanelProps) {
  const [joinError, setJoinError] = useState('');
  const [joinStatus, setJoinStatus] = useState('');
  const baseId = useId();

  /**
   * Handle join form submission.
   * @param e Form submit event.
   */
  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    setJoinError('');
    setJoinStatus('');

    if (!playerName.trim()) {
      setJoinError('Enter a name to join.');
      return;
    }
    if (!accessKey) {
      setJoinError('Open this app from a valid invite link.');
      return;
    }

    try {
      const { response, data } = await joinPlayer(playerName, playerId || null, accessKey);
      if (response.status === 401) {
        setJoinError('Invalid invite link.');
        return;
      }
      if (response.status === 409) {
        setJoinError('That name is taken. Pick another.');
        return;
      }
      if (!response.ok) {
        setJoinError('Could not join as player.');
        return;
      }
      setPlayerId(data.playerId);
      setPlayerName(data.name);
      localStorage.setItem('playerId', data.playerId);
      localStorage.setItem('playerName', data.name);
      setJoinStatus('Player profile saved.');
    } catch {
      setJoinError('Could not join as player.');
    }
  }

  return (
    <Panel title={title}>
      <form onSubmit={handleJoin} className="join-panel-form">
        <div className="join-panel-field">
          <label className="join-panel-label" htmlFor={`${baseId}-player-name`}>
            Your Name
          </label>
          <input
            id={`${baseId}-player-name`}
            type="text"
            className="input"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder="e.g. Sam"
            maxLength={30}
          />
        </div>
        {joinError && <p className="join-panel-error">{joinError}</p>}
        <button type="submit" className="join-panel-submit">
          Join Game
        </button>
        {joinStatus && <p className="join-panel-status">{joinStatus}</p>}
      </form>
    </Panel>
  );
}
