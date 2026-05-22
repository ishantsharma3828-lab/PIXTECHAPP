
import React, { useState, useMemo, useContext } from 'react';
import { Product } from '../../constants/inventoryFields';
import { PartCategory, CATEGORIES } from '../../services/pcBuilderService';
import { SettingsContext } from '../../contexts/SettingsContext';

interface ComponentSelectorProps {
    inventory: Product[];
    onAddPart: (part: Product, category: PartCategory) => void;
    filters: { socket?: string; memory?: string }; // For smart filtering
    activeCategory: PartCategory;
    onCloseMobile?: () => void;
}

const ComponentSelector: React.FC<ComponentSelectorProps> = ({ inventory, onAddPart, filters, activeCategory, onCloseMobile }) => {
    const { settings, t } = useContext(SettingsContext);
    const [search, setSearch] = useState('');

    const isRightSideCurrency = settings.currencySymbol === 'DA' || settings.currencySymbol === 'DZD';
    const formatPrice = (val: number) => isRightSideCurrency ? `${val.toFixed(2)} ${settings.currencySymbol}` : `${settings.currencySymbol}${val.toFixed(2)}`;

    const filteredItems = useMemo(() => {
        if (!activeCategory) return [];
        
        let items = inventory.filter(p => {
            // Loose matching for demo purposes. Real app would have strict 'category' enums in Product
            const cat = (p.category || '').toLowerCase();
            const id = activeCategory.toLowerCase();
            
            // Map generic inventory categories to specific PC parts
            if (activeCategory === 'Motherboard') return cat.includes('motherboard') || cat.includes('board') || cat.includes('mobo');
            if (activeCategory === 'RAM') return cat.includes('ram') || cat.includes('memory');
            if (activeCategory === 'GPU') return cat.includes('gpu') || cat.includes('graphic') || cat.includes('video');
            if (activeCategory === 'Storage') return cat.includes('ssd') || cat.includes('hdd') || cat.includes('drive');
            if (activeCategory === 'PSU') return cat.includes('power') || cat.includes('psu') || cat.includes('supply');
            if (activeCategory === 'Cooling') return cat.includes('fan') || cat.includes('cooler') || cat.includes('aio');
            if (activeCategory === 'Case') return cat.includes('case') || cat.includes('tower') || cat.includes('chassis');
            
            return cat.includes(id) || (p.name || '').toLowerCase().includes(id);
        });

        // Smart Filter (Compatibility)
        // Only apply if category matches the filter type
        if (filters.socket && activeCategory === 'Motherboard') {
            // Prefer items that match socket
            items = items.sort((a, b) => {
                const aSocket = a.customFields?.socket;
                const bSocket = b.customFields?.socket;
                if (aSocket === filters.socket && bSocket !== filters.socket) return -1;
                if (bSocket === filters.socket && aSocket !== filters.socket) return 1;
                return 0;
            });
        }

        if (search) {
            const q = search.toLowerCase();
            items = items.filter(p => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q));
        }

        return items;
    }, [inventory, activeCategory, search, filters]);

    const activeCategoryLabel = activeCategory ? t(`pc.cat.${activeCategory}`) : t('pc.select_component');

    return (
        <div className="flex flex-col h-full bg-white dark:bg-gray-800 lg:rounded-lg overflow-hidden shadow-2xl lg:shadow-none">
            <div className="flex-1 flex flex-col min-w-0">
                <div className="p-3 lg:p-4 border-b border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-gray-800/50 flex gap-2 items-center sticky top-0 z-10">
                    {onCloseMobile && (
                        <button onClick={onCloseMobile} className="lg:hidden p-2 text-slate-500 hover:bg-slate-200 dark:hover:bg-gray-700 rounded-lg shrink-0">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
                        </button>
                    )}
                    <input 
                        type="text" 
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder={`${t('pc.search_parts')} ${activeCategoryLabel}...`}
                        className="flex-1 w-full px-3 py-1.5 lg:px-4 lg:py-2 text-xs lg:text-sm border border-slate-300 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] shadow-sm"
                    />
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {filteredItems.length === 0 ? (
                        <div className="text-center py-12 text-gray-400 text-sm flex flex-col items-center">
                            <svg className="w-12 h-12 mb-3 text-gray-300 dark:text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" /></svg>
                            {t('inventory.no_products')}
                        </div>
                    ) : (
                        filteredItems.map(item => (
                            <div key={item.id} className="bg-white dark:bg-gray-800 border border-slate-200 dark:border-zinc-800 rounded-xl p-3 hover:shadow-lg transition-all duration-200 group flex gap-4 items-center cursor-pointer" onClick={() => activeCategory && onAddPart(item, activeCategory)}>
                                <div className="w-16 h-16 bg-slate-50 dark:bg-gray-700/50 rounded-lg flex-shrink-0 overflow-hidden border border-gray-100 dark:border-gray-600">
                                    {item.images?.[0] ? (
                                        <img src={item.images[0].url} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-xs text-gray-400 font-medium">IMG</div>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="text-sm font-bold text-slate-800 dark:text-white truncate group-hover:text-[var(--color-primary)] transition-colors">{item.name}</div>
                                    <div className="flex justify-between items-center text-xs text-slate-500 mt-1">
                                        <span className="bg-slate-100 dark:bg-gray-700 px-2 py-0.5 rounded text-slate-600 dark:text-gray-300 font-mono">{item.sku}</span>
                                        <span className={`font-medium px-2 py-0.5 rounded ${item.quantity > 0 ? 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400' : 'bg-red-50 text-red-500 dark:bg-red-900/20 dark:text-red-400'}`}>
                                            {item.quantity > 0 ? `${item.quantity} In Stock` : 'Out of Stock'}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex flex-col items-end gap-2 shrink-0">
                                    <span className="text-base font-black text-[var(--color-primary)]">{formatPrice(item.price1)}</span>
                                    <button 
                                        className="px-4 py-1.5 bg-slate-100 dark:bg-gray-700 group-hover:bg-[var(--color-primary)] group-hover:text-white text-slate-700 dark:text-gray-200 rounded-lg text-xs font-bold transition-all shadow-sm group-hover:shadow"
                                    >
                                        {t('common.add')}
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default ComponentSelector;
