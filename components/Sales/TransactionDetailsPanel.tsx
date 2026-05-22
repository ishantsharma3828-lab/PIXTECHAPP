
import React, { useState, useContext } from 'react';
import { Sale } from '../../constants/billingTypes';
import { SettingsContext } from '../../contexts/SettingsContext';
import { usePermissions } from '../../hooks/usePermissions';

interface TransactionDetailsPanelProps {
    sale: Sale | null;
    isOpen: boolean;
    onClose: () => void;
    onReprint: () => void;
    onVoid: (reason: string) => void;
    onDelete: () => void;
    settings: any;
}

const TransactionDetailsPanel: React.FC<TransactionDetailsPanelProps> = ({ sale, isOpen, onClose, onReprint, onVoid, onDelete, settings }) => {
    const { t } = useContext(SettingsContext);
    const { canVoidSale, canDeleteSale } = usePermissions();
    const [activeTab, setActiveTab] = useState<'details' | 'audit'>('details');
    const [voidReason, setVoidReason] = useState('');
    const [showVoidConfirm, setShowVoidConfirm] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    if (!sale) return null;

    const isRightSideCurrency = settings.currencySymbol === 'DA' || settings.currencySymbol === 'DZD';
    const formatPrice = (val: number) => isRightSideCurrency ? `${val.toFixed(2)} ${settings.currencySymbol}` : `${settings.currencySymbol}${val.toFixed(2)}`;

    const handleVoidSubmit = () => {
        if (!voidReason.trim()) return;
        onVoid(voidReason);
        setShowVoidConfirm(false);
        setVoidReason('');
    };

    const handleDeleteSubmit = () => {
        onDelete();
        setShowDeleteConfirm(false);
        onClose();
    };

    const totalPaid = sale.payments.reduce((sum, p) => sum + p.amount, 0);
    const isFullyPaid = totalPaid >= (sale.total - 0.01);

    const getStatusText = () => {
        if (sale.status === 'void') return t('sales.status.void');
        if (sale.status === 'refunded') return t('sales.status.refunded');
        if (!isFullyPaid) return `PENDING (${((totalPaid / sale.total) * 100).toFixed(0)}%)`;
        return t('sales.status.completed');
    };

    const getStatusColor = () => {
        if (sale.status === 'void' || sale.status === 'refunded') return 'bg-red-100 text-red-800';
        if (!isFullyPaid) return 'bg-orange-100 text-orange-800';
        return 'bg-green-100 text-green-800';
    };

    return (
        <>
            {/* Overlay */}
            <div
                className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={onClose}
            ></div>

            {/* Panel */}
            <div className={`fixed inset-y-0 right-0 w-full max-w-md bg-white dark:bg-zinc-950 shadow-2xl z-50 transform transition-transform duration-300 flex flex-col border-l border-slate-200 dark:border-zinc-800/50 ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>

                {/* Header */}
                <div className="p-4 md:p-6 border-b border-slate-200 dark:border-zinc-800/50 flex justify-between items-start bg-slate-50 dark:bg-zinc-900/50 pt-[calc(1rem+env(safe-area-inset-top,0px))] md:pt-6">
                    <div>
                        <h2 className="text-lg md:text-xl font-bold text-slate-900 dark:text-zinc-100 leading-tight">{t('sales.details.title')}</h2>
                        <p className="text-base md:text-lg font-mono font-bold text-blue-600 dark:text-blue-400 mt-1">{sale.friendlyId || sale.id}</p>
                        <p className="text-[10px] md:text-xs text-slate-500 dark:text-zinc-500 font-mono text-ellipsis overflow-hidden w-48 whitespace-nowrap">{sale.id}</p>
                        <div className="mt-2 flex gap-1.5 md:gap-2">
                            <span className={`px-1.5 md:px-2 py-0.5 rounded text-[9px] md:text-[10px] font-black uppercase tracking-widest ${getStatusColor()}`}>
                                {getStatusText()}
                            </span>
                            <span className={`px-1.5 md:px-2 py-0.5 rounded text-[9px] md:text-[10px] font-black uppercase tracking-widest ${sale.syncStatus === 'synced' ? 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20' : 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20'}`}>
                                {t(`sales.sync.${sale.syncStatus || 'synced'}`)}
                            </span>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-1.5 md:p-2 text-slate-500 dark:text-zinc-400 hover:bg-slate-200 dark:hover:bg-zinc-800 hover:text-slate-900 dark:hover:text-white rounded-full transition-colors">
                        <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-slate-200 dark:border-zinc-800/50">
                    <button
                        onClick={() => setActiveTab('details')}
                        className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-colors ${activeTab === 'details' ? 'border-b-2 border-blue-500 text-blue-400' : 'text-slate-600 dark:text-zinc-500 hover:text-slate-900 dark:text-zinc-100'}`}
                    >
                        {t('sales.details.tab_details')}
                    </button>
                    <button
                        onClick={() => setActiveTab('audit')}
                        className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-colors ${activeTab === 'audit' ? 'border-b-2 border-blue-500 text-blue-400' : 'text-slate-600 dark:text-zinc-500 hover:text-slate-900 dark:text-zinc-100'}`}
                    >
                        {t('sales.details.tab_audit')}
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
                    {activeTab === 'details' && (
                        <div className="space-y-6">
                            {/* Summary Card */}
                            <div className="bg-slate-50 dark:bg-zinc-900/50 rounded-lg p-4 border border-slate-200 dark:border-zinc-800/50">
                                <div className="flex justify-between mb-1 text-slate-900 dark:text-zinc-100"><span>{t('billing.subtotal')}</span><span>{formatPrice(sale.subtotal)}</span></div>
                                <div className="flex justify-between mb-1 text-slate-600 dark:text-zinc-500"><span>{t('billing.tax')}</span><span>{formatPrice(sale.tax)}</span></div>
                                <div className="flex justify-between mb-3 text-slate-600 dark:text-zinc-500"><span>{t('billing.discount')}</span><span>-{formatPrice(sale.discount)}</span></div>
                                <div className="flex justify-between font-bold text-lg border-t border-slate-200 dark:border-zinc-800/50 pt-3 mt-2 text-white">
                                    <span>{t('stock.total')}</span>
                                    <span className="text-blue-400">{formatPrice(sale.total)}</span>
                                </div>
                            </div>

                            {/* Payment Info */}
                            <div>
                                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-zinc-500 mb-3">{t('sales.details.payment_breakdown')}</h3>
                                <div className="space-y-2">
                                    {sale.payments.map((p, i) => (
                                        <div key={i} className="flex justify-between text-sm p-3 bg-slate-50 dark:bg-zinc-900/30 border border-slate-200 dark:border-zinc-800/50 rounded-lg text-slate-900 dark:text-zinc-100">
                                            <span className="capitalize font-medium">{t(`billing.pay_${p.method}` as any)}</span>
                                            <span className="font-mono">{formatPrice(p.amount)}</span>
                                        </div>
                                    ))}
                                    {sale.debtDetails && (
                                        <div className="flex flex-col gap-2 text-sm p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-200/80">
                                            <div className="flex justify-between font-bold border-b border-amber-500/20 pb-2 mb-1 text-amber-400">
                                                <span>Debt Agreement</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>Total Debt:</span>
                                                <span className="font-mono font-bold text-amber-400">{formatPrice(sale.debtDetails.totalDebtAmount)}</span>
                                            </div>
                                            {sale.debtDetails.paidAmount !== undefined && (
                                                <div className="flex justify-between text-emerald-400">
                                                    <span>Paid:</span>
                                                    <span className="font-mono">{formatPrice(sale.debtDetails.paidAmount)}</span>
                                                </div>
                                            )}
                                            {sale.debtDetails.remainingAmount !== undefined && (
                                                <div className="flex justify-between text-rose-400">
                                                    <span>Remaining:</span>
                                                    <span className="font-mono">{formatPrice(sale.debtDetails.remainingAmount)}</span>
                                                </div>
                                            )}
                                            {sale.debtDetails.netPayer !== undefined && (
                                                <div className="flex justify-between font-bold pt-2 mt-1 border-t border-amber-500/20 text-amber-400">
                                                    <span>Net Payer:</span>
                                                    <span className="font-mono">{formatPrice(sale.debtDetails.netPayer)}</span>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Items List */}
                            <div>
                                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-zinc-500 mb-3">{t('sales.details.items')} ({sale.items.length})</h3>
                                <div className="divide-y divide-slate-700/50 border border-slate-200 dark:border-zinc-800/50 rounded-lg overflow-hidden bg-slate-50 dark:bg-zinc-900/30">
                                    {sale.items.map((item, i) => (
                                        <div key={i} className="p-3 flex justify-between text-sm hover:bg-slate-50 dark:bg-zinc-900/50 transition-colors">
                                            <div>
                                                <div className="font-medium text-slate-200">{item.name}</div>
                                                <div className="text-xs text-slate-600 dark:text-zinc-500 mt-0.5 font-mono">{item.quantity} x {formatPrice(item.unitPrice)}</div>
                                            </div>
                                            <div className="font-medium text-slate-900 dark:text-zinc-100 font-mono flex items-center">
                                                {formatPrice((item.unitPrice * item.quantity) - item.discountValue)}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'audit' && (
                        <div className="relative border-l-2 border-slate-200 dark:border-zinc-800/50 ml-3 space-y-8 py-4">
                            {sale.auditLog?.map((log, i) => (
                                <div key={i} className="ml-6 relative">
                                    <div className="absolute -left-[31px] bg-white dark:bg-zinc-950 border-2 border-blue-500 w-4 h-4 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.5)]"></div>
                                    <p className="text-xs text-slate-600 dark:text-zinc-500 font-mono mb-1">{new Date(log.timestamp).toLocaleString()}</p>
                                    <p className="font-bold text-sm text-slate-800 dark:text-slate-200 capitalize">{log.action}</p>
                                    <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">User: <span className="text-slate-900 dark:text-zinc-100">{log.user}</span></p>
                                    {log.details && <p className="text-xs italic bg-slate-50 dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800/50 text-slate-500 dark:text-zinc-400 p-3 rounded-lg mt-2">{log.details}</p>}
                                </div>
                            ))}
                            <div className="ml-6 relative">
                                <div className="absolute -left-[31px] bg-emerald-500 w-4 h-4 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
                                <p className="font-bold text-sm text-slate-800 dark:text-slate-200">Transaction Created</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="p-4 border-t border-slate-200 dark:border-zinc-800/50 bg-slate-50 dark:bg-zinc-900/50">
                    <div className={`grid gap-3 mb-3 ${canVoidSale ? 'grid-cols-2' : 'grid-cols-1'}`}>
                        <button
                            onClick={onReprint}
                            className="flex items-center justify-center gap-2 px-4 py-3 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800/50 rounded-lg shadow-sm hover:bg-slate-100 dark:hover:bg-zinc-800 hover:text-slate-900 dark:hover:text-white text-slate-900 dark:text-zinc-100 font-bold transition-colors"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                            {t('sales.action.reprint')}
                        </button>
                        {canVoidSale && (
                            sale.status !== 'void' ? (
                                <button
                                    onClick={() => setShowVoidConfirm(true)}
                                    className="flex items-center justify-center gap-2 px-4 py-3 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-lg hover:bg-amber-500/20 font-bold transition-colors"
                                >
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                                    {t('sales.action.void')}
                                </button>
                            ) : (
                                <div className="flex items-center justify-center text-rose-500 font-bold">{t('sales.status.void').toUpperCase()}</div>
                            )
                        )}
                    </div>

                    {canDeleteSale && (
                        <button
                            onClick={() => setShowDeleteConfirm(true)}
                            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-lg hover:bg-rose-500/20 font-bold transition-colors"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            Delete Invoice
                        </button>
                    )}
                </div>

                {/* Void Confirmation Overlay */}
                {showVoidConfirm && (
                    <div className="absolute inset-0 bg-white dark:bg-zinc-950/95 backdrop-blur-sm z-50 p-6 flex flex-col justify-center animate-fade-in">
                        <h3 className="text-xl font-bold text-amber-400 mb-2">{t('sales.action.confirm_void')}</h3>
                        <p className="text-sm text-slate-500 dark:text-zinc-400 mb-4">{t('sales.void_warning')}</p>
                        <textarea
                            value={voidReason}
                            onChange={(e) => setVoidReason(e.target.value)}
                            placeholder={t('sales.void_reason')}
                            className="w-full p-3 border rounded-lg mb-4 bg-slate-50 dark:bg-zinc-900/50 border-slate-200 dark:border-zinc-800/50 text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 placeholder-slate-500"
                            rows={3}
                        />
                        <div className="flex gap-3">
                            <button onClick={() => setShowVoidConfirm(false)} className="flex-1 py-3 border border-slate-200 dark:border-zinc-800/50 text-slate-900 dark:text-zinc-100 rounded-lg hover:bg-slate-50 dark:bg-zinc-900 transition-colors font-bold">{t('common.cancel')}</button>
                            <button onClick={handleVoidSubmit} disabled={!voidReason} className="flex-1 py-3 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-lg disabled:opacity-50 hover:bg-amber-500/30 transition-colors font-bold">{t('sales.action.confirm_void')}</button>
                        </div>
                    </div>
                )}

                {/* Delete Confirmation Overlay */}
                {showDeleteConfirm && (
                    <div className="absolute inset-0 bg-white dark:bg-zinc-950/95 backdrop-blur-sm z-50 p-6 flex flex-col justify-center animate-fade-in">
                        <div className="text-center mb-6">
                            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-rose-500/10 border border-rose-500/20 mb-4">
                                <svg className="h-8 w-8 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">Delete Invoice Permanently?</h3>
                            <p className="mt-2 text-sm text-slate-500 dark:text-zinc-400">
                                Are you sure you want to delete invoice <b className="text-slate-800 dark:text-slate-200">{sale.friendlyId || sale.id}</b>? This action cannot be undone.
                            </p>
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 py-3 border border-slate-200 dark:border-zinc-800/50 text-slate-900 dark:text-zinc-100 rounded-lg hover:bg-slate-50 dark:bg-zinc-900 transition-colors font-bold">{t('common.cancel')}</button>
                            <button onClick={handleDeleteSubmit} className="flex-1 py-3 bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-lg hover:bg-rose-500/30 transition-colors font-bold">Delete</button>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
};

export default TransactionDetailsPanel;
