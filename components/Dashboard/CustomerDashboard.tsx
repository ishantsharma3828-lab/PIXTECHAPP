import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { getProducts } from '../../services/inventoryService';
import { Product } from '../../constants/inventoryFields';
import { SettingsContext } from '../../contexts/SettingsContext';

const CustomerDashboard: React.FC = () => {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getProducts().then((data) => {
            setProducts(data);
            setLoading(false);
        });
    }, []);

    // Cart Logic
    const handleAddToCart = (e: React.MouseEvent, product: Product) => {
        e.preventDefault();
        e.stopPropagation();

        try {
            const saved = localStorage.getItem('pos_cart_v1');
            const cart = saved ? JSON.parse(saved) : [];

            // Basic Add Logic
            const existingItemIndex = cart.findIndex((item: any) => item.product.id === product.id);
            if (existingItemIndex > -1) {
                cart[existingItemIndex].quantity += 1;
            } else {
                cart.push({
                    id: `item_${Date.now()}`,
                    product: product,
                    quantity: 1,
                    unitPrice: product.price1,
                    discountType: 'amount',
                    discountValue: 0
                });
            }

            localStorage.setItem('pos_cart_v1', JSON.stringify(cart));
            // Trigger storage event manually for same-window updates
            window.dispatchEvent(new Event('storage'));
            // Also dispatch a custom event for surer detection
            window.dispatchEvent(new CustomEvent('cart-updated', { detail: cart }));

            // Visual feedback
            const btn = e.currentTarget as HTMLButtonElement;
            const originalHTML = btn.innerHTML;
            btn.innerHTML = '<span class="text-xs">✓</span>';
            btn.classList.add('bg-green-500', 'text-white');
            setTimeout(() => {
                btn.innerHTML = originalHTML;
                btn.classList.remove('bg-green-500', 'text-white');
            }, 1000);

        } catch (err) {
            console.error("Failed to add to cart", err);
        }
    };




    const { settings } = React.useContext(SettingsContext);
    // Use settings banners or fallback (though defaultSettings has them now)
    const exploreBanners = (settings.dashboardBanners && settings.dashboardBanners.length > 0)
        ? settings.dashboardBanners
        : [
            {
                title: "Gaming PCs",
                subtitle: "Custom Built Performance",
                image: "https://images.unsplash.com/photo-1587202372775-e229f172b9d7?q=80&w=600&auto=format&fit=crop",
                path: "/pc-configurator",
                color: "from-purple-600 to-blue-600"
            }
        ];

    return (
        <div className="flex flex-col gap-8 text-slate-50 font-sans px-2 animate-fade-in">

            {/* HERO BANNER */}
            <div className="relative w-full h-[350px] md:h-[400px] rounded-3xl overflow-hidden shadow-2xl group border border-zinc-800">
                <img
                    src="https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=2070&auto=format&fit=crop"
                    alt="Hero"
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-900/80 to-transparent flex flex-col justify-center px-8 md:px-12">
                    <span className="bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full w-fit mb-4 uppercase tracking-wider shadow-lg shadow-blue-600/20">Featured</span>
                    <h1 className="text-4xl md:text-6xl font-black mb-2 tracking-tight drop-shadow-lg text-white">NEXT GEN <br />GAMING</h1>
                    <p className="text-xl text-zinc-100 font-medium mb-8 max-w-lg drop-shadow-md">Experience the ultimate performance with our custom builds.</p>
                    <div className="flex gap-4">
                        <Link to="/pc-configurator" className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-blue-500 transition-colors shadow-lg shadow-blue-600/20">
                            Start Building
                        </Link>
                    </div>
                </div>
            </div>

            {/* EXPLORE BANNERS */}
            <div>
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-slate-100">
                    <span className="w-1.5 h-6 bg-blue-500 rounded-full"></span>
                    Explore
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {exploreBanners.map((banner, idx) => (
                        <Link
                            key={idx}
                            to={banner.path}
                            className="relative h-48 rounded-2xl overflow-hidden group shadow-lg border border-zinc-800"
                        >
                            <img src={banner.image} className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 opacity-60 group-hover:opacity-40" />
                            <div className={`absolute inset-0 bg-gradient-to-t ${banner.color} opacity-20 group-hover:opacity-60 transition-opacity mix-blend-overlay`}></div>
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-900/40 to-transparent p-6 flex flex-col justify-end">
                                <h3 className="text-2xl font-bold uppercase tracking-wider text-white">{banner.title}</h3>
                                <p className="text-sm text-zinc-100 translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">{banner.subtitle}</p>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>

            {/* PRODUCTS & SIDEBAR */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Product Feed */}
                <div className="lg:col-span-2 space-y-8">
                    {loading ? (
                        <div className="flex items-center justify-center h-40 text-zinc-500">Loading Products...</div>
                    ) : (
                        Object.entries(products.reduce((acc, product) => {
                            const cat = product.category || 'Uncategorized';
                            if (!acc[cat]) acc[cat] = [];
                            acc[cat].push(product);
                            return acc;
                        }, {} as Record<string, Product[]>)).map(([category, items]) => (
                            <div key={category}>
                                <div className="flex justify-between items-end mb-4">
                                    <h2 className="text-xl font-bold flex items-center gap-2 capitalize text-slate-100">
                                        <span className="w-1.5 h-6 bg-emerald-500 rounded-full"></span>
                                        {category}
                                    </h2>
                                    <Link to={`/inventory?category=${category}`} className="text-sm text-blue-400 hover:text-blue-300 transition-colors">View All &rarr;</Link>
                                </div>

                                <div className="flex overflow-x-auto gap-4 pb-4 scrollbar-hide snap-x">
                                    {(items as Product[]).slice(0, 8).map((product) => (
                                        <div key={product.id} className="min-w-[200px] w-[200px] snap-start relative">
                                            <Link to={`/inventory?productId=${product.id}`} className="modern-card p-4 hover:border-slate-600 transition-all hover:-translate-y-1 group block h-full flex flex-col">
                                                <div className="h-40 bg-zinc-950 rounded-xl mb-4 overflow-hidden relative border border-zinc-800 shrink-0">
                                                    {product.images && product.images.length > 0 ? (
                                                        <img src={product.images[0].url} alt={product.name} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="absolute inset-0 flex items-center justify-center text-slate-600 text-xs uppercase font-bold tracking-widest">No Image</div>
                                                    )}
                                                </div>
                                                <h3 className="font-bold text-lg mb-1 group-hover:text-blue-400 transition-colors truncate text-slate-200">{product.name}</h3>
                                                <p className="text-zinc-500 text-xs mb-3 truncate">{product.sku}</p>
                                                <div className="flex justify-between items-center mt-auto pt-4 border-t border-zinc-800">
                                                    <span className="font-bold text-lg text-slate-100">${product.price1}</span>
                                                    <button
                                                        onClick={(e) => handleAddToCart(e, product)}
                                                        className="w-8 h-8 rounded-full bg-blue-600/20 text-blue-400 flex items-center justify-center hover:bg-blue-600 hover:text-white transition-colors z-10"
                                                    >
                                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                                                    </button>
                                                </div>
                                            </Link>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Account / Cart Sidebar */}
                <div className="space-y-6">
                    <div className="modern-card p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="font-bold text-lg text-slate-200">My Bag</h3>
                            <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-xs text-emerald-400 font-bold">3</div>
                        </div>

                        <div className="space-y-4 mb-6">
                            {/* Visual placeholders for cart - specific logic would need real cart state context if available */}
                            <div className="p-4 bg-zinc-950/50 rounded-xl text-center text-zinc-500 text-sm italic border border-zinc-800/50">
                                Check items in your bag
                            </div>
                        </div>

                        <Link to="/billing" className="block w-full py-4 bg-blue-600 text-white hover:bg-blue-500 rounded-xl text-center font-bold text-lg transition-colors shadow-lg shadow-blue-600/20">
                            Checkout Now
                        </Link>
                    </div>

                    <div className="bg-gradient-to-br from-indigo-900/40 to-blue-900/40 rounded-2xl p-6 border border-indigo-500/20 backdrop-blur-sm relative overflow-hidden">
                        <div className="relative z-10">
                            <h3 className="font-bold text-xl mb-2 text-indigo-100">Need Help?</h3>
                            <p className="text-sm text-indigo-200/70 mb-6">Track your repairs or start a new service ticket.</p>
                            <Link to="/service-desk" className="inline-block bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/30 text-indigo-100 px-6 py-2 rounded-lg text-sm font-bold transition-all">Support Center</Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CustomerDashboard;
