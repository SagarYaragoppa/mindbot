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
    try {
      if(window.confirm("Are you sure you want to permanently delete this user and all their conversation history globally?")) {
        await axios.delete(`${import.meta.env.VITE_API_BASE_URL}/admin/users/${userId}`);
        fetchAdminData(); // Refresh gracefully explicitly
      }
    } catch (err) {
      console.error(err);
      alert('Failed to delete user: ' + (err.response?.data?.detail || err.message));
    }
  };

  return (
    <div className="main-chat glass-panel flex flex-col gap-8 p-4 sm:p-8 overflow-y-auto h-full">
      
      <div>
        <h2 className="flex items-center gap-3 text-xl sm:text-2xl font-bold text-accent-color mb-6">
          <ShieldAlert size={28} /> Advanced Server Telemetry
        </h2>
        {loadingError && <p className="text-red-400 mb-4 bg-red-400/10 p-3 rounded-lg border border-red-400/20 text-sm">{loadingError}</p>}
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          <div className="glass-panel flex flex-col items-center p-6 bg-blue-500/10 border-blue-500/20">
            <Users size={32} className="text-blue-400 mb-4" />
            <span className="text-3xl font-bold mb-1">{stats.total_users}</span>
            <span className="text-sm text-text-secondary">Total Users</span>
          </div>
          <div className="glass-panel flex flex-col items-center p-6 bg-emerald-500/10 border-emerald-500/20">
            <Database size={32} className="text-emerald-400 mb-4" />
            <span className="text-3xl font-bold mb-1">{stats.total_conversations}</span>
            <span className="text-sm text-text-secondary">Total Conversations</span>
          </div>
          <div className="glass-panel flex flex-col items-center p-6 bg-amber-500/10 border-amber-500/20">
            <MessageSquare size={32} className="text-amber-400 mb-4" />
            <span className="text-3xl font-bold mb-1">{stats.total_messages}</span>
            <span className="text-sm text-text-secondary">Total Messages</span>
          </div>
        </div>
      </div>

      <div>
        <h3 className="flex items-center gap-2 text-lg font-bold mb-4">
          <Key size={20} /> User Moderation Console
        </h3>
        <div className="glass-panel overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white/5 border-b border-border-color">
                  <th className="p-4 text-xs font-bold uppercase tracking-wider text-text-secondary">Global ID</th>
                  <th className="p-4 text-xs font-bold uppercase tracking-wider text-text-secondary">Username</th>
                  <th className="p-4 text-xs font-bold uppercase tracking-wider text-text-secondary">System Role</th>
                  <th className="p-4 text-xs font-bold uppercase tracking-wider text-text-secondary text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="p-4 text-sm font-mono opacity-60">#{u.id}</td>
                    <td className={`p-4 text-sm font-bold ${u.is_admin ? 'text-accent-color' : ''}`}>{u.username}</td>
                    <td className="p-4">
                      {u.is_admin ? (
                        <span className="bg-blue-500/20 text-blue-300 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border border-blue-500/30">Super Admin</span>
                      ) : (
                        <span className="bg-white/10 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border border-white/5">Standard User</span>
                      )}
                    </td>
                    <td className="p-4 text-center">
                      {!u.is_admin && (
                        <button 
                          className="px-3 py-1.5 bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg text-xs font-medium hover:bg-red-500/20 transition-all inline-flex items-center gap-2" 
                          onClick={() => handleDeleteUser(u.id)}
                          title="Ban and Wipe User from Database"
                        >
                          <Trash2 size={14} /> Delete
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {users.length === 0 && <p className="p-10 text-center text-text-secondary italic">No active users detected.</p>}
        </div>
      </div>
    </div>
  );
}
  );
}
