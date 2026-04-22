import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Users, Trash2, ShieldAlert, Key, MessageSquare, Database } from 'lucide-react';

export default function AdminDashboard({ token }) {
  const [stats, setStats] = useState({ total_users: 0, total_conversations: 0, total_messages: 0 });
  const [users, setUsers] = useState([]);
  const [loadingError, setLoadingError] = useState('');

  const fetchAdminData = async () => {
    try {
      const statsRes = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/admin/stats`);
      setStats(statsRes.data);

      const usersRes = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/admin/users`);
      setUsers(usersRes.data);
    } catch (err) {
      console.error(err);
      setLoadingError('Failed to load Admin telemetry. Ensure you have God Mode authorization.');
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, [token]);

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to permanently delete this user and all their conversation history?')) return;
    try {
      await axios.delete(`${import.meta.env.VITE_API_BASE_URL}/admin/users/${userId}`);
      fetchAdminData();
    } catch (err) {
      console.error(err);
      alert('Failed to delete user: ' + (err.response?.data?.detail || err.message));
    }
  };

  return (
    <div className="admin-wrapper">
      <div>
        <h2 className="admin-title">
          <ShieldAlert size={26} /> Advanced Server Telemetry
        </h2>

        {loadingError && (
          <div style={{
            padding: '0.65rem 0.875rem',
            background: 'rgba(239,68,68,0.08)',
            color: '#f87171',
            border: '1px solid rgba(239,68,68,0.2)',
            borderRadius: '10px',
            fontSize: '0.82rem',
            marginBottom: '1rem'
          }}>
            {loadingError}
          </div>
        )}

        <div className="stats-grid">
          <div className="glass-panel stat-card" style={{ background: 'rgba(59,130,246,0.08)', borderColor: 'rgba(59,130,246,0.2)' }}>
            <Users size={30} style={{ color: '#60a5fa', marginBottom: '0.5rem' }} />
            <div className="stat-number">{stats.total_users}</div>
            <div className="stat-label">Total Users</div>
          </div>
          <div className="glass-panel stat-card" style={{ background: 'rgba(16,185,129,0.08)', borderColor: 'rgba(16,185,129,0.2)' }}>
            <Database size={30} style={{ color: '#34d399', marginBottom: '0.5rem' }} />
            <div className="stat-number">{stats.total_conversations}</div>
            <div className="stat-label">Total Conversations</div>
          </div>
          <div className="glass-panel stat-card" style={{ background: 'rgba(245,158,11,0.08)', borderColor: 'rgba(245,158,11,0.2)' }}>
            <MessageSquare size={30} style={{ color: '#fbbf24', marginBottom: '0.5rem' }} />
            <div className="stat-number">{stats.total_messages}</div>
            <div className="stat-label">Total Messages</div>
          </div>
        </div>
      </div>

      <div>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem', fontWeight: 700, marginBottom: '0.875rem' }}>
          <Key size={18} /> User Moderation Console
        </h3>

        <div className="glass-panel" style={{ overflow: 'hidden' }}>
          <div className="admin-table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Global ID</th>
                  <th>Username</th>
                  <th>System Role</th>
                  <th style={{ textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td style={{ fontFamily: 'monospace', opacity: 0.6 }}>#{u.id}</td>
                    <td style={{ fontWeight: 700, color: u.is_admin ? 'var(--accent-color)' : 'inherit' }}>{u.username}</td>
                    <td>
                      {u.is_admin
                        ? <span className="role-badge-admin">Super Admin</span>
                        : <span className="role-badge-user">Standard User</span>
                      }
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {!u.is_admin && (
                        <button
                          className="clear-btn"
                          style={{ display: 'inline-flex', margin: '0 auto' }}
                          onClick={() => handleDeleteUser(u.id)}
                          title="Ban and Wipe User"
                        >
                          <Trash2 size={13} /> Delete
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {users.length === 0 && (
              <p style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-secondary)', fontStyle: 'italic', fontSize: '0.85rem' }}>
                No active users detected.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
