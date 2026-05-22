import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Package, Heart } from 'lucide-react';

const Favorites: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="w-full bg-[#0a0a0c] min-h-[100dvh] flex flex-col items-center">
      <div className="w-full px-4 py-4 flex items-center mb-8 bg-[#0a0a0c]/80 backdrop-blur-md sticky top-0 z-20">
         <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-400 hover:text-white font-medium text-sm">
           <ArrowLeft className="w-5 h-5" />
           Back
         </button>
      </div>

      <div className="w-full px-6 flex flex-col items-center justify-center flex-1 pb-32">
        <div className="w-24 h-24 bg-[#111214] border border-white/5 rounded-full flex items-center justify-center mb-6 shadow-inner relative">
          <Heart className="w-10 h-10 text-red-500 fill-red-500/20" />
          <div className="absolute top-0 right-0 w-6 h-6 bg-red-500 rounded-full border-4 border-[#0a0a0c] flex items-center justify-center">
            <span className="text-white text-[10px] font-bold">0</span>
          </div>
        </div>
        
        <h1 className="text-2xl font-black text-white text-center mb-2 tracking-tight">Saved Items</h1>
        <p className="text-gray-400 text-sm text-center font-medium max-w-[260px] leading-relaxed mb-10">
          You haven't saved any items yet. Tap the heart icon on a product to save it for later.
        </p>

        <button 
           onClick={() => navigate('/products')}
           className="w-full max-w-[280px] bg-white text-black font-bold py-4 rounded-full active:bg-gray-200 transition-colors shadow-lg"
        >
           Start Browsing
        </button>
      </div>
    </div>
  );
};

export default Favorites;
