import React, { useState, useEffect } from 'react';
import { Search, Filter, ShoppingCart, Check, Heart, ChevronLeft } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { getProducts } from '../../services/inventoryService';
import { Product } from '../../constants/inventoryFields';
import { useCart } from '../../contexts/CartContext';

const Products: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [category, setCategory] = useState('All');
  const [addedItems, setAddedItems] = useState<Record<string, boolean>>({});
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});
  const { addToCart } = useCart();
  const navigate = useNavigate();

  useEffect(() => {
    getProducts().then(setProducts);
  }, []);

  const categories = ['All', ...Array.from(new Set(products.map(p => p.category).filter(Boolean)))];

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.sku.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = category === 'All' || p.category === category;
    return matchesSearch && matchesCategory;
  });

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

  return (
    <>
      {/* --- DESKTOP VIEW --- */}
      <div className="hidden md:block max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
          <h1 className="text-4xl font-black tracking-tight text-white">Our Products</h1>
          
          <div className="flex w-full md:w-auto gap-4">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input 
                type="text" 
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-[#111214] border border-white/10 rounded-xl pl-10 pr-4 py-2 text-white focus:outline-none focus:border-red-500 transition-colors"
              />
            </div>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <select 
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="bg-[#111214] border border-white/10 rounded-xl pl-10 pr-8 py-2 text-white focus:outline-none focus:border-red-500 transition-colors appearance-none"
              >
                {categories.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {filteredProducts.length === 0 ? (
          <div className="text-center py-20 bg-[#111214] rounded-2xl border border-white/5">
            <p className="text-gray-400 text-lg">No products found matching your criteria.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProducts.map(product => (
              <Link to={`/products/${product.id}`} key={product.id} className="bg-[#111214] border border-white/5 rounded-2xl overflow-hidden hover:border-red-500/50 transition-all group block">
                <div className="aspect-square bg-white relative p-4 flex items-center justify-center">
                  {product.images && product.images.length > 0 ? (
                    <img src={product.images[0].url} alt={product.name} className="w-full h-full object-contain" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400 font-bold uppercase text-xs">
                      No Image
                    </div>
                  )}
                  {product.quantity <= 0 && (
                    <div className="absolute top-2 right-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-lg">
                      Out of Stock
                    </div>
                  )}
                </div>
                <div className="p-5">
                  <div className="text-xs text-red-500 font-bold mb-1 uppercase tracking-wider">{product.category}</div>
                  <h3 className="font-bold text-lg mb-2 line-clamp-2 text-white">{product.name}</h3>
                  <div className="flex items-center justify-between mt-4">
                    <span className="text-xl font-black text-white">${product.price1.toFixed(2)}</span>
                    <button 
                      disabled={product.quantity <= 0}
                      onClick={(e) => handleAddToCart(e, product)}
                      className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors disabled:opacity-50 disabled:hover:bg-white/5 ${
                        addedItems[product.id] 
                          ? 'bg-green-500 text-white' 
                          : 'bg-[#1c1c1e] text-white hover:bg-red-600'
                      }`}
                    >
                      {addedItems[product.id] ? <Check className="w-5 h-5" /> : <ShoppingCart className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* --- MOBILE VIEW --- */}
      <div className="md:hidden w-full pb-28 pt-2 px-4 overflow-x-hidden">
        {/* Mobile Header: Back & Search */}
        <div className="flex items-center gap-2 mb-6">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-gray-400 hover:text-white transition-colors">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input 
              type="text" 
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#111214] border border-white/10 rounded-full pl-9 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-red-500/50 transition-colors"
            />
          </div>
          <div className="relative shrink-0">
             <select 
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="bg-[#111214] border border-white/10 text-gray-300 text-sm font-medium rounded-full pl-4 pr-8 py-2.5 outline-none appearance-none"
             >
                {categories.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
             </select>
             <Filter className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500 pointer-events-none" />
          </div>
        </div>

        {/* Filter Pills Array (Visual mock) */}
        <div className="flex overflow-x-auto gap-2 pb-4 mb-2 scrollbar-hide">
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-white/10 text-xs font-bold shrink-0 text-white">
             Filter <Filter className="w-3 h-3" />
          </button>
          <button className="px-4 py-1.5 rounded-full border border-white/10 text-xs font-medium shrink-0 text-gray-300">Ratings</button>
          <button className="px-4 py-1.5 rounded-full border border-white/10 text-xs font-medium shrink-0 text-gray-300">Brand</button>
          <button className="px-4 py-1.5 rounded-full border border-white/10 text-xs font-medium shrink-0 text-gray-300">Price</button>
        </div>

        {/* Category Circle Icons */}
        <div className="flex overflow-x-auto gap-5 pb-6 scrollbar-hide">
          {categories.filter(c => c !== 'All').map((cat, idx) => (
             <button 
               key={cat} onClick={() => setCategory(cat)}
               className={`flex flex-col items-center gap-2 shrink-0 ${category === cat ? 'opacity-100' : 'opacity-50'}`}
             >
                <div className="w-14 h-14 bg-[#111214] border border-white/10 rounded-full flex items-center justify-center p-3 shadow-inner">
                   <div className="w-full h-full bg-white/5 rounded-full flex items-center justify-center text-[10px] font-black uppercase text-red-500 truncate" style={{ fontSize: cat.length > 8 ? '8px' : '10px' }}>
                     {cat.substring(0, 3)}
                   </div>
                </div>
                <span className="text-[10px] font-medium text-white max-w-[56px] truncate text-center">{cat}</span>
             </button>
          ))}
        </div>

        {/* Mobile Product Grid - 2 Columns */}
        {filteredProducts.length === 0 ? (
          <div className="text-center py-10 bg-[#111214] rounded-2xl border border-white/5">
            <p className="text-gray-400 text-sm">No products found.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {filteredProducts.map(product => (
              <Link to={`/products/${product.id}`} key={product.id} className="bg-[#111214] border border-white/5 rounded-2xl overflow-hidden active:scale-[0.98] transition-transform block relative p-2 shadow-sm">
                
                {/* Image Block */}
                <div className="w-full aspect-[4/5] bg-white rounded-xl relative p-3 flex items-center justify-center shadow-inner mb-3">
                  <button 
                     onClick={(e) => toggleFavorite(e, product.id)}
                     className="absolute top-2 right-2 w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center shadow-sm z-10"
                  >
                     <Heart className={`w-3.5 h-3.5 ${favorites[product.id] ? 'fill-red-500 text-red-500' : 'text-gray-400'}`} />
                  </button>
                  {product.images && product.images.length > 0 ? (
                    <img src={product.images[0].url} alt={product.name} className="w-full h-full object-contain" />
                  ) : (
                    <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest text-center">No Image</div>
                  )}
                  {product.quantity <= 0 && (
                    <div className="absolute bottom-2 left-2 bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded uppercase">
                      Out
                    </div>
                  )}
                </div>

                {/* Details Block */}
                <div className="px-1 pb-1 flex flex-col">
                  {/* Category - mimicking brand name structure */}
                  <div className="flex items-center gap-1 mb-1">
                     <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest truncate">{product.category || 'Store'}</span>
                     <span className="text-yellow-500 text-[8px]">★</span>
                     <span className="text-[9px] font-medium text-gray-500">4.9</span>
                  </div>
                  
                  {/* Title */}
                  <h3 className="font-bold text-[11px] leading-snug line-clamp-2 text-white mb-2">{product.name}</h3>
                  
                  {/* Price */}
                  <div className="flex items-end justify-between mt-auto">
                    <span className="text-sm font-black text-white">${product.price1.toFixed(2)}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
};

export default Products;
