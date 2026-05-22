
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import * as authService from '../../services/authService';

interface LoginProps {
  onLogin: (user: authService.User) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) return;

    setError('');
    setIsLoading(true);
    try {
      const user = await authService.login(username, password);
      if (user) {
        onLogin(user);
      } else {
        setError('Invalid credentials');
      }
    } catch (err) {
      setError('Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4 relative overflow-hidden font-sans text-white">
      {/* Background Glow Effects */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-red-600/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Glass Card */}
      <div className="w-full max-w-[380px] bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[2rem] p-8 shadow-2xl relative z-10">

        {/* Header */}
        <div className="flex flex-col items-center mb-10">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-white/10 to-transparent border border-white/5 flex items-center justify-center mb-6 shadow-xl">
            <img src="icon.png" alt="App Logo" className="w-10 h-10 object-contain drop-shadow-lg" />
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-white mb-2">Welcome back</h1>
          <p className="text-gray-400 text-sm">Sign in to your account</p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-5">
          {/* Username Input */}
          <div className="group">
            <div className="relative">
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-[#121217] text-white border border-white/5 rounded-2xl px-5 py-4 text-sm placeholder-gray-600 focus:outline-none focus:border-white/20 focus:bg-[#1a1a20] transition-all"
                placeholder="Email or Username"
                autoComplete="username"
              />
              <label htmlFor="username" className="absolute left-5 top-[-10px] bg-zinc-950 px-1 text-[10px] text-slate-500 uppercase tracking-wider hidden">Email</label>
            </div>
          </div>

          {/* Password Input with Embedded Submit Button */}
          <div className="group relative">
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-[#121217] text-white border border-white/5 rounded-2xl px-5 py-4 text-sm placeholder-gray-600 focus:outline-none focus:border-white/20 focus:bg-[#1a1a20] transition-all pr-14"
              placeholder="Password"
              autoComplete="current-password"
            />

            {/* The "Arrow" Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-gradient-to-br from-red-500 to-rose-600 rounded-full flex items-center justify-center text-white shadow-lg shadow-red-500/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed group-focus-within:shadow-red-500/40"
            >
              {isLoading ? (
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
              ) : (
                <svg className="w-5 h-5 ml-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              )}
            </button>
          </div>

          {error && <p className="text-red-500 text-xs text-center mt-2">{error}</p>}

          <div className="flex justify-end">
            <Link to="/forgot-password" className="text-xs text-slate-500 hover:text-white transition-colors">Forgot Password?</Link>
          </div>
        </form>

        {/* Divider */}
        <div className="my-8 flex items-center justify-between gap-4">
          <div className="h-[1px] bg-white/5 w-full"></div>
          <span className="text-xs text-slate-600 font-medium uppercase tracking-wider">OR</span>
          <div className="h-[1px] bg-white/5 w-full"></div>
        </div>

        {/* Social Icons (Visual Only) */}
        <div className="flex justify-center gap-4 mb-8">
          {/* Apple */}
          <button className="w-12 h-12 rounded-2xl bg-[#121217] border border-white/5 flex items-center justify-center text-white hover:bg-white/5 transition-colors">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.477 2 2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.879V14.89h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.989C18.343 21.128 22 16.991 22 12c0-5.523-4.477-10-10-10z" /></svg>
          </button>
          {/* Google */}
          <button className="w-12 h-12 rounded-2xl bg-[#121217] border border-white/5 flex items-center justify-center text-white hover:bg-white/5 transition-colors">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" /><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" /><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" /><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" /></svg>
          </button>
          {/* Twitter */}
          <button className="w-12 h-12 rounded-2xl bg-[#121217] border border-white/5 flex items-center justify-center text-white hover:bg-white/5 transition-colors">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
          </button>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-slate-500">
          Don't have an account yet? <Link to="/signup" className="text-white font-medium hover:underline ml-1">Sign Up</Link>
        </p>

      </div>
    </div>
  );
};

export default Login;
