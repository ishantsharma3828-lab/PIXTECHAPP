import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Trash2, Minus, Plus, ShoppingBag, ArrowRight, CheckCircle } from 'lucide-react';
import { useCart } from '../../contexts/CartContext';
import { useToast } from '../../contexts/ToastContext';
import { saveSale } from '../../services/billingService';
import { getCurrentUser } from '../../services/authService';

const Cart: React.FC = () => {
  const { items, updateQuantity, removeFromCart, cartTotal, itemCount, clearCart } = useCart();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleCheckout = async () => {
    if (items.length === 0) return;
    
    setIsCheckingOut(true);
    
    try {
      const user = getCurrentUser();
      
      // Convert CartItems to the format expected by billingService
      const billingItems = items.map(item => ({
        ...item.product,
        cartId: `${item.product.id}_${Date.now()}`,
        quantity: item.quantity,
        discountType: 'fixed' as const,
        discountValue: 0,
        unitPrice: item.product.price1,
        priceSelection: 'price1' as const
      }));

      await saveSale({
        items: billingItems,
        subtotal: cartTotal,
        tax: 0,
        discount: 0,
        total: cartTotal,
        payments: [],
        status: 'draft',
        cashierName: 'Online Store',
        cashierId: 'online-store',
        customerName: user?.username || 'Guest',
        customerId: user?.id
      });

      clearCart();
      setIsSuccess(true);
      addToast('Order placed successfully!', 'success');
    } catch (error) {
      console.error('Checkout failed:', error);
      addToast('Failed to place order. Please try again.', 'error');
    } finally {
      setIsCheckingOut(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-24 text-center">
        <div className="w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-8">
          <CheckCircle className="w-12 h-12 text-green-500" />
        </div>
        <h1 className="text-4xl md:text-5xl font-black mb-6">Order Received!</h1>
        <p className="text-gray-400 text-lg mb-10 max-w-xl mx-auto">
          Thank you for your purchase. Your order has been sent to our store and is currently being processed.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link 
            to="/products"
            className="bg-white text-black px-8 py-4 rounded-xl font-bold hover:bg-slate-200 transition-colors"
          >
            Continue Shopping
          </Link>
          <Link 
            to="/"
            className="bg-[#111214] border border-white/10 text-white px-8 py-4 rounded-xl font-bold hover:bg-white/5 transition-colors"
          >
            Return Home
          </Link>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-24 text-center">
        <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
          <ShoppingBag className="w-12 h-12 text-slate-500" />
        </div>
        <h1 className="text-4xl font-black mb-4 tracking-tight">Your cart is empty</h1>
        <p className="text-gray-400 text-lg mb-8">
          Looks like you haven't added any products to your cart yet.
        </p>
        <Link 
          to="/products"
          className="bg-red-600 hover:bg-red-700 text-white px-8 py-3 rounded-xl font-bold transition-colors inline-flex items-center gap-2"
        >
          Start Shopping
          <ArrowRight className="w-5 h-5" />
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-4xl font-black mb-8 tracking-tight">Shopping Cart</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div className="lg:col-span-2 space-y-6">
          {items.map((item) => (
            <div key={item.product.id} className="bg-[#111214] border border-white/5 p-6 rounded-2xl flex flex-col sm:flex-row gap-6 items-start sm:items-center">
              <div className="w-24 h-24 bg-[#1a1b1e] rounded-xl flex-shrink-0 overflow-hidden relative">
                {item.product.images && item.product.images.length > 0 ? (
                  <img src={item.product.images[0].url} alt={item.product.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-600 text-xs text-center p-2">
                    No Image
                  </div>
                )}
              </div>
              
              <div className="flex-1">
                <div className="text-xs text-red-500 font-bold mb-1 uppercase tracking-wider">{item.product.category}</div>
                <h3 className="font-bold text-lg mb-1">{item.product.name}</h3>
                <p className="text-gray-400 text-sm mb-4">SKU: {item.product.sku}</p>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center bg-[#1a1b1e] border border-white/10 rounded-lg">
                    <button 
                      onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                      className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-10 text-center font-bold text-sm">{item.quantity}</span>
                    <button 
                      onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                      className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <span className="font-black text-lg">${(item.product.price1 * item.quantity).toFixed(2)}</span>
                    <button 
                      onClick={() => removeFromCart(item.product.id)}
                      className="w-8 h-8 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white flex items-center justify-center transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        <div className="lg:col-span-1">
          <div className="bg-[#111214] border border-white/5 p-6 rounded-2xl sticky top-24">
            <h2 className="text-xl font-bold mb-6">Order Summary</h2>
            
            <div className="space-y-4 mb-6 text-sm">
              <div className="flex justify-between text-gray-400">
                <span>Subtotal ({itemCount} items)</span>
                <span className="text-white font-bold">${cartTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>Shipping</span>
                <span className="text-white font-bold">Calculated at checkout</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>Taxes</span>
                <span className="text-white font-bold">Calculated at checkout</span>
              </div>
            </div>
            
            <div className="border-t border-white/10 pt-4 mb-8">
              <div className="flex justify-between items-center">
                <span className="font-bold text-lg">Estimated Total</span>
                <span className="font-black text-2xl text-red-500">${cartTotal.toFixed(2)}</span>
              </div>
            </div>
            
            <button 
              onClick={handleCheckout}
              disabled={items.length === 0}
              className={`w-full font-bold py-4 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 ${
                items.length === 0 
                  ? 'bg-gray-800 text-slate-500 cursor-not-allowed' 
                  : 'bg-gradient-to-r from-red-600 to-red-800 hover:from-red-500 hover:to-red-700 text-white shadow-red-600/20'
              }`}
            >
              Proceed to Checkout
              <ArrowRight className="w-5 h-5" />
            </button>
            
            <p className="text-xs text-slate-500 text-center mt-4">
              Secure checkout powered by Stripe.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cart;
