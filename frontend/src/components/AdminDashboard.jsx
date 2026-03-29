import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Users, Trash2, ShieldAlert, Key, MessageSquare, Database } from 'lucide-react';

export default function AdminDashboard({ token }) {
  const [stats, setStats] = useState({ total_users: 0, total_conversations: 0, total_messages: 0 });
  const [users, setUsers] = useState([]);
  const [loadingError, setLoadingError] = useState('');

  const fetchAdminData = async () => {
    try {
      const statsRes = await axios.get('http://localhost:8000/admin/stats');
      setStats(statsRes.data);
      
      const usersRes = await axios.get('http://localhost:8000/admin/users');
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
    try {
      if(window.confirm("Are you sure you want to permanently delete this user and all their conversation history globally?")) {
        await axios.delete(`http://localhost:8000/admin/users/${userId}`);
        fetchAdminData(); // Refresh gracefully explicitly
      }
    } catch (err) {
      console.error(err);
      alert('Failed to delete user: ' + (err.response?.data?.detail || err.message));
    }
  };

  return (
    <div className="main-chat glass-panel" style={{ padding: '2rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      <div>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: 'var(--accent-color)', marginBottom: '1rem' }}>
          <ShieldAlert size={28} /> Advanced Server Telemetry
        </h2>
        {loadingError && <p style={{ color: '#ef4444' }}>{loadingError}</p>}
        
        <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
          <div className="glass-panel" style={{ flex: 1, minWidth: '200px', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '1.5rem', background: 'rgba(5b, 130, 246, 0.1)' }}>
            <Users size={32} style={{ marginBottom: '1rem', color: '#60a5fa' }} />
            <span style={{ fontSize: '2rem', fontWeight: 'bold' }}>{stats.total_users}</span>
            <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Total Users</span>
          </div>
          <div className="glass-panel" style={{ flex: 1, minWidth: '200px', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '1.5rem', background: 'rgba(16, 185, 129, 0.1)' }}>
            <Database size={32} style={{ marginBottom: '1rem', color: '#34d399' }} />
            <span style={{ fontSize: '2rem', fontWeight: 'bold' }}>{stats.total_conversations}</span>
            <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Total Conversations</span>
          </div>
          <div className="glass-panel" style={{ flex: 1, minWidth: '200px', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '1.5rem', background: 'rgba(245, 158, 11, 0.1)' }}>
            <MessageSquare size={32} style={{ marginBottom: '1rem', color: '#fbbf24' }} />
            <span style={{ fontSize: '2rem', fontWeight: 'bold' }}>{stats.total_messages}</span>
            <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Total Messages</span>
          </div>
        </div>
      </div>

      <div>
        <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Key size={20} /> User Moderation Console
        </h3>
        <div className="glass-panel" style={{ padding: '0', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.05)' }}>
                <th style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)' }}>Global ID</th>
                <th style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)' }}>Username</th>
                <th style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)' }}>System Role</th>
                <th style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '1rem' }}>{u.id}</td>
                  <td style={{ padding: '1rem', fontWeight: 'bold', color: u.is_admin ? 'var(--accent-color)' : 'inherit' }}>{u.username}</td>
                  <td style={{ padding: '1rem' }}>
                    {u.is_admin ? (
                      <span style={{ background: 'rgba(59, 130, 246, 0.2)', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', color: '#93c5fd' }}>Super Admin</span>
                    ) : (
                      <span style={{ background: 'rgba(255,255,255,0.1)', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem' }}>Standard User</span>
                    )}
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'center' }}>
                    {!u.is_admin && (
                      <button 
                        className="btn" 
                        onClick={() => handleDeleteUser(u.id)}
                        style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.3)', padding: '0.5rem' }}
                        title="Ban and Wipe User from Database"
                      >
                        <Trash2 size={16} /> Delete
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {users.length === 0 && <p style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-secondary)' }}>No active users detected.</p>}
        </div>
      </div>
    </div>
  );
}
