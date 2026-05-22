import React, { useState } from 'react';
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { ShoppingCart, User, Search, Menu, X, LogOut, Home, Heart, Cpu, Wrench } from 'lucide-react';
import * as authService from '../../services/authService';
import { useCart } from '../../contexts/CartContext';
import AuthModal from '../Auth/AuthModal';

interface StoreLayoutProps {
  user: authService.User | null;
  onLogout: () => void;
}

const StoreLayout: React.FC<StoreLayoutProps> = ({ user, onLogout }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const navigate = useNavigate();
  const location = useLocation();
  const { itemCount } = useCart();

  const handleLogout = () => {
    authService.logout();
    onLogout();
    navigate('/');
  };

  return (
    <div className="dark min-h-screen bg-[#0a0a0c] lg:bg-[#0a0a0c] text-white font-sans flex flex-col">
      {/* Navbar */}
      <header className={`sticky top-0 z-50 bg-[#0a0a0c]/80 backdrop-blur-md border-b border-white/10`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-red-600 to-red-900 rounded-xl flex items-center justify-center shadow-lg shadow-red-600/20 hidden md:flex">
                <span className="font-black text-xl tracking-tighter">GX</span>
              </div>
              <span className="font-black text-2xl tracking-tight">GameX<span className="text-red-500">Store</span></span>
            </Link>

            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center gap-8">
              <Link to="/" className="text-sm font-bold text-gray-300 hover:text-white transition-colors">Home</Link>
              <Link to="/products" className="text-sm font-bold text-gray-300 hover:text-white transition-colors">Products</Link>
              <Link to="/pc-builder" className="text-sm font-bold text-gray-300 hover:text-white transition-colors">PC Builder</Link>
              <Link to="/support" className="text-sm font-bold text-gray-300 hover:text-white transition-colors">Support</Link>
              <Link to="/repair" className="text-sm font-bold text-gray-300 hover:text-white transition-colors">Repair</Link>
            </nav>

            {/* Actions */}
            <div className="flex items-center justify-end gap-5 md:gap-6 w-auto">
              
              <Link to="/cart" className="text-gray-400 hover:text-white transition-colors relative">
                <ShoppingCart className="w-6 h-6 md:w-5 md:h-5" />
                {itemCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                    {itemCount}
                  </span>
                )}
              </Link>

              <div className="hidden sm:flex items-center gap-4 border-l border-white/10 pl-6">
                {user ? (
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                        <User className="w-4 h-4 text-gray-300" />
                      </div>
                      <span className="text-sm font-bold">{user.username}</span>
                    </div>
                    {user.role !== 'customer' && (
                      <Link to="/pos/dashboard" className="text-xs font-bold bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg transition-colors">
                         Dashboard
                      </Link>
                    )}
                    <button onClick={handleLogout} className="text-gray-400 hover:text-red-400 transition-colors">
                      <LogOut className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <button 
                    onClick={() => {
                      setAuthMode('login');
                      setIsAuthModalOpen(true);
                    }}
                    className="text-sm font-bold bg-white text-black px-5 py-2 rounded-xl hover:bg-slate-200 transition-colors"
                  >
                    Sign In
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Auth Modal */}
      {isAuthModalOpen && (
        <AuthModal 
          onClose={() => setIsAuthModalOpen(false)}
          onLogin={(user) => {
            setIsAuthModalOpen(false);
            window.location.reload();
          }}
          initialMode={authMode}
        />
      )}

      {/* Footer */}
      <footer className={`bg-zinc-950 border-t border-white/5 py-12 mt-20 ${location.pathname === '/' ? 'hidden md:block' : ''}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="col-span-1 md:col-span-2">
              <Link to="/" className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-red-600 to-red-900 rounded-lg flex items-center justify-center">
                  <span className="font-black text-sm tracking-tighter">GX</span>
                </div>
                <span className="font-black text-xl tracking-tight">GameX<span className="text-red-500">Store</span></span>
              </Link>
              <p className="text-slate-500 text-sm max-w-sm">
                The ultimate destination for premium gaming gear, custom PC builds, and expert support.
              </p>
            </div>
            <div>
              <h4 className="font-bold mb-4">Shop</h4>
              <ul className="space-y-2 text-sm text-slate-500">
                <li><Link to="/products" className="hover:text-white transition-colors">All Products</Link></li>
                <li><Link to="/pc-builder" className="hover:text-white transition-colors">Custom PCs</Link></li>
                <li><Link to="/components" className="hover:text-white transition-colors">Components</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4">Support</h4>
              <ul className="space-y-2 text-sm text-slate-500">
                <li><Link to="/support" className="hover:text-white transition-colors">Help Center</Link></li>
                <li><Link to="/rma" className="hover:text-white transition-colors">Returns & Warranty</Link></li>
                <li><Link to="/contact" className="hover:text-white transition-colors">Contact Us</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-white/5 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-slate-600">
            <p>&copy; {new Date().getFullYear()} GameX Store. All rights reserved.</p>
            <div className="flex gap-4">
              <Link to="/privacy" className="hover:text-gray-300 transition-colors">Privacy Policy</Link>
              <Link to="/terms" className="hover:text-gray-300 transition-colors">Terms of Service</Link>
            </div>
          </div>
        </div>
      </footer>

      {/* Mobile Bottom Navigation (Visible on all store pages) */}
      <div className="md:hidden fixed bottom-0 w-full bg-[#111214]/90 backdrop-blur-xl text-gray-500 border-t border-white/10 flex items-center justify-around pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))] z-50 rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.5)] text-xs font-medium">
        <Link to="/" className={`flex flex-col items-center gap-1 transition-colors ${location.pathname === '/' ? 'text-red-500' : 'hover:text-red-500'}`}>
          <Home className="w-[22px] h-[22px]" />
          <span className="text-[10px]">Home</span>
        </Link>
        <Link to="/products" className={`flex flex-col items-center gap-1 transition-colors ${location.pathname === '/products' ? 'text-red-500' : 'hover:text-red-500'}`}>
          <Search className="w-[22px] h-[22px]" />
          <span className="text-[10px]">Search</span>
        </Link>
        <Link to="/pc-builder" className={`flex flex-col items-center gap-1 transition-colors ${location.pathname === '/pc-builder' ? 'text-red-500' : 'hover:text-red-500'}`}>
          <Cpu className="w-[22px] h-[22px]" />
          <span className="text-[10px]">Builder</span>
        </Link>
        <Link to="/repair" className={`flex flex-col items-center gap-1 transition-colors ${location.pathname === '/repair' ? 'text-red-500' : 'hover:text-red-500'}`}>
          <Wrench className="w-[22px] h-[22px]" />
          <span className="text-[10px]">Repair</span>
        </Link>
        <Link to="/favorites" className={`flex flex-col items-center gap-1 transition-colors relative ${location.pathname === '/favorites' ? 'text-red-500' : 'hover:text-red-500'}`}>
          <Heart className="w-[22px] h-[22px]" />
          <span className="text-[10px]">Saved</span>
        </Link>
        <button 
         onClick={() => {
           if (!user) {
             setIsAuthModalOpen(true);
           } else {
             navigate('/profile');
           }
         }}
         className={`flex flex-col items-center gap-1 transition-colors ${location.pathname === '/profile' ? 'text-red-500' : 'hover:text-red-500'}`}
        >
          <User className="w-[22px] h-[22px]" />
          <span className="text-[10px]">Profile</span>
        </button>
      </div>

    </div>
  );
};

export default StoreLayout;
