import React, { useId, useState } from 'react';
import { Panel } from './Panel';
import { joinPlayer } from '../utils/api';
import './JoinPanel.css';

interface JoinPanelProps {
  playerName: string;
  setPlayerName: (name: string) => void;
  playerPassword: string;
  setPlayerPassword: (pass: string) => void;
  playerId: string;
  setPlayerId: (id: string) => void;
  title?: string;
}

/**
 * Player join form panel.
 * @param props Join panel props.
 * @returns Join panel element.
 */
export function JoinPanel({
  playerName,
  setPlayerName,
  playerPassword,
  setPlayerPassword,
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
    if (!playerPassword.trim()) {
      setJoinError('Enter the player password.');
      return;
    }
    
    try {
      const { response, data } = await joinPlayer(playerName, playerId || null, playerPassword);
      if (response.status === 401) {
        setJoinError('Incorrect player password.');
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
      localStorage.setItem('playerPassword', playerPassword.trim());
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
          />
        </div>
        <div className="join-panel-field">
          <label className="join-panel-label" htmlFor={`${baseId}-player-password`}>
            Player Password
          </label>
          <input
            id={`${baseId}-player-password`}
            type="text"
            className="input"
            value={playerPassword}
            onChange={(e) => setPlayerPassword(e.target.value)}
            placeholder="Password from server console"
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
