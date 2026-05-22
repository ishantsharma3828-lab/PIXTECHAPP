import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { getProducts } from '../../services/inventoryService';
import { Product } from '../../constants/inventoryFields';
import { ChevronRight, Star, ShoppingBag, Zap, Check, Search as SearchIcon, Heart } from 'lucide-react';
import { useCart } from '../../contexts/CartContext';

const StoreFront: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [addedItems, setAddedItems] = useState<Record<string, boolean>>({});
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});
  const [activeCategory, setActiveCategory] = useState('All');
  const [currentBanner, setCurrentBanner] = useState(0);
  const { addToCart, itemCount } = useCart();
  const navigate = useNavigate();

  useEffect(() => {
    getProducts().then((data) => {
      setProducts(data);
      setLoading(false);
    });
  }, []);

  const handleAddToCart = (e: React.MouseEvent, product: Product) => {
    e.preventDefault();
    e.stopPropagation();
    
    addToCart(product);
    setAddedItems(prev => ({ ...prev, [product.id]: true }));
    setTimeout(() => {
      setAddedItems(prev => ({ ...prev, [product.id]: false }));
    }, 2000);
  };

  const toggleFavorite = (e: React.MouseEvent, productId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setFavorites(prev => ({ ...prev, [productId]: !prev[productId] }));
  };

  const mobileBanners = [
    {
      id: 1,
      title: "Clearance Sales",
      tag: "Up to 50%",
      image: "https://images.unsplash.com/photo-1605236453806-6ff36851218e?q=80&w=400&auto=format&fit=crop",
      bg: "bg-red-600",
      shadow: "shadow-red-900/20"
    },
    {
      id: 2,
      title: "Custom Rigs",
      tag: "Build Yours",
      image: "https://images.unsplash.com/photo-1587202372775-e229f172b9d7?q=80&w=400&auto=format&fit=crop",
      bg: "bg-indigo-600",
      shadow: "shadow-indigo-900/20"
    },
    {
      id: 3,
      title: "Pro Gear",
      tag: "New Arrivals",
      image: "https://images.unsplash.com/photo-1612287230202-1ff1d85d1bdf?q=80&w=400&auto=format&fit=crop",
      bg: "bg-emerald-600",
      shadow: "shadow-emerald-900/20"
    }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
       setCurrentBanner(prev => (prev + 1) % mobileBanners.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [mobileBanners.length]);

  const featuredBanners = [
    {
      title: "Custom PCs",
      subtitle: "Built for Performance",
      image: "https://images.unsplash.com/photo-1587202372775-e229f172b9d7?q=80&w=600&auto=format&fit=crop",
      path: "/pc-builder",
      color: "from-purple-600 to-blue-600"
    },
    {
      title: "Peripherals",
      subtitle: "Pro Gaming Gear",
      image: "https://images.unsplash.com/photo-1612287230202-1ff1d85d1bdf?q=80&w=600&auto=format&fit=crop",
      path: "/products?category=peripherals",
      color: "from-red-600 to-orange-600"
    },
    {
      title: "Components",
      subtitle: "Upgrade Your Rig",
      image: "https://images.unsplash.com/photo-1591488320449-011701bb6704?q=80&w=600&auto=format&fit=crop",
      path: "/products?category=components",
      color: "from-emerald-600 to-teal-600"
    },
    {
      title: "Support",
      subtitle: "Expert Assistance",
      image: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=600&auto=format&fit=crop",
      path: "/support",
      color: "from-gray-600 to-slate-800"
    }
  ];

  return (
    <>
      {/* Mobile Concept View (Visible only on mobile, themed correctly) */}
      <div className="md:hidden w-full pb-24 pt-2 overflow-x-hidden">
        
        {/* Banner with multiple auto-scrolling options */}
        <div className="px-6 mb-8 mt-4 w-full overflow-hidden">
          <div 
            className="flex transition-transform duration-500 ease-in-out" 
            style={{ transform: `translateX(-${currentBanner * 100}%)` }}
          >
            {mobileBanners.map((banner) => (
              <div key={banner.id} className="w-full flex-shrink-0 px-2 box-border">
                <div className={`${banner.bg} rounded-3xl p-6 relative h-48 flex flex-col justify-center shadow-lg ${banner.shadow}`}>
                  <div className="relative z-10 w-3/5">
                    <h2 className="text-white text-[28px] font-bold leading-tight mb-3 tracking-tight">
                      {banner.title.split(' ').map((word, i) => <React.Fragment key={i}>{word}<br/></React.Fragment>)}
                    </h2>
                    <div className="inline-flex items-center gap-1 bg-black/30 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-inner shadow-black/20">
                      <span className="text-yellow-400 font-black">%</span> {banner.tag}
                    </div>
                  </div>
                  
                  <div className="absolute -top-4 -right-2 w-40 h-56 bg-[#1c1c1e] rounded-[32px] transform rotate-6 border-[6px] border-[#0a0a0c] shadow-2xl flex items-center justify-center overflow-hidden">
                    <img 
                      src={banner.image} 
                      alt={banner.title} 
                      className="w-4/5 h-4/5 object-cover rounded-2xl"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
          {/* Dots */}
          <div className="flex justify-center gap-2 mt-4">
            {mobileBanners.map((_, i) => (
              <div key={i} className={`w-1.5 h-1.5 rounded-full transition-colors ${i === currentBanner ? 'bg-red-500' : 'bg-white/20'}`} />
            ))}
          </div>
        </div>

        {/* Categories */}
        <div className="mb-6">
          <div className="px-6 flex justify-between items-end mb-4">
            <h3 className="text-xl font-bold text-white tracking-tight">Categories</h3>
            <Link to="/products" className="text-red-500 text-sm font-bold hover:text-red-400">See all</Link>
          </div>
          <div className="flex overflow-x-auto gap-3 px-6 pb-2 scrollbar-hide">
            {['All', 'PC Builder', ...Array.from(new Set(products.map(p => p.category).filter(Boolean)))].map(cat => (
              <button 
                key={cat}
                onClick={() => {
                  if (cat === 'PC Builder') {
                     navigate('/pc-builder');
                  } else {
                     setActiveCategory(cat);
                  }
                }}
                className={`px-5 py-2.5 rounded-xl font-bold shrink-0 transition-all ${
                  activeCategory === cat 
                    ? 'bg-red-600 text-white shadow-md shadow-red-500/20' 
                    : 'bg-transparent border border-white/10 text-gray-400 hover:border-white/20'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Products Display */}
        <div className="pb-12">
          {loading ? (
             <div className="px-6 grid grid-cols-2 gap-4">
               {[1, 2, 3, 4].map(i => <div key={i} className="h-56 bg-[#111214] animate-pulse rounded-[24px] border border-white/5"></div>)}
             </div>
          ) : activeCategory === 'All' ? (
             <div className="flex flex-col gap-10">
                {/* Horizontal scrolling rows for each category */}
                {Array.from(new Set(products.map(p => p.category).filter(Boolean))).map(cat => {
                   const catProducts = products.filter(p => p.category === cat);
                   if (catProducts.length === 0) return null;
                   return (
                     <div key={cat} className="w-full">
                       <div className="px-6 flex justify-between items-end mb-4">
                         <h4 className="text-lg font-bold text-white tracking-tight capitalize">{cat}</h4>
                         <Link to={`/products?category=${encodeURIComponent(cat)}`} className="text-gray-500 text-xs font-bold hover:text-white">View All</Link>
                       </div>
                       <div className="flex overflow-x-auto gap-4 px-6 pb-4 scrollbar-hide snap-x">
                         {catProducts.slice(0, 5).map(product => (
                           <Link to={`/products/${product.id}`} key={product.id} className="snap-start relative w-[160px] bg-[#111214] rounded-3xl p-3 flex flex-col items-center border border-white/5 hover:border-white/10 transition-colors shrink-0 object-cover">
                              <div className="w-full aspect-square mb-3 bg-white rounded-2xl overflow-hidden flex items-center justify-center p-2 relative shadow-inner">
                                 <button 
                                    onClick={(e) => toggleFavorite(e, product.id)}
                                    className="absolute top-2 right-2 w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center shadow-sm z-10"
                                 >
                                    <Heart className={`w-3.5 h-3.5 ${favorites[product.id] ? 'fill-red-500 text-red-500' : 'text-gray-400'}`} />
                                 </button>
                                 {product.images?.[0] ? (
                                   <img src={product.images[0].url} alt={product.name} className="w-full h-full object-contain" />
                                 ) : (
                                   <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest text-center">No Image</div>
                                 )}
                              </div>
                              <div className="w-full flex-1 flex flex-col pt-1">
                                <h4 className="text-[11px] font-bold text-blue-300 uppercase tracking-wider truncate mb-1">{product.name}</h4>
                                <div className="mt-auto flex justify-between items-end">
                                  <p className="text-sm font-black text-white">${product.price1.toFixed(2)}</p>
                                  <div className="flex items-center gap-0.5 opacity-70">
                                    <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                                    <span className="text-[10px] font-bold text-white">4.9</span>
                                  </div>
                                </div>
                              </div>
                           </Link>
                         ))}
                       </div>
                     </div>
                   );
                })}

                {/* PC Builder Promo block inside the scroll */}
                <div className="px-6 w-full snap-center mt-2 mb-6">
                   <Link to="/pc-builder" className="block w-full bg-gradient-to-r from-purple-900 via-indigo-900 to-blue-900 rounded-[32px] p-6 border border-white/10 relative overflow-hidden shadow-2xl">
                      <div className="relative z-10 w-2/3">
                         <h3 className="text-2xl font-black text-white mb-2 tracking-tight">PC Builder</h3>
                         <p className="text-xs text-purple-200 mb-6 font-medium leading-relaxed">Customize every component for ultimate performance.</p>
                         <span className="inline-block bg-white text-black text-xs font-bold px-4 py-2 rounded-full shadow-lg">Start Building</span>
                      </div>
                      <Zap className="absolute -right-6 bottom-0 w-40 h-40 text-white/5 transform -rotate-12" />
                   </Link>
                </div>
             </div>
          ) : (
             <div className="px-6 grid grid-cols-2 gap-4">
                {products.filter(p => p.category === activeCategory).map(product => (
                  <Link to={`/products/${product.id}`} key={product.id} className="relative aspect-[3/4] bg-[#111214] rounded-[24px] p-3 flex flex-col items-center border border-white/5 hover:border-white/10 transition-colors">
                     <div className="w-full mb-3 aspect-square bg-white rounded-2xl overflow-hidden flex items-center justify-center p-2 relative">
                        <button 
                           onClick={(e) => toggleFavorite(e, product.id)}
                           className="absolute top-2 right-2 w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center shadow-sm z-10"
                        >
                           <Heart className={`w-3.5 h-3.5 ${favorites[product.id] ? 'fill-red-500 text-red-500' : 'text-gray-400'}`} />
                        </button>
                        {product.images?.[0] ? (
                          <img src={product.images[0].url} alt={product.name} className="w-full h-full object-contain" />
                        ) : (
                          <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest text-center">No Image</div>
                        )}
                     </div>
                     <div className="w-full flex-1 flex flex-col pt-1">
                       <h4 className="text-[11px] font-bold text-blue-300 uppercase tracking-wider truncate mb-1">{product.name}</h4>
                       <div className="mt-auto flex justify-between items-end">
                         <p className="text-[15px] font-black text-white">${product.price1.toFixed(2)}</p>
                         <div className="flex items-center gap-0.5 opacity-70">
                           <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                           <span className="text-[10px] font-bold text-white">4.9</span>
                         </div>
                       </div>
                     </div>
                  </Link>
                ))}
             </div>
          )}
        </div>
      </div>

      {/* Desktop view (Original Design) */}
      <div className="hidden md:flex flex-col gap-16">

      {/* Hero Section */}
      <section className="relative w-full h-[600px] md:h-[700px] overflow-hidden">
        <img 
          src="https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=2070&auto=format&fit=crop" 
          alt="Hero" 
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0c] via-[#0a0a0c]/80 to-transparent flex flex-col justify-center px-4 sm:px-8 md:px-16 lg:px-24">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="max-w-2xl"
          >
            <span className="inline-flex items-center gap-2 bg-red-600/20 text-red-500 text-xs font-bold px-4 py-2 rounded-full mb-6 uppercase tracking-widest border border-red-500/30">
              <Zap className="w-4 h-4" /> New Arrivals
            </span>
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-black mb-6 tracking-tighter leading-none">
              NEXT GEN <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-orange-500">GAMING</span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-400 font-medium mb-10 max-w-xl leading-relaxed">
              Experience the ultimate performance with our custom builds and premium gear.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link to="/pc-builder" className="bg-white text-black px-8 py-4 rounded-xl font-bold hover:bg-slate-200 transition-colors shadow-xl shadow-white/10 text-center flex items-center justify-center gap-2">
                Start Building <ChevronRight className="w-5 h-5" />
              </Link>
              <Link to="/products" className="bg-white/10 backdrop-blur-md text-white border border-white/20 px-8 py-4 rounded-xl font-bold hover:bg-white/20 transition-colors text-center">
                Shop All Gear
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Categories */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-3xl font-black tracking-tight flex items-center gap-3">
            <span className="w-2 h-8 bg-red-500 rounded-full"></span>
            Explore Categories
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {featuredBanners.map((banner, idx) => (
            <Link 
              key={idx} 
              to={banner.path}
              className="relative h-64 rounded-3xl overflow-hidden group shadow-2xl ring-1 ring-white/10 block"
            >
              <img src={banner.image} alt={banner.title} className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-50 group-hover:opacity-30" />
              <div className={`absolute inset-0 bg-gradient-to-t ${banner.color} opacity-30 group-hover:opacity-70 transition-opacity mix-blend-overlay`}></div>
              <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0c] via-[#0a0a0c]/40 to-transparent p-8 flex flex-col justify-end">
                <h3 className="text-3xl font-black uppercase italic tracking-wider mb-1">{banner.title}</h3>
                <p className="text-sm text-gray-300 font-medium translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">{banner.subtitle}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured Products */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-3xl font-black tracking-tight flex items-center gap-3">
            <span className="w-2 h-8 bg-blue-500 rounded-full"></span>
            Featured Gear
          </h2>
          <Link to="/products" className="text-sm font-bold text-gray-400 hover:text-white transition-colors flex items-center gap-1">
            View All <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-96 bg-white/5 animate-pulse rounded-3xl border border-white/10"></div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {products.slice(0, 8).map((product) => (
              <div key={product.id} className="bg-[#111214] rounded-3xl p-5 border border-white/5 hover:border-white/20 transition-all hover:-translate-y-2 group flex flex-col h-full shadow-xl">
                <Link to={`/products/${product.id}`} className="block relative h-48 bg-black/50 rounded-2xl mb-5 overflow-hidden border border-white/5 shrink-0">
                  {product.images && product.images.length > 0 ? (
                    <img src={product.images[0].url} alt={product.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-slate-700 text-xs uppercase font-bold tracking-widest">No Image</div>
                  )}
                  {/* Badge */}
                  {product.quantity <= 5 && product.quantity > 0 && (
                    <div className="absolute top-3 left-3 bg-orange-500 text-white text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wider">
                      Low Stock
                    </div>
                  )}
                </Link>
                
                <div className="flex-1 flex flex-col">
                  <div className="flex items-center gap-1 mb-2">
                    <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                    <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                    <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                    <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                    <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                    <span className="text-[10px] text-slate-500 ml-1">(24)</span>
                  </div>
                  
                  <Link to={`/products/${product.id}`}>
                    <h3 className="font-bold text-lg mb-1 group-hover:text-red-400 transition-colors line-clamp-2 leading-tight">{product.name}</h3>
                  </Link>
                  <p className="text-slate-500 text-xs mb-4 uppercase tracking-wider">{product.category || 'Gear'}</p>
                  
                  <div className="mt-auto pt-4 border-t border-white/5 flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Price</span>
                      <span className="font-black text-xl text-white">${product.price1.toFixed(2)}</span>
                    </div>
                    <button 
                      onClick={(e) => handleAddToCart(e, product)}
                      className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all border ${
                        addedItems[product.id]
                          ? 'bg-green-500 text-white border-transparent'
                          : 'bg-white/10 hover:bg-white text-white hover:text-black border-white/20'
                      }`}
                    >
                      {addedItems[product.id] ? <Check className="w-4 h-4" /> : <ShoppingBag className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* CTA Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full mt-10">
        <div className="bg-gradient-to-br from-red-900/40 to-black rounded-[3rem] p-8 md:p-16 border border-red-500/20 relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="absolute top-0 right-0 w-96 h-96 bg-red-600/20 rounded-full blur-[100px] pointer-events-none"></div>
          
          <div className="relative z-10 max-w-xl">
            <h2 className="text-4xl md:text-5xl font-black mb-4 tracking-tight">Join the Elite.</h2>
            <p className="text-gray-300 text-lg mb-8">Create an account to track orders, save PC builds, and get exclusive member discounts.</p>
            <Link to="/signup" className="inline-flex items-center gap-2 bg-red-600 text-white px-8 py-4 rounded-xl font-bold hover:bg-red-700 transition-colors shadow-lg shadow-red-600/20">
              Create Account <ChevronRight className="w-5 h-5" />
            </Link>
          </div>
          
          <div className="relative z-10 hidden md:block">
            {/* Abstract visual */}
            <div className="w-64 h-64 border-4 border-red-500/30 rounded-full flex items-center justify-center p-4">
              <div className="w-full h-full border-4 border-red-500/50 rounded-full flex items-center justify-center p-4">
                <div className="w-full h-full bg-gradient-to-tr from-red-600 to-orange-500 rounded-full shadow-[0_0_50px_rgba(220,38,38,0.5)]"></div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
    </>
  );
};

export default StoreFront;
