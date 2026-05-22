
import React, { useState, useContext } from 'react';
import { CartItem } from '../../constants/billingTypes';
import { SettingsContext } from '../../contexts/SettingsContext';
import { usePermissions } from '../../hooks/usePermissions';

interface CartItemOptionsModalProps {
    item: CartItem;
    onSave: (updates: Partial<CartItem>) => void;
    onRemove: () => void;
    onClose: () => void;
}

const CartItemOptionsModal: React.FC<CartItemOptionsModalProps> = ({ item, onSave, onRemove, onClose }) => {
    const { settings, t } = useContext(SettingsContext);
    const { selectablePriceTiers, canApplyDiscount } = usePermissions();
    const isRightSideCurrency = settings.currencySymbol === 'DA' || settings.currencySymbol === 'DZD';

    const [unitPrice, setUnitPrice] = useState<number>(item.unitPrice);
    const [priceSelection, setPriceSelection] = useState<CartItem['priceSelection']>(item.priceSelection);
    const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>(item.discountType);
    const [discountValue, setDiscountValue] = useState<number>(item.discountValue);
    const [notes, setNotes] = useState<string>(item.notes || '');

    const formatPrice = (val: number) => isRightSideCurrency ? `${val.toFixed(2)} ${settings.currencySymbol}` : `${settings.currencySymbol}${val.toFixed(2)}`;

    const handlePriceSelectionChange = (selection: CartItem['priceSelection']) => {
        setPriceSelection(selection);
        if (selection === 'custom') {
            // Keep current unit price but allow edit
        } else {
            // Revert to catalog price
            // @ts-ignore
            setUnitPrice(item[selection] || 0);
        }
    };

    const handleSave = () => {
        onSave({
            unitPrice,
            priceSelection,
            discountType,
            discountValue,
            notes
        });
        onClose();
    };

    const prices = [
        { key: 'price1', label: t('inventory.col.price1'), value: item.price1 || 0 },
        { key: 'price2', label: t('inventory.col.price2'), value: item.price2 || 0 },
        { key: 'price3', label: t('inventory.col.price3'), value: item.price3 || 0 },
        { key: 'price4', label: t('inventory.col.price4'), value: item.price4 || 0 },
    ].filter(p => {
        const tierNum = parseInt(p.key.replace('price', ''));
        return selectablePriceTiers.includes(tierNum);
    });

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-[200] flex items-center justify-center p-0 md:p-4 animate-fade-in backdrop-blur-sm">
            <div className="bg-white dark:bg-zinc-900 rounded-none md:rounded-xl shadow-2xl w-full h-[100dvh] md:w-[60vw] md:h-auto md:max-h-[85vh] max-w-md border-0 md:border border-slate-200 dark:border-zinc-800 flex flex-col">
                <div className="p-5 border-b border-slate-200 dark:border-zinc-800">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white truncate">{item.name}</h3>
                    <p className="text-sm text-slate-500 dark:text-gray-400">{t('common.edit')}</p>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6">

                    {/* Price Selection */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-3">{t('stock.unit_cost')}</label>
                        <div className="grid grid-cols-2 gap-2 mb-3">
                            {prices.map(p => (
                                <button
                                    key={p.key}
                                    onClick={() => handlePriceSelectionChange(p.key as any)}
                                    className={`px-3 py-2 text-sm rounded-lg border text-left transition-all ${priceSelection === p.key
                                            ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-500 text-blue-700 dark:text-blue-300 ring-1 ring-blue-500'
                                            : 'bg-white dark:bg-gray-700 border-slate-200 dark:border-gray-600 text-slate-700 dark:text-gray-200 hover:bg-slate-50 dark:hover:bg-gray-600'
                                        }`}
                                >
                                    <div className="font-semibold">{formatPrice(p.value)}</div>
                                    <div className="text-xs opacity-70">{p.label}</div>
                                </button>
                            ))}
                        </div>

                        {/* Custom Price Toggle */}
                        {canApplyDiscount && (
                            <div className={`p-3 rounded-lg border transition-all ${priceSelection === 'custom' ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-500' : 'bg-slate-50 dark:bg-gray-900/50 border-slate-200 dark:border-zinc-800'}`}>
                                <label className="flex items-center space-x-2 cursor-pointer mb-2">
                                    <input
                                        type="radio"
                                        checked={priceSelection === 'custom'}
                                        onChange={() => handlePriceSelectionChange('custom')}
                                        className="text-blue-600 focus:ring-blue-500"
                                    />
                                    <span className="text-sm font-semibold text-slate-800 dark:text-gray-200">Custom</span>
                                </label>
                                {priceSelection === 'custom' && (
                                    <input
                                        type="number"
                                        value={unitPrice}
                                        onChange={(e) => setUnitPrice(Number(e.target.value))}
                                        className="w-full px-3 py-2 border border-slate-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                        placeholder="0.00"
                                        min="0"
                                        step="0.01"
                                    />
                                )}
                            </div>
                        )}
                    </div>

                    {/* Discount */}
                    {canApplyDiscount && (
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-3">{t('billing.discount')}</label>
                        <div className="flex rounded-md shadow-sm">
                            <button
                                type="button"
                                onClick={() => setDiscountType('percentage')}
                                className={`flex-1 py-2 text-sm font-medium rounded-l-lg border transition-colors ${discountType === 'percentage'
                                        ? 'bg-blue-600 text-white border-blue-600'
                                        : 'bg-white dark:bg-gray-700 text-slate-700 dark:text-gray-200 border-slate-300 dark:border-gray-600 hover:bg-slate-50 dark:hover:bg-gray-600'
                                    }`}
                            >
                                %
                            </button>
                            <button
                                type="button"
                                onClick={() => setDiscountType('fixed')}
                                className={`flex-1 py-2 text-sm font-medium rounded-r-lg border-t border-b border-r transition-colors ${discountType === 'fixed'
                                        ? 'bg-blue-600 text-white border-blue-600'
                                        : 'bg-white dark:bg-gray-700 text-slate-700 dark:text-gray-200 border-slate-300 dark:border-gray-600 hover:bg-slate-50 dark:hover:bg-gray-600'
                                    }`}
                            >
                                {settings.currencySymbol}
                            </button>
                        </div>
                        <div className="mt-3 relative">
                            <input
                                type="number"
                                value={discountValue}
                                onChange={(e) => setDiscountValue(Number(e.target.value))}
                                className="w-full px-3 py-2 pl-10 border border-slate-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                placeholder="0"
                                min="0"
                            />
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <span className="text-slate-500 font-bold sm:text-sm">
                                    {discountType === 'percentage' ? '%' : settings.currencySymbol}
                                </span>
                            </div>
                        </div>
                        </div>
                    )}

                    {/* Notes */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">{t('contacts.notes')}</label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                            placeholder="..."
                            rows={3}
                        />
                    </div>
                </div>

                <div className="p-5 border-t border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-gray-900 rounded-b-xl flex justify-between gap-4">
                    <button
                        onClick={onRemove}
                        className="px-4 py-2 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 font-medium text-sm flex items-center gap-2"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        {t('common.delete')}
                    </button>
                    <div className="flex gap-2">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 bg-white dark:bg-gray-700 border border-slate-300 dark:border-gray-600 text-slate-700 dark:text-white rounded-lg hover:bg-slate-50 dark:hover:bg-gray-600 font-medium text-sm"
                        >
                            {t('common.cancel')}
                        </button>
                        <button
                            onClick={handleSave}
                            className="px-6 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:brightness-110 font-bold text-sm shadow-md"
                        >
                            {t('common.save')}
                        </button>
                    </div>
                </div>
                <style>{`
                @keyframes fade-in {
                    from { opacity: 0; transform: scale(0.95); }
                    to { opacity: 1; transform: scale(1); }
                }
                .animate-fade-in {
                    animation: fade-in 0.2s ease-out forwards;
                }
            `}</style>
            </div>
        </div>
    );
};

export default CartItemOptionsModal;
