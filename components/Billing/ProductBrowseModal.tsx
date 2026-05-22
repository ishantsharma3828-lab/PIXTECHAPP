
import React, { useState, useContext, useEffect, useRef } from 'react';
import { Product } from '../../constants/inventoryFields';
import { SettingsContext } from '../../contexts/SettingsContext';

interface ProductBrowseModalProps {
    products: Product[];
    onClose: () => void;
    onAddToCart: (product: Product) => void;
}

const ProductBrowseModal: React.FC<ProductBrowseModalProps> = ({ products, onClose, onAddToCart }) => {
    const { settings, t } = useContext(SettingsContext);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const searchInputRef = useRef<HTMLInputElement>(null);

    const isRightSideCurrency = settings.currencySymbol === 'DA' || settings.currencySymbol === 'DZD';
    const formatPrice = (val: number) => isRightSideCurrency ? `${val.toFixed(2)} ${settings.currencySymbol}` : `${settings.currencySymbol}${val.toFixed(2)}`;

    useEffect(() => {
        searchInputRef.current?.focus();
    }, []);

    const categories = ['all', ...Array.from(new Set(products.map(p => p.category).filter(Boolean)))];

    const filteredProducts = products.filter(p => {
        const matchesSearch = (p.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
                              (p.sku || '').toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    const handleAddToCart = (product: Product) => {
        onAddToCart(product);
        // We do not close the modal to allow multiple picks, but we could add a visual feedback here if needed.
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center sm:p-4 animate-fade-in backdrop-blur-sm">
            <div className="bg-slate-50 dark:bg-zinc-900 rounded-none sm:rounded-xl shadow-2xl w-full h-[100dvh] sm:w-[80vw] sm:h-auto sm:max-h-[85vh] max-w-6xl flex flex-col border-0 sm:border border-slate-200 dark:border-zinc-800 overflow-hidden">
                
                {/* Header */}
                <div className="p-3 md:p-4 border-b border-slate-200 dark:border-zinc-800 flex justify-between items-center bg-white dark:bg-zinc-950/80">
                    <h2 className="text-lg md:text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <svg className="w-5 h-5 md:w-6 md:h-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
                        Browse Products
                    </h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-zinc-900 transition-colors">
                        <svg className="w-5 h-5 md:w-6 md:h-6 text-slate-500 dark:text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                {/* Filter Bar */}
                <div className="p-3 md:p-4 border-b border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/80 flex flex-col md:flex-row gap-2 md:gap-4">
                    <div className="relative flex-1">
                        <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <svg className="h-4 w-4 md:h-5 md:w-5 text-slate-400 dark:text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                        </span>
                        <input
                            ref={searchInputRef}
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 md:pl-10 pr-2 py-1.5 md:py-2 border border-slate-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-950/80 text-sm md:text-base text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder={t('inventory.search_placeholder')}
                        />
                    </div>
                    <select 
                        value={selectedCategory} 
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="p-1.5 md:p-2 border border-slate-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-950/80 text-sm md:text-base text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none min-w-[200px]"
                    >
                        {categories.map(cat => (
                            <option key={cat} value={cat}>{cat === 'all' ? t('common.all') : cat}</option>
                        ))}
                    </select>
                </div>

                {/* Product Grid */}
                <div className="flex-1 overflow-y-auto p-2 md:p-4 bg-transparent pb-safe pb-[80px] md:pb-4 relative scrollbar-hide">
                    {filteredProducts.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-600 dark:text-zinc-500 opacity-60">
                            <svg className="w-16 h-16 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" /></svg>
                            <p className="text-lg">{t('inventory.no_products')}</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 md:gap-4">
                            {filteredProducts.map(product => {
                                const hasImage = product.images && product.images.length > 0;
                                const imgUrl = hasImage ? product.images![0].url : `https://via.placeholder.com/150?text=${product.name.charAt(0)}`;
                                
                                return (
                                    <div 
                                        key={product.id}
                                        onClick={() => handleAddToCart(product)}
                                        className="bg-slate-50 dark:bg-zinc-900/80 rounded-lg shadow-sm border border-slate-200 dark:border-zinc-800 overflow-hidden cursor-pointer hover:shadow-md hover:border-blue-500 transition-all group flex flex-col"
                                    >
                                        <div className="aspect-square bg-slate-50 dark:bg-zinc-900 relative overflow-hidden">
                                            <img src={imgUrl} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                                            {product.quantity <= 0 && (
                                                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                                    <span className="text-white font-bold text-[10px] bg-rose-600 px-1 py-0.5 md:px-2 md:py-1 rounded uppercase tracking-wider">{t('inventory.status.out_of_stock')}</span>
                                                </div>
                                            )}
                                            {product.quantity > 0 && product.quantity <= product.minStock && (
                                                <div className="absolute top-1 right-1 md:top-2 md:right-2">
                                                    <span className="w-2 h-2 md:w-3 md:h-3 bg-amber-500 rounded-full block border-2 border-white dark:border-zinc-900"></span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="p-2 md:p-3 flex-1 flex flex-col">
                                            <h3 className="font-bold text-slate-900 dark:text-white text-[11px] md:text-sm line-clamp-2 mb-1" title={product.name}>{product.name}</h3>
                                            <p className="text-[10px] md:text-xs text-slate-500 dark:text-zinc-400 mb-2 truncate">{product.sku}</p>
                                            
                                            <div className="mt-auto flex justify-between items-center">
                                                <span className="font-bold text-blue-500 text-xs md:text-sm">{formatPrice(product.price1)}</span>
                                                <span className={`text-[9px] md:text-[10px] px-1 md:px-1.5 py-0.5 rounded font-medium ${product.quantity > 0 ? 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400' : 'bg-rose-500/10 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400'}`}>
                                                    {product.quantity} left
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
            <style>{`
                @keyframes fade-in {
                    from { opacity: 0; transform: scale(0.98); }
                    to { opacity: 1; transform: scale(1); }
                }
                .animate-fade-in {
                    animation: fade-in 0.2s ease-out forwards;
                }
            `}</style>
        </div>
    );
};

export default ProductBrowseModal;
