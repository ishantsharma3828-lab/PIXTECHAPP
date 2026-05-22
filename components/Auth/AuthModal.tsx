import React, { useState } from 'react';
import { X } from 'lucide-react';
import * as authService from '../../services/authService';
import { useNavigate } from 'react-router-dom';

interface AuthModalProps {
  onClose: () => void;
  onLogin: (user: authService.User) => void;
  initialMode?: 'login' | 'signup';
}

const AuthModal: React.FC<AuthModalProps> = ({ onClose, onLogin, initialMode = 'login' }) => {
  const [mode, setMode] = useState<'login' | 'signup'>(initialMode);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (mode === 'login') {
        if (!username || !password) return;
        const user = await authService.login(username, password);
        if (user) {
          onLogin(user);
          onClose();
          if (user.role !== 'customer') {
            navigate('/pos/dashboard');
          }
        } else {
          setError('Invalid credentials');
        }
      } else {
        if (!username || !password || !email || !fullName) return;
        const user = await authService.register(
          username,
          password,
          email,
          fullName
        );
        if (user) {
          onLogin(user);
          onClose();
        } else {
          setError('Registration failed');
        }
      }
    } catch (err) {
      setError(mode === 'login' ? 'Login failed' : 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="w-full max-w-[380px] bg-[#111214] border border-white/10 rounded-[2rem] p-8 shadow-2xl relative z-10 animate-fade-in">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-red-600/20 to-transparent border border-red-500/20 flex items-center justify-center mb-6 shadow-xl">
            <span className="font-black text-2xl tracking-tighter text-red-500">GX</span>
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-white mb-2">
            {mode === 'login' ? 'Welcome back' : 'Create account'}
          </h1>
          <p className="text-sm text-gray-400 font-medium">
            {mode === 'login' ? 'Sign in to your account' : 'Join the GameXStore community'}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-xl p-3 text-center">
              {error}
            </div>
          )}

          {mode === 'signup' && (
            <>
              <div className="relative group">
                <input 
                  type="text" 
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Full Name"
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-5 py-4 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-red-500/50 focus:bg-white/10 transition-all"
                />
              </div>
              <div className="relative group">
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email Address"
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-5 py-4 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-red-500/50 focus:bg-white/10 transition-all"
                />
              </div>
            </>
          )}

          <div className="relative group">
            <input 
              type="text" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username"
              required
              className="w-full bg-white/5 border border-white/10 rounded-xl px-5 py-4 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-red-500/50 focus:bg-white/10 transition-all"
            />
          </div>

          <div className="relative group">
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              required
              className="w-full bg-white/5 border border-white/10 rounded-xl px-5 py-4 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-red-500/50 focus:bg-white/10 transition-all pr-12"
            />
            <button 
              type="submit"
              disabled={isLoading}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-red-500 hover:bg-red-400 text-white rounded-lg flex items-center justify-center transition-colors disabled:opacity-50"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              )}
            </button>
          </div>

          {mode === 'login' && (
            <div className="flex justify-end mt-2">
              <button type="button" className="text-xs font-medium text-gray-400 hover:text-white transition-colors">
                Forgot Password?
              </button>
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="mt-8 flex flex-col items-center gap-4">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
            <span>{mode === 'login' ? "Don't have an account yet?" : "Already have an account?"}</span>
            <button 
              onClick={() => {
                setMode(mode === 'login' ? 'signup' : 'login');
                setError('');
              }}
              className="text-white hover:text-red-400 transition-colors"
            >
              {mode === 'login' ? 'Sign Up' : 'Sign In'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
