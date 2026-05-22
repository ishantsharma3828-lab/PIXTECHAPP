
import React, { useContext } from 'react';
import { SettingsContext } from '../../contexts/SettingsContext';

interface SelectionBarProps {
  count: number;
  onBatchEdit: () => void;
  onMoveToTrash: () => void;
  onClearSelection: () => void;
  onPrintLabels?: () => void;
  canBulkEdit?: boolean;
  canBulkDelete?: boolean;
}

const SelectionBar: React.FC<SelectionBarProps> = ({
  count,
  onBatchEdit,
  onMoveToTrash,
  onClearSelection,
  onPrintLabels,
  canBulkEdit = true,
  canBulkDelete = true
}) => {
  const { t } = useContext(SettingsContext);
  return (
    <div className="fixed bottom-24 md:bottom-8 left-0 right-0 z-40 flex justify-center px-4 pointer-events-none" role="toolbar" aria-label="Batch actions">
        <div className="flex items-center justify-between gap-2 sm:gap-6 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-2xl border border-slate-200 dark:border-zinc-800 text-slate-800 dark:text-gray-100 rounded-[2rem] shadow-[0_25px_50px_-12px_rgba(0,0,0,0.15)] dark:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.7)] px-4 sm:px-6 py-3 animate-slide-up w-full max-w-lg pointer-events-auto">
            <div className="flex items-center gap-3 pl-1">
                <div className="w-10 h-10 rounded-2xl bg-blue-600 flex items-center justify-center text-white font-black text-xs shadow-lg shadow-blue-600/30 border border-blue-400/20">
                    {count}
                </div>
                <div className="flex flex-col hidden sm:flex">
                    <span className="font-black text-[10px] uppercase tracking-[0.2em] text-blue-600 dark:text-blue-400 leading-none mb-0.5">
                        {t('common.selected')}
                    </span>
                    <span className="font-bold text-xs text-slate-600 dark:text-gray-300 leading-none">
                        Items
                    </span>
                </div>
            </div>
            
            <div className="h-10 w-px bg-slate-200 dark:bg-zinc-900 mx-1 hidden sm:block" aria-hidden="true"></div>
            
            <div className="flex items-center gap-1 sm:gap-2">
                {canBulkEdit && (
                    <button 
                        onClick={onBatchEdit} 
                        title={t('inventory.batch_edit')} 
                        className="p-3 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-gray-400 hover:text-amber-500 dark:hover:text-amber-400 transition-all active:scale-90 group bg-slate-50 sm:bg-transparent dark:bg-zinc-950/50 dark:sm:bg-transparent"
                    >
                        <svg className="w-5 h-5 transition-transform group-hover:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                    </button>
                )}
                
                {onPrintLabels && (
                    <button 
                        onClick={onPrintLabels} 
                        title={t('common.print')} 
                        className="p-3 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-all active:scale-90 group bg-slate-50 sm:bg-transparent dark:bg-zinc-950/50 dark:sm:bg-transparent"
                    >
                        <svg className="w-5 h-5 transition-transform group-hover:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                    </button>
                )}
                
                {canBulkDelete && (
                    <button 
                        onClick={onMoveToTrash} 
                        title={t('inventory.trash')} 
                        className="p-3 rounded-2xl hover:bg-rose-50 dark:hover:bg-rose-500/10 text-slate-500 dark:text-gray-400 hover:text-rose-600 dark:hover:text-rose-500 transition-all active:scale-90 group bg-slate-50 sm:bg-transparent dark:bg-zinc-950/50 dark:sm:bg-transparent"
                    >
                        <svg className="w-5 h-5 transition-transform group-hover:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                )}
            </div>
            
            <div className="h-10 w-px bg-slate-200 dark:bg-zinc-900 mx-1" aria-hidden="true"></div>
            
            <button 
                onClick={onClearSelection} 
                title={t('common.clear')} 
                className="p-3 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800 text-gray-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-gray-200 transition-all active:scale-90 group"
            >
                <svg className="w-5 h-5 transition-transform group-hover:rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
        </div>
        <style>{`
            @keyframes slide-up {
                from { transform: translateY(100%); opacity: 0; }
                to { transform: translateY(0); opacity: 1; }
            }
            .animate-slide-up {
                animation: slide-up 0.3s ease-out forwards;
            }
        `}</style>
    </div>
  );
};

export default SelectionBar;
