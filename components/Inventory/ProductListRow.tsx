import React, { useContext } from 'react';
import { Product, ProductField } from '../../constants/inventoryFields';
import { ColumnDefinition } from './InventoryPanel';
import { SettingsContext } from '../../contexts/SettingsContext';

const StockStatusBadge: React.FC<{ product: Product }> = ({ product }) => {
    const { t } = useContext(SettingsContext);
    const baseClasses = "px-2 py-1 text-[10px] font-bold rounded-lg inline-block uppercase tracking-wider";
    if (product.quantity > product.minStock) {
        return <span className={`${baseClasses} bg-green-500/20 text-green-400`}>In Stock</span>;
    }
    if (product.quantity > 0) {
        return <span className={`${baseClasses} bg-yellow-500/20 text-yellow-500`}>Low Stock</span>;
    }
    return <span className={`${baseClasses} bg-red-500/20 text-red-400`}>Out of Stock</span>;
};


interface ProductListRowProps {
    product: Product;
    isSelected: boolean;
    onSelect: (productId: string) => void;
    columns: ColumnDefinition[];
    onEdit: () => void;
    onMoveToTrash: () => void;
    onPrintLabel: () => void;
    canEdit: boolean;
    canDelete: boolean;
    onApprove?: () => void;
    enableSelection?: boolean;
    onRowClick?: () => void;
}

