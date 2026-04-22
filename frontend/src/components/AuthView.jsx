import React, { useState } from 'react';
import axios from 'axios';
import { LogIn, UserPlus } from 'lucide-react';

export default function AuthView({ setToken }) {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const endpoint = isLogin
        ? `${import.meta.env.VITE_API_BASE_URL}/auth/login`
        : `${import.meta.env.VITE_API_BASE_URL}/auth/register`;

      const res = await axios.post(endpoint, { username, password });

      if (isLogin) {
        setToken(res.data.access_token);
      } else {
        setIsLogin(true);
        setError('Registered successfully! You can now log in.');
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const isSuccess = !isLogin && error.startsWith('Registered');

  return (
    <div className="auth-wrapper">
      <div className="glass-panel auth-card">

        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.25rem' }}>🤖</div>
          <h2 className="auth-title">{isLogin ? 'Welcome Back' : 'Create Account'}</h2>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '0.3rem' }}>MindBot — AI Assistant</p>
        </div>

        {error && (
          <div className={isSuccess ? 'auth-success' : 'auth-error'}>
            {error}
          </div>
        )}

        <form className="auth-form" onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            autoComplete="username"
            id="auth-username"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete={isLogin ? 'current-password' : 'new-password'}
            id="auth-password"
          />
          <button
            type="submit"
            className="btn auth-submit-btn"
            disabled={loading}
            id="auth-submit"
          >
            {loading
              ? 'Processing...'
              : isLogin
                ? <><LogIn size={18} /> Login</>
                : <><UserPlus size={18} /> Register</>
            }
          </button>
        </form>

        <p
          className="auth-switch"
          onClick={() => { setIsLogin(!isLogin); setError(''); }}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && setIsLogin(!isLogin)}
        >
          {isLogin ? "Don't have an account? Register" : 'Already have an account? Login'}
        </p>
      </div>
    </div>
  );
}
