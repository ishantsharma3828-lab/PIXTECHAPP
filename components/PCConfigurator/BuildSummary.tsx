
import React, { useContext, useState } from 'react';
import { PCBuild } from '../../services/pcBuilderService';
import { SettingsContext } from '../../contexts/SettingsContext';
import { Customer } from '../../constants/billingTypes';
import CustomerSelectionModal from '../Billing/CustomerSelectionModal';
import { getCurrentUser } from '../../services/authService';
import { usePermissions } from '../../hooks/usePermissions';

interface BuildSummaryProps {
    build: PCBuild;
    onUpdateBuild: (updates: Partial<PCBuild>) => void;
    onSave: () => void;
    onSendToBilling: () => void;
    onClear: () => void;
    onPrint: () => void;
    isStorefront?: boolean;
}

const BuildSummary: React.FC<BuildSummaryProps> = ({ build, onUpdateBuild, onSave, onSendToBilling, onClear, onPrint, isStorefront }) => {
    const { settings, t } = useContext(SettingsContext);
    const [isCustomerModalOpen, setCustomerModalOpen] = useState(false);
    const [isMobileExpanded, setIsMobileExpanded] = useState(false);

    // RBAC via centralised hook
    const user = getCurrentUser();
    const { isManager, isCustomer: isCustomerRole, selectablePriceTiers } = usePermissions();
    const role = user?.role || 'customer';
    // Only managers can set custom assembly fees
    const canEditAssemblyFee = isManager;
    const canSendToBilling = !isCustomerRole || isStorefront;

    // Price tier options filtered to what this user can access
    const priceOptions: { value: string; label: string }[] = [
        { value: 'price1', label: t('inventory.col.price1') },
        { value: 'price2', label: t('inventory.col.price2') },
        { value: 'price3', label: t('inventory.col.price3') },
        { value: 'price4', label: t('inventory.col.price4') },
    ].filter(opt => {
        const tierNum = parseInt(opt.value.replace('price', ''));
        return selectablePriceTiers.includes(tierNum);
    });

    const isRightSideCurrency = settings.currencySymbol === 'DA' || settings.currencySymbol === 'DZD';
    const formatPrice = (val: number) => isRightSideCurrency ? `${val.toFixed(2)} ${settings.currencySymbol}` : `${settings.currencySymbol}${val.toFixed(2)}`;

    const partsTotal = build.parts.reduce((sum, p) => sum + (p[build.priceTier || 'price1'] || 0), 0);
    const total = partsTotal + build.assemblyFee;

    const handleCustomerSelect = (customer: Customer) => {
        onUpdateBuild({ customerName: customer.name });
    };

    return (
        <>
            {/* Mobile Collapsed Footer */}
            <div className="lg:hidden w-full bg-white dark:bg-gray-800 border-t border-slate-200 dark:border-zinc-800 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] flex justify-between items-center shadow-[0_-4px_10px_rgba(0,0,0,0.05)] z-20">
                <div className="flex flex-col">
                    <span className="text-[10px] uppercase font-bold text-slate-500">Total Price</span>
                    <span className="text-lg font-black text-[var(--color-primary)] leading-none">{formatPrice(total)}</span>
                </div>
                <button 
                    onClick={() => setIsMobileExpanded(true)}
                    className="px-4 py-2 bg-[var(--color-primary)] text-white text-sm font-bold rounded-lg shadow-md"
                >
                    Review & Save
                </button>
            </div>

            {/* Main Panel (Hidden on mobile unless expanded) */}
            <div className={`w-full lg:w-auto bg-white dark:bg-gray-800 border-l border-slate-200 dark:border-zinc-800 flex flex-col h-full shadow-xl z-30 lg:z-20 ${isMobileExpanded ? 'fixed inset-0 pt-safe lg:pt-0 lg:static' : 'hidden lg:flex'}`}>
                <div className="p-4 lg:p-6 flex-1 overflow-y-auto">
                    <div className="flex justify-between items-center mb-4 lg:mb-6">
                        <h2 className="text-lg lg:text-xl font-bold text-slate-800 dark:text-white">{t('pc.build_summary')}</h2>
                        {isMobileExpanded && (
                            <button onClick={() => setIsMobileExpanded(false)} className="lg:hidden p-2 text-slate-500 hover:bg-slate-200 dark:hover:bg-gray-700 rounded-lg shrink-0">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        )}
                    </div>

                {/* Build Name */}
                <div className="mb-4">
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t('pc.build_name')}</label>
                    <input
                        type="text"
                        value={build.name}
                        onChange={(e) => onUpdateBuild({ name: e.target.value })}
                        className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        placeholder="e.g. Gaming Beast X1"
                    />
                </div>

                {/* Customer */}
                <div className="mb-6">
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t('pc.customer')}</label>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={build.customerName || ''}
                            onChange={(e) => onUpdateBuild({ customerName: e.target.value })}
                            className={`flex-1 p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white ${isCustomerRole ? 'opacity-70 cursor-not-allowed' : ''}`}
                            placeholder="Walk-in / Guest"
                            disabled={isCustomerRole}
                        />
                        {!isCustomerRole && (
                            <button
                                onClick={() => setCustomerModalOpen(true)}
                                className="px-3 bg-slate-200 dark:bg-gray-700 hover:bg-slate-300 rounded-md text-slate-600 dark:text-gray-300"
                            >
                                🔍
                            </button>
                        )}
                    </div>
                </div>

                {/* Price Tier Selection (Dynamic based on permissions) */}
                {priceOptions.length > 1 && (
                    <div className="mb-6">
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t('inventory.col.price')}</label>
                        <select
                            value={build.priceTier || 'price1'}
                            onChange={(e) => onUpdateBuild({ priceTier: e.target.value as any })}
                            className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        >
                            {priceOptions.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                    </div>
                )}

                <hr className="border-slate-200 dark:border-zinc-800 my-4" />

                {/* Financials */}
                <div className="space-y-3 text-sm">
                    <div className="flex justify-between text-slate-600 dark:text-gray-400">
                        <span>{t('pc.components')} ({build.parts.length})</span>
                        <span>{formatPrice(partsTotal)}</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-600 dark:text-gray-400">
                        <span>{t('pc.assembly_fee')}</span>
                        {canEditAssemblyFee ? (
                            <div className="flex items-center gap-1">
                                <span className="text-xs text-gray-400">{settings.currencySymbol}</span>
                                <input
                                    type="number"
                                    value={build.assemblyFee}
                                    onChange={(e) => onUpdateBuild({ assemblyFee: Number(e.target.value) })}
                                    className="w-16 p-1 text-right border rounded dark:bg-gray-700 dark:border-gray-600"
                                />
                            </div>
                        ) : (
                            <span>{formatPrice(build.assemblyFee)}</span>
                        )}
                    </div>
                    <div className="flex justify-between font-bold text-lg text-slate-800 dark:text-white pt-2 border-t border-gray-100 dark:border-zinc-800">
                        <span>{t('pc.total')}</span>
                        <span className="text-[var(--color-primary)]">{formatPrice(total)}</span>
                    </div>
                </div>

                {/* Notes */}
                <div className="mt-6">
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t('pc.notes')}</label>
                    <textarea
                        value={build.notes}
                        onChange={(e) => onUpdateBuild({ notes: e.target.value })}
                        className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white h-24 text-sm resize-none"
                        placeholder="Internal notes, warranty details..."
                    />
                </div>
            </div>

            {/* Actions */}
            <div className="p-4 pb-[calc(5rem+env(safe-area-inset-bottom,0px))] lg:pb-4 bg-slate-50 dark:bg-gray-900 border-t border-slate-200 dark:border-zinc-800">
                <div className="space-y-3">
                    {/* CUSTOMER: Send to Billing (Order) */}
                    {role === 'customer' ? (
                        <button
                            onClick={onSendToBilling}
                            className="w-full py-4 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg shadow-lg flex items-center justify-center gap-2 transition-transform hover:scale-[1.02]"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                            {isStorefront ? 'Add to Cart' : t('pc.send_to_billing')}
                        </button>
                    ) : (
                        /* STAFF: Save Template */
                        <button
                            onClick={onSave}
                            className="w-full py-3 bg-[var(--color-primary)] hover:brightness-110 text-white font-bold rounded-lg shadow-md flex items-center justify-center gap-2"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>
                            {t('pc.save_template')}
                        </button>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                        <button
                            onClick={onPrint}
                            className="py-3 bg-slate-200 dark:bg-gray-700 text-slate-800 dark:text-white font-bold rounded-lg hover:bg-slate-300 dark:hover:bg-gray-600 flex items-center justify-center gap-2"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                            {t('common.print')}
                        </button>
                        <button
                            onClick={onClear}
                            className="py-3 bg-red-100 text-red-600 font-bold rounded-lg hover:bg-red-200 flex items-center justify-center gap-2"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            {t('common.clear')}
                        </button>
                    </div>

                    {/* Restricted Staff Option: Send to Billing */}
                    {role !== 'customer' && (
                        <button
                            onClick={onSendToBilling}
                            className="w-full py-3 border border-blue-500 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 font-bold rounded-lg flex items-center justify-center gap-2 text-sm"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                            {t('pc.send_to_billing')}
                        </button>
                    )}
                </div>
            </div>
            </div>

            {isCustomerModalOpen && (
                <CustomerSelectionModal
                    onSelect={handleCustomerSelect}
                    onClose={() => setCustomerModalOpen(false)}
                />
            )}
        </>
    );
};

export default BuildSummary;
