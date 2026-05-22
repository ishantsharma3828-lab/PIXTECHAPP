import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Package, Heart, Settings, Bell, CreditCard, User as UserIcon, ChevronRight } from 'lucide-react';
import * as authService from '../../services/authService';

interface StoreProfileProps {
  user: authService.User | null;
  onLogout: () => void;
}

const StoreProfile: React.FC<StoreProfileProps> = ({ user, onLogout }) => {
  const navigate = useNavigate();

  if (!user) {
    navigate('/');
    return null;
  }

  const menuItems = [
    { icon: Package, label: 'My Orders', description: 'Track, return, or buy things again', action: () => {} },
    { icon: Heart, label: 'Wishlist', description: 'Items you have saved', action: () => navigate('/favorites') },
    { icon: CreditCard, label: 'Payment Methods', description: 'Manage your saved cards', action: () => {} },
    { icon: Bell, label: 'Notifications', description: 'Manage alerts and emails', action: () => {} },
    { icon: Settings, label: 'Account Settings', description: 'Password, email, and personal info', action: () => {} },
  ];

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 md:py-16 w-full min-h-screen">
      <h1 className="text-3xl font-black mb-8 text-white">Your Profile</h1>
      
      <div className="bg-[#111214] rounded-3xl p-6 md:p-8 flex items-center gap-6 mb-8 border border-white/5">
        <div className="w-20 h-20 bg-gradient-to-br from-red-600 to-orange-600 rounded-full flex items-center justify-center text-3xl font-black text-white shadow-lg">
          {user.username.charAt(0).toUpperCase()}
        </div>
        <div>
          <h2 className="text-2xl font-bold text-white">{user.username}</h2>
          <p className="text-gray-400 mt-1">{user.email}</p>
          <span className="inline-block mt-3 px-3 py-1 bg-white/10 text-xs font-bold text-gray-300 rounded-full capitalize">
            {user.role}
          </span>
        </div>
      </div>

      <div className="space-y-4 mb-8">
        {menuItems.map((item, index) => (
          <button 
            key={index}
            onClick={item.action}
            className="w-full bg-[#111214] border border-white/5 hover:border-white/20 hover:bg-white/5 transition-all p-4 rounded-2xl flex items-center gap-4 group"
          >
            <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-gray-400 group-hover:text-red-500 transition-colors">
              <item.icon className="w-6 h-6" />
            </div>
            <div className="flex-1 text-left">
              <h3 className="font-bold text-white">{item.label}</h3>
              <p className="text-sm text-gray-400 mt-0.5">{item.description}</p>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-600 group-hover:text-white transition-colors" />
          </button>
        ))}
      </div>

      {user.role !== 'customer' && (
        <button 
          onClick={() => navigate('/pos/dashboard')}
          className="w-full mb-4 bg-gradient-to-r from-red-600 to-red-900 border border-red-500/30 hover:border-red-500/50 transition-all p-5 rounded-2xl flex items-center justify-between group shadow-lg shadow-red-900/20"
        >
          <div className="flex-1 text-left">
            <h3 className="font-black text-lg text-white">Access POS Dashboard</h3>
            <p className="text-sm text-red-200 mt-1">Manage inventory, sales, and system settings</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center group-hover:scale-110 transition-transform">
            <ChevronRight className="w-5 h-5 text-white" />
          </div>
        </button>
      )}

      <button 
        onClick={() => {
          onLogout();
          navigate('/');
        }}
        className="w-full bg-[#111214] border border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white transition-all p-4 rounded-2xl flex items-center justify-center gap-2 font-bold"
      >
        <LogOut className="w-5 h-5" />
        Sign Out
      </button>
    </div>
  );
};

export default StoreProfile;
