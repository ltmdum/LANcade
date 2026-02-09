import React, { useState } from 'react';
import { Panel } from './Panel';
import { claimAdmin } from '../utils/api';
import './AdminPanel.css';

interface AdminPanelProps {
  adminSessionId: string;
  setAdminSessionId: (id: string) => void;
}

/**
 * Admin login panel for claiming an admin session.
 * @param props Admin panel props.
 * @returns Admin panel element.
 */
export function AdminPanel({ adminSessionId, setAdminSessionId }: AdminPanelProps) {
  const [adminPassword, setAdminPassword] = useState('');
  const [adminStatus, setAdminStatus] = useState('Enter password to claim admin.');

  /**
   * Handle admin claim form submission.
   * @param e Form submit event.
   */
  async function handleClaimAdmin(e: React.FormEvent) {
    e.preventDefault();
    setAdminStatus('');
    if (!adminPassword.trim()) {
      setAdminStatus('Enter the admin password.');
      return;
    }
    try {
      const { response, data } = await claimAdmin(adminPassword);
      if (response.status === 409) {
        setAdminStatus('Admin already claimed.');
        return;
      }
      if (!response.ok) {
        setAdminStatus('Admin password incorrect.');
        return;
      }
      localStorage.setItem('adminSessionId', data.sessionId);
      setAdminSessionId(data.sessionId);
      setAdminStatus('Admin claimed.');
      setAdminPassword('');
    } catch {
      setAdminStatus('Unable to claim admin.');
    }
  }

  return (
    <Panel title="Admin Access">
      <form onSubmit={handleClaimAdmin} className="admin-panel-form">
        <input
          type="text"
          className="admin-panel-input"
          value={adminPassword}
          onChange={(e) => setAdminPassword(e.target.value)}
          placeholder="Admin password"
        />
        <button type="submit" className="btn btn-primary">
          Claim Admin
        </button>
      </form>
      <p className="admin-panel-status">{adminStatus}</p>
      {adminSessionId && (
        <p className="admin-panel-active">✓ Admin session active</p>
      )}
    </Panel>
  );
}
