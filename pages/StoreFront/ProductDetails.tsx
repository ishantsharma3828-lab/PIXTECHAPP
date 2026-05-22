import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ShoppingCart, Shield, Truck, Package, Heart, CheckCircle2, ChevronRight } from 'lucide-react';
import { getProducts } from '../../services/inventoryService';
import { Product } from '../../constants/inventoryFields';
import { useCart } from '../../contexts/CartContext';

const ProductDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [added, setAdded] = useState(false);
  const { addToCart } = useCart();

  useEffect(() => {
    const fetchProduct = async () => {
      const products = await getProducts();
      const found = products.find(p => p.id === id);
      if (found) {
        setProduct(found);
      }
      setLoading(false);
    };
    fetchProduct();
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-24 flex justify-center">
        <div className="w-12 h-12 border-4 border-red-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-24 text-center">
        <h1 className="text-4xl font-black mb-4 text-white">Product Not Found</h1>
        <p className="text-gray-400 mb-8">The product you are looking for does not exist or has been removed.</p>
        <Link to="/products" className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-xl font-bold transition-colors">
          Back to Products
        </Link>
      </div>
    );
  }

  const handleAddToCart = () => {
    addToCart(product);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  const handleBuyNow = () => {
    addToCart(product);
    navigate('/cart');
  };

  return (
    <>
      {/* --- DESKTOP VIEW --- */}
      <div className="hidden md:block max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <button 
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-8"
        >
          <ArrowLeft className="w-5 h-5" />
          Back
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Product Images */}
          <div className="space-y-4">
            <div className="aspect-square bg-white border border-white/10 rounded-[32px] overflow-hidden flex items-center justify-center p-8">
              {product.images && product.images.length > 0 ? (
                <img src={product.images[0].url} alt={product.name} className="w-full h-full object-contain" />
              ) : (
                <div className="text-gray-400 flex flex-col items-center gap-4">
                  <Package className="w-16 h-16" />
                  <span className="font-bold">No Image Available</span>
                </div>
              )}
            </div>
            {product.images && product.images.length > 1 && (
              <div className="grid grid-cols-4 gap-4">
                {product.images.slice(1).map((img, idx) => (
                  <div key={idx} className="aspect-square bg-white border border-white/10 rounded-2xl overflow-hidden p-2">
                    <img src={img.url} alt={`${product.name} ${idx + 2}`} className="w-full h-full object-contain" />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="flex flex-col">
            <div className="mb-6">
              <div className="text-red-500 font-bold tracking-wider uppercase text-sm mb-2">{product.category}</div>
              <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-4 text-white">{product.name}</h1>
              <div className="flex items-center gap-4 text-sm text-gray-400">
                <span>SKU: {product.sku}</span>
                <span>•</span>
                <span>Brand: {product.brand}</span>
              </div>
            </div>

            <div className="text-4xl font-black mb-8 text-white">
              ${product.price1.toFixed(2)}
            </div>

            <div className="prose prose-invert max-w-none mb-8">
              <p className="text-gray-300 text-lg leading-relaxed">
                {product.description || "No description available for this product."}
              </p>
            </div>

            <div className="space-y-4 mb-8">
              <div className="flex items-center gap-3 text-gray-300 bg-[#111214] border border-white/5 p-4 rounded-xl">
                <Shield className="w-6 h-6 text-red-500" />
                <div>
                  <div className="font-bold">Warranty</div>
                  <div className="text-sm text-slate-500">{product.warranty?.enabled ? `${product.warranty.days} Days Coverage` : 'No Warranty'}</div>
                </div>
              </div>
              <div className="flex items-center gap-3 text-gray-300 bg-[#111214] border border-white/5 p-4 rounded-xl">
                <Truck className="w-6 h-6 text-red-500" />
                <div>
                  <div className="font-bold">Shipping</div>
                  <div className="text-sm text-slate-500">Fast delivery available</div>
                </div>
              </div>
            </div>

            <div className="mt-auto">
              <div className="flex items-center gap-4 mb-4">
                <div className={`px-4 py-2 rounded-lg font-bold text-sm ${product.quantity > 0 ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                  {product.quantity > 0 ? 'In Stock' : 'Out of Stock'}
                </div>
                {product.quantity > 0 && (
                  <div className="text-sm text-gray-400">
                    {product.quantity} units available
                  </div>
                )}
              </div>

              <button 
                onClick={handleAddToCart}
                disabled={product.quantity <= 0}
                className={`w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-3 transition-all ${
                  product.quantity <= 0 
                    ? 'bg-gray-800 text-slate-500 cursor-not-allowed' 
                    : added 
                      ? 'bg-green-500 text-white' 
                      : 'bg-gradient-to-r from-red-600 to-red-800 hover:from-red-500 hover:to-red-700 text-white shadow-lg shadow-red-600/20'
                }`}
              >
                {added ? (
                  <>
                    <CheckCircle2 className="w-6 h-6" />
                    Added to Cart!
                  </>
                ) : (
                  <>
                    <ShoppingCart className="w-6 h-6" />
                    Add to Cart
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* --- MOBILE VIEW --- */}
      <div className="md:hidden w-full bg-[#0a0a0c] min-h-[100dvh]">
        {/* Full Edge Image Block */}
        <div className="w-full h-[400px] bg-white rounded-b-[40px] relative shadow-lg flex justify-center items-center p-8">
           <button onClick={() => navigate(-1)} className="absolute top-6 left-4 w-10 h-10 bg-white shadow-md rounded-xl flex items-center justify-center text-gray-800 z-10 active:scale-95 transition-transform">
             <ArrowLeft className="w-5 h-5" />
           </button>
           
           {product.images && product.images.length > 0 ? (
              <img src={product.images[0].url} alt={product.name} className="w-full h-full object-contain mix-blend-multiply" />
            ) : (
              <div className="text-gray-300 font-bold uppercase tracking-widest flex flex-col items-center">
                <Package className="w-12 h-12 mb-2 text-gray-200" />
                No Image
              </div>
            )}

            {/* Pagination Line Indicators */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2">
               <div className="w-8 h-1 bg-gray-800 rounded-full"></div>
               <div className="w-8 h-1 bg-gray-200 rounded-full"></div>
               <div className="w-8 h-1 bg-gray-200 rounded-full"></div>
            </div>
        </div>

        {/* Content Block */}
        <div className="px-6 pt-8 pb-[140px]">
           <div className="flex items-center gap-1.5 mb-2">
              <ShoppingCart className="w-4 h-4 text-blue-500" />
              <span className="text-xs font-bold text-blue-500 uppercase tracking-widest">Shopping</span>
           </div>
           
           <div className="flex justify-between items-start mb-4">
              <h1 className="text-2xl font-black text-white leading-tight pr-4">{product.name}</h1>
              <button className="w-10 h-10 bg-blue-500/10 rounded-full flex shrink-0 items-center justify-center">
                 <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-blue-500"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
              </button>
           </div>

           <p className="text-[13px] text-gray-400 leading-relaxed font-medium mb-1">
              Hi-Fi Shop & Service GameX Store
           </p>
           <p className="text-[13px] text-gray-500 leading-relaxed font-medium mb-6">
              This shop offers both products and services
           </p>

           <div className="flex items-center justify-between border border-white/10 rounded-2xl p-4 mb-8 bg-[#111214]">
              <div className="flex flex-col">
                 <span className="text-[13px] font-bold text-gray-300">Central Ave 57.</span>
                 <span className="text-[11px] text-gray-500">11-001, Storefront</span>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-500" />
           </div>

           <div className="flex flex-col mb-2">
              <span className="text-xl font-black text-white">${product.price1.toFixed(2)}</span>
              <span className="text-[11px] text-gray-500 font-medium">Tax Rate 2% - ${(product.price1 * 0.02).toFixed(2)} (~${(product.price1 * 1.02).toFixed(2)})</span>
           </div>
        </div>

        {/* Sticky Action (Above Bottom Nav) */}
        <div className="fixed bottom-[80px] left-0 w-full p-4 z-40 bg-gradient-to-t from-[#0a0a0c] via-[#0a0a0c] to-transparent pt-8">
           <button 
             onClick={handleAddToCart}
             disabled={product.quantity <= 0 || added}
             className={`w-full font-bold py-4 rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 ${
               added 
                 ? 'bg-green-500 text-white shadow-green-500/20' 
                 : 'bg-[#0047FF] text-white shadow-blue-500/20 active:bg-blue-700'
             }`}
           >
             {added ? (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  ADDED TO CART
                </>
             ) : (
                'ADD TO CART'
             )}
           </button>
        </div>
      </div>
    </>
  );
};

export default ProductDetails;