const ProductListRow: React.FC<ProductListRowProps> = ({ product, isSelected, onSelect, columns, onEdit, onMoveToTrash, onPrintLabel, canEdit, canDelete, onApprove, enableSelection = true, onRowClick }) => {
    const { settings, t } = useContext(SettingsContext);
    const isRightSideCurrency = settings?.currencySymbol === 'DA' || settings?.currencySymbol === 'DZD';

    // DEBUG: Check product structure
    // console.log("ProductRow:", product);

    const formatPrice = (price: number) => {
        if (!settings) return `${price}`;
        try {
            const formattedPrice = new Intl.NumberFormat(settings.language === 'fr' ? 'fr-FR' : settings.language === 'ar' ? 'ar-DZ' : 'en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
            }).format(price);

            if (isRightSideCurrency) {
                return `${formattedPrice} ${settings.currencySymbol}`;
            }
            return `${settings.currencySymbol}${formattedPrice}`;
        } catch (e) {
            return `${price}`;
        }
    };

    const gridTemplateStyle = {
        '--grid-cols-desktop': columns.map(col => col.width).join(' '),
        '--grid-cols-mobile': columns.filter(col => !col.hideOnMobile).map(col => col.width).join(' '),
    } as React.CSSProperties;

    const renderCell = (col: ColumnDefinition, product: Product) => {
        switch (col.key) {
            case 'images':
                return (
                    <div className="relative group/img w-[28px] sm:w-[32px] shrink-0">
                        <img
                            src={product.images && product.images.length > 0 ? product.images[0].url : `https://via.placeholder.com/100?text=${product.name.charAt(0)}`}
                            alt={product.name}
                            className="w-5 h-5 sm:w-6 sm:h-6 object-cover rounded shadow-sm border border-slate-200 dark:border-zinc-800 bg-slate-100 dark:bg-zinc-900"
                        />
                        {enableSelection && (
                            <div className={`absolute -top-1 -left-1 transition-transform duration-200 ${isSelected ? 'scale-100' : 'scale-0 group-hover/img:scale-100'}`}>
                                <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={(e) => { e.stopPropagation(); onSelect(product.id); }}
                                    onClick={(e) => e.stopPropagation()}
                                    className="h-2.5 w-2.5 rounded border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-blue-500 focus:ring-blue-500 shadow-sm cursor-pointer"
                                />
                            </div>
                        )}
                    </div>
                );
            case 'name':
                return (
                    <div className="min-w-0 pr-1.5 sm:pr-2 overflow-hidden">
                        <div className="font-bold text-slate-900 dark:text-gray-100 truncate text-[11px] sm:text-xs leading-tight" title={product.name}>{product.name}</div>
                        {product.approvalStatus === 'pending' && (
                            <span className="mt-0.5 inline-block text-[7px] sm:text-[8px] uppercase font-black tracking-widest bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-500 px-1 py-0.5 rounded">Pending</span>
                        )}
                    </div>
                );
            case 'sku':
                return <div className="font-mono text-[9px] sm:text-[10px] text-slate-600 dark:text-gray-300 truncate" title={product.sku || '-'}>{product.sku || '–'}</div>;
            case 'category':
                return (
                    <div className="truncate">
                        {product.category && product.category.trim() !== '' ? (
                            <span className="inline-flex items-center px-1 py-0.5 sm:px-1.5 sm:py-0.5 rounded text-[8px] sm:text-[9px] font-black uppercase tracking-widest bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-500/20 max-w-full truncate">
                                {product.category}
                            </span>
                        ) : (
                            <span className="text-slate-500 dark:text-gray-400 text-[9px]">–</span>
                        )}
                    </div>
                );
            case 'brand':
                return <div className="text-[7px] sm:text-[8px] font-bold text-slate-600 dark:text-gray-300 uppercase tracking-widest truncate">{product.brand || '–'}</div>;
            case 'quantity':
                return <div className={`text-center font-black text-[10px] sm:text-[11px] ${product.quantity <= 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-800 dark:text-gray-200'}`}>{product.quantity}</div>;
            case 'price1':
                return <div className="text-right font-black text-[10px] sm:text-[11px] text-blue-700 dark:text-blue-300 whitespace-nowrap">{formatPrice(product.price1)}</div>;
            case 'stockStatus':
                return <div className="flex justify-center"><StockStatusBadge product={product} /></div>;
            case 'warranty':
                return <div className="text-center text-[7px] sm:text-[8px] font-bold text-slate-600 dark:text-gray-400">{product.warranty?.enabled ? `${product.warranty.days} d` : '–'}</div>;
            case 'actions':
                return (
                    <div className="flex items-center justify-end gap-1 sm:gap-2">
                        {canEdit && (
                            <button
                                onClick={(e) => { e.stopPropagation(); onEdit(); }}
                                className="p-1.5 sm:p-2 text-gray-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-zinc-900 hover:text-amber-600 dark:hover:text-amber-400 rounded-lg transition-all"
                                title={t('common.edit')}
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                            </button>
                        )}
                        {canDelete && (
                            <button
                                onClick={(e) => { e.stopPropagation(); onMoveToTrash(); }}
                                className="p-1.5 sm:p-2 text-gray-400 dark:text-slate-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 hover:text-rose-600 dark:hover:text-rose-500 rounded-lg transition-all"
                                title={t('inventory.trash')}
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                        )}
                    </div>
                );
            default:
                // Custom Fields
                const value = product.customFields?.[col.key];
                return (
                    <div className="text-[9px] sm:text-[10px] text-slate-500 dark:text-gray-400 truncate">
                        {value !== undefined ? String(value) : '–'}
                    </div>
                );
        }
    };

    return (
        <>
            {/* MOBILE: Dense Card Layout */}
            <div
                onClick={() => onRowClick && onRowClick()}
                className={`sm:hidden relative flex items-center p-3 gap-3 border-b border-slate-100 dark:border-zinc-800 transition-colors
                    ${isSelected ? 'bg-blue-50/50 dark:bg-blue-500/10' : 'bg-white dark:bg-zinc-950 active:bg-slate-50 dark:active:bg-zinc-900'}
                `}
            >
                {/* Selection Layer (Invisible overlay for easy tapping anywhere on the left side) */}
                {enableSelection && (
                    <div 
                        className="absolute inset-y-0 left-0 w-2/3 cursor-pointer z-10"
                        onClick={(e) => {
                            e.stopPropagation();
                            onSelect(product.id);
                        }}
                    ></div>
                )}
                
                <div className="relative shrink-0 z-0">
                    <img
                        src={product.images && product.images.length > 0 ? product.images[0].url : `https://via.placeholder.com/100?text=${product.name.charAt(0)}`}
                        alt={product.name}
                        className="w-12 h-12 object-cover rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900"
                    />
                    {enableSelection && (
                        <div className={`absolute -top-1.5 -left-1.5 z-20 transition-all ${isSelected ? 'opacity-100 scale-100' : 'opacity-0 scale-75'}`}>
                            <div className="bg-blue-500 rounded-full text-white shadow-sm p-0.5">
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex-1 min-w-0 flex flex-col justify-center z-20 pointer-events-none">
                    <div className="font-bold text-slate-900 dark:text-zinc-100 text-sm truncate leading-tight mb-1">
                        {product.name}
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                        <span className="font-mono text-slate-500 dark:text-zinc-500">{product.sku || 'No SKU'}</span>
                        {product.category && product.category !== 'all' && (
                            <span className="text-[9px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 px-1.5 py-0.5 rounded">
                                {product.category}
                            </span>
                        )}
                    </div>
                </div>

                <div className="shrink-0 flex flex-col items-end justify-center z-20 pointer-events-none">
                    <div className="font-black text-sm text-blue-600 dark:text-blue-400 mb-1">
                        {formatPrice(product.price1)}
                    </div>
                    <div className={`font-bold text-[10px] uppercase tracking-wider ${product.quantity <= 0 ? 'text-rose-500' : product.quantity <= product.minStock ? 'text-amber-500' : 'text-slate-500 dark:text-zinc-400'}`}>
                        {product.quantity} In Stock
                    </div>
                </div>
            </div>

            {/* DESKTOP: Table Row Layout */}
            <div
                onClick={() => onRowClick && onRowClick()}
                style={gridTemplateStyle}
                className={`hidden sm:grid grid-cols-[var(--grid-cols-desktop)] gap-2 items-center px-2 py-1.5 border-b border-slate-100 dark:border-zinc-800/50 transition-all duration-200 group relative
                    ${isSelected ? 'bg-blue-50/50 dark:bg-blue-500/5 border-l-2 border-l-blue-500' : 'bg-transparent hover:bg-slate-50 dark:hover:bg-zinc-900/50 border-l-2 border-l-transparent'}
                    ${onRowClick ? 'cursor-pointer' : ''}`}
            >
                {columns.map((col: ColumnDefinition) => (
                    <div key={col.key} className="min-w-0">
                        {renderCell(col, product)}
                    </div>
                ))}
            </div>
        </>
    );
};

export default ProductListRow;
