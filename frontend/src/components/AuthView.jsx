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
      const endpoint = isLogin ? `${import.meta.env.VITE_API_BASE_URL}/auth/login` : `${import.meta.env.VITE_API_BASE_URL}/auth/register`;
      const res = await axios.post(`${endpoint}`, {
        username,
        password
      });

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

  return (
    <div className="flex justify-center items-center min-h-screen w-full p-4 bg-background-color">
      <div className="glass-panel w-full max-w-md mx-auto sm:w-[400px] p-6 sm:p-10 flex flex-col gap-6 shadow-2xl">
        <h2 className="text-2xl sm:text-3xl font-bold text-center tracking-tight text-white">
          {isLogin ? 'Welcome Back' : 'Create Account'}
        </h2>
        
        {error && (
          <div className="p-3 bg-red-500/10 text-red-400 border border-red-500/20 rounded-xl text-xs sm:text-sm text-center animate-in fade-in zoom-in-95">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input 
            type="text" 
            placeholder="Username" 
            value={username} 
            onChange={(e) => setUsername(e.target.value)}
            required
            className="w-full p-3.5 rounded-xl border border-white/10 bg-black/20 text-white focus:border-accent-color transition-colors outline-none text-sm sm:text-base"
          />
          <input 
            type="password" 
            placeholder="Password" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full p-3.5 rounded-xl border border-white/10 bg-black/20 text-white focus:border-accent-color transition-colors outline-none text-sm sm:text-base"
          />
          <button 
            type="submit" 
            className="btn w-full sm:w-auto mx-auto px-10 py-3.5 flex justify-center items-center gap-2 font-bold shadow-lg shadow-accent-color/20 mt-2 text-sm sm:text-base" 
            disabled={loading}
          >
            {loading ? 'Processing...' : isLogin ? <><LogIn size={20} /> Login</> : <><UserPlus size={20} /> Register</>}
          </button>
        </form>

        <p 
          className="text-center text-sm text-text-secondary cursor-pointer hover:text-white transition-colors" 
          onClick={() => { setIsLogin(!isLogin); setError(''); }}
        >
          {isLogin ? "Don't have an account? Register" : "Already have an account? Login"}
        </p>
      </div>
    </div>
  );
}
