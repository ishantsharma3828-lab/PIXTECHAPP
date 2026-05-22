
import React, { useState, useEffect, useContext } from 'react';
import * as billingService from '../../services/billingService';
import { DraftOrder } from '../../constants/billingTypes';
import { SettingsContext } from '../../contexts/SettingsContext';

interface DraftsModalProps {
  onResume: (draft: DraftOrder) => void;
  onClose: () => void;
}

const DraftsModal: React.FC<DraftsModalProps> = ({ onResume, onClose }) => {
  const { settings, t } = useContext(SettingsContext);
  const [drafts, setDrafts] = useState<DraftOrder[]>([]);

  useEffect(() => {
    setDrafts(billingService.getDrafts());
  }, []);

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(t('common.confirm') + "?")) {
        billingService.deleteDraft(id);
        setDrafts(prev => prev.filter(d => d.id !== id));
    }
  };

  const isRightSideCurrency = settings.currencySymbol === 'DA' || settings.currencySymbol === 'DZD';
  const formatPrice = (val: number) => isRightSideCurrency ? `${val.toFixed(2)} ${settings.currencySymbol}` : `${settings.currencySymbol}${val.toFixed(2)}`;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-[200] flex items-center justify-center p-0 md:p-4 animate-fade-in backdrop-blur-sm">
        <div className="bg-white dark:bg-zinc-900 rounded-none md:rounded-xl shadow-2xl w-full h-[100dvh] md:w-[60vw] md:h-auto md:max-h-[85vh] max-w-2xl flex flex-col border-0 md:border border-slate-200 dark:border-zinc-800 overflow-hidden">
            
            <div className="p-4 md:p-6 border-b border-slate-200 dark:border-zinc-800 flex justify-between items-center bg-slate-50 dark:bg-gray-900">
                <div>
                    <h2 className="text-xl font-bold text-slate-800 dark:text-white">{t('billing.held_orders')}</h2>
                    <p className="text-sm text-slate-500 dark:text-gray-400">
                        {drafts.length} order{drafts.length !== 1 && 's'}
                    </p>
                </div>
                <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-gray-700">
                    <svg className="w-6 h-6 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-100 dark:bg-gray-950">
                {drafts.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-gray-400 opacity-60">
                        <svg className="w-20 h-20 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                        <p>{t('stock.no_orders')}</p>
                    </div>
                ) : (
                    drafts.map(draft => (
                        <div 
                            key={draft.id}
                            className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-slate-200 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:shadow-md transition-shadow"
                        >
                            <div className="flex items-center gap-4">
                                <div className="flex flex-col items-center justify-center w-16 h-16 bg-slate-100 dark:bg-gray-700 rounded-lg text-slate-600 dark:text-gray-300">
                                    <span className="text-xl font-bold">{new Date(draft.date).getHours()}:{new Date(draft.date).getMinutes().toString().padStart(2, '0')}</span>
                                    <span className="text-[10px] uppercase">{new Date(draft.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-bold text-slate-800 dark:text-white text-lg">
                                            {draft.customer ? draft.customer.name : 'Walk-in'}
                                        </h3>
                                        <span className="bg-[var(--color-primary)] text-white text-xs px-2 py-0.5 rounded-full">
                                            {draft.items.length} {t('inventory.products')}
                                        </span>
                                    </div>
                                    <p className="text-sm text-slate-500 dark:text-gray-400">
                                        Cashier: <span className="font-medium">{draft.cashierName || 'Unknown'}</span>
                                    </p>
                                    {draft.note && (
                                        <p className="text-sm text-slate-600 dark:text-gray-300 italic mt-1 bg-yellow-50 dark:bg-yellow-900/20 px-2 py-1 rounded inline-block border border-yellow-100 dark:border-yellow-800">
                                            📝 {draft.note}
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center justify-between sm:justify-end gap-6 border-t sm:border-0 border-gray-100 dark:border-zinc-800 pt-3 sm:pt-0">
                                <div className="text-right">
                                    <div className="text-xs text-slate-500 uppercase font-bold">{t('billing.total_due')}</div>
                                    <div className="text-xl font-extrabold text-[var(--color-primary)]">
                                        {formatPrice(draft.total)}
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button 
                                        onClick={(e) => handleDelete(draft.id, e)}
                                        className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                        title={t('common.delete')}
                                    >
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                    </button>
                                    <button 
                                        onClick={() => onResume(draft)}
                                        className="px-4 py-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 font-bold rounded-lg hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors flex items-center gap-2"
                                    >
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                        {t('billing.resume')}
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
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

export default DraftsModal;
