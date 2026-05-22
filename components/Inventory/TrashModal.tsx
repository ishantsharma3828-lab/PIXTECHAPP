
import React, { useState, useEffect, useCallback, useMemo, useContext } from 'react';
import * as inventoryService from '../../services/inventoryService';
import { Product } from '../../constants/inventoryFields';
import { SettingsContext } from '../../contexts/SettingsContext';

interface TrashModalProps {
  onClose: () => void;
  onDataChange: () => void;
}

const TrashModal: React.FC<TrashModalProps> = ({ onClose, onDataChange }) => {
  const { t } = useContext(SettingsContext);
  const [trashedItems, setTrashedItems] = useState<Product[]>([]);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [idsToDelete, setIdsToDelete] = useState<string[]>([]);

  const fetchTrashedItems = useCallback(async () => {
    setIsLoading(true);
    const items = await inventoryService.getTrashedProducts();
    setTrashedItems(items);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchTrashedItems();
  }, [fetchTrashedItems]);
  
  const handleSelectItem = (id: string) => {
    setSelectedItems(prev => {
        const newSelected = new Set(prev);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        return newSelected;
    });
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
        setSelectedItems(new Set(trashedItems.map(item => item.id)));
    } else {
        setSelectedItems(new Set());
    }
  };

  const handleRestore = async (ids: string[]) => {
    await inventoryService.restoreProductsFromTrash(ids);
    setSelectedItems(new Set());
    await fetchTrashedItems();
    onDataChange(); // Refresh main inventory list
  };

  const initiatePermanentDelete = (ids: string[]) => {
    if (ids.length === 0) return;
    setIdsToDelete(ids);
    setShowDeleteConfirm(true);
  };

  const executePermanentDelete = async () => {
    if (idsToDelete.length > 0) {
      await inventoryService.permanentlyDeleteProducts(idsToDelete);
      setSelectedItems(new Set());
      await fetchTrashedItems();
    }
    setShowDeleteConfirm(false);
    setIdsToDelete([]);
  };

  const isAllSelected = useMemo(() => {
    return trashedItems.length > 0 && selectedItems.size === trashedItems.length;
  }, [selectedItems, trashedItems]);
  
  const renderConfirmationModal = () => (
    <div className="absolute inset-0 bg-black/50 dark:bg-zinc-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
        <div className="bg-white dark:bg-zinc-950 rounded-2xl shadow-2xl p-6 max-w-sm w-full border border-slate-200 dark:border-zinc-800">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">{t('common.confirm')}</h3>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                Are you sure you want to permanently delete {idsToDelete.length} item(s)? This action cannot be undone.
            </p>
            <div className="mt-6 flex justify-end gap-3">
                <button 
                    onClick={() => setShowDeleteConfirm(false)}
                    className="px-4 py-2 bg-slate-100 dark:bg-zinc-900 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors font-bold text-sm border border-slate-200 dark:border-zinc-800"
                >
                    {t('common.cancel')}
                </button>
                <button 
                    onClick={executePermanentDelete}
                    className="px-4 py-2 bg-rose-600 text-white rounded-xl hover:bg-rose-500 transition-colors font-bold text-sm shadow-sm shadow-rose-900/20"
                >
                    {t('inventory.delete_perm')}
                </button>
            </div>
        </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-zinc-950/90 z-50 flex items-center justify-center p-0 md:p-4 backdrop-blur-sm dark:backdrop-blur-xl animate-fade-in">
      <div className="bg-white dark:bg-zinc-950 rounded-none md:rounded-[2.5rem] shadow-2xl w-full h-[100dvh] md:w-[60vw] md:h-auto max-w-4xl md:max-h-[85vh] flex flex-col relative overflow-hidden border-0 md:border border-slate-200 dark:border-zinc-800">
        <header className="px-4 py-3 sm:px-6 sm:py-5 border-b border-slate-200 dark:border-zinc-800/60 flex justify-between items-center bg-slate-50/80 dark:bg-zinc-950/80 sticky top-0 z-30 backdrop-blur-md">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-rose-50 dark:bg-rose-600/10 flex items-center justify-center text-rose-600 dark:text-rose-500 border border-rose-100 dark:border-rose-500/20">
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-50 tracking-tight">{t('inventory.trash')}</h2>
              <p className="text-[9px] sm:text-[10px] font-medium text-slate-800 dark:text-gray-300 uppercase tracking-widest">Deleted Products</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 active:scale-90 rounded-full text-gray-400 dark:text-slate-400 transition-all">
            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </header>
        
        <div className="px-4 py-3 sm:px-6 sm:py-4 bg-slate-50/50 dark:bg-zinc-950/30 border-b border-slate-200 dark:border-zinc-800/40 flex-shrink-0">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-zinc-950 rounded-xl border border-slate-200 dark:border-zinc-800">
                        <input 
                            type="checkbox" 
                            onChange={handleSelectAll} 
                            checked={isAllSelected} 
                            className="w-4 h-4 rounded border-slate-300 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-blue-600 dark:text-blue-500 focus:ring-blue-500 focus:ring-offset-white dark:focus:ring-offset-slate-900" 
                        />
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-500">Select All</span>
                    </div>
                    <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                        {selectedItems.size} {t('inventory.of')} {trashedItems.length} {t('common.selected').toLowerCase()}
                    </p>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                    <button 
                        onClick={() => handleRestore(Array.from(selectedItems))}
                        disabled={selectedItems.size === 0}
                        className="flex-1 sm:flex-none px-6 py-2.5 text-[10px] font-black uppercase tracking-widest text-white bg-blue-600 rounded-xl disabled:opacity-20 disabled:cursor-not-allowed hover:bg-blue-500 transition-all shadow-lg shadow-blue-600/20 active:scale-95"
                    >
                        {t('inventory.restore')}
                    </button>
                    <button 
                        onClick={() => initiatePermanentDelete(Array.from(selectedItems))}
                        disabled={selectedItems.size === 0}
                        className="flex-1 sm:flex-none px-6 py-2.5 text-[10px] font-black uppercase tracking-widest text-white bg-rose-600 rounded-xl disabled:opacity-20 disabled:cursor-not-allowed hover:bg-rose-500 transition-all shadow-lg shadow-rose-600/20 active:scale-95"
                    >
                        {t('inventory.delete_perm')}
                    </button>
                </div>
            </div>
        </div>

        <main className="flex-grow overflow-y-auto custom-scrollbar bg-slate-50/30 dark:bg-transparent">
            {isLoading ? (
                <div className="flex flex-col items-center justify-center h-full py-20">
                    <div className="w-12 h-12 border-4 border-slate-200 dark:border-zinc-800 border-t-blue-600 dark:border-t-blue-500 rounded-full animate-spin mb-4"></div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-500">Loading Trash...</p>
                </div>
            ) : trashedItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full py-20 text-slate-500 dark:text-slate-500">
                    <div className="w-20 h-20 bg-slate-100 dark:bg-zinc-950 rounded-[2rem] flex items-center justify-center mb-6 border border-slate-200 dark:border-zinc-800/50">
                        <svg className="w-10 h-10 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Trash is empty</p>
                </div>
            ) : (
                <div className="min-w-full inline-block align-middle">
                    <div className="overflow-hidden">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-800/50">
                            <thead className="bg-slate-50 dark:bg-zinc-950/50 sticky top-0 z-10">
                                <tr>
                                    <th scope="col" className="w-12 px-6 py-4"></th>
                                    <th scope="col" className="px-6 py-4 text-left text-[10px] font-black text-slate-800 dark:text-gray-300 uppercase tracking-widest">{t('inventory.col.name')}</th>
                                    <th scope="col" className="px-6 py-4 text-left text-[10px] font-black text-slate-800 dark:text-gray-300 uppercase tracking-widest hidden sm:table-cell">{t('inventory.col.category')}</th>
                                    <th scope="col" className="px-6 py-4 text-left text-[10px] font-black text-slate-800 dark:text-gray-300 uppercase tracking-widest">Deleted At</th>
                                    <th scope="col" className="px-6 py-4 text-right text-[10px] font-black text-slate-800 dark:text-gray-300 uppercase tracking-widest">{t('common.actions')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-slate-800/30">
                                {trashedItems.map(item => (
                                    <tr 
                                        key={item.id} 
                                        onClick={() => handleSelectItem(item.id)}
                                        className={`group transition-all cursor-pointer ${selectedItems.has(item.id) ? 'bg-blue-50 dark:bg-blue-500/5' : 'hover:bg-slate-50 dark:hover:bg-slate-800/30'}`}
                                    >
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <input 
                                                type="checkbox" 
                                                checked={selectedItems.has(item.id)} 
                                                onChange={(e) => { e.stopPropagation(); handleSelectItem(item.id); }} 
                                                className="w-4 h-4 rounded border-slate-300 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-blue-600 dark:text-blue-500 focus:ring-blue-500 focus:ring-offset-white dark:focus:ring-offset-slate-900" 
                                            />
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex flex-col">
                                                <span className="text-xs font-bold text-slate-900 dark:text-slate-200">{item.name}</span>
                                                <span className="text-[9px] font-medium text-slate-500 dark:text-slate-500 uppercase tracking-wider sm:hidden">{item.category}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap hidden sm:table-cell">
                                            <span className="text-[10px] font-black text-slate-800 dark:text-gray-300 uppercase tracking-widest bg-slate-100 dark:bg-zinc-950 px-2 py-1 rounded-lg border border-slate-200 dark:border-zinc-800">
                                                {item.category}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300">{item.deletedAt ? new Date(item.deletedAt).toLocaleDateString() : 'N/A'}</span>
                                                <span className="text-[9px] font-medium text-slate-500 dark:text-slate-500">{item.deletedAt ? new Date(item.deletedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right">
                                            <div className="flex justify-end gap-1">
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); handleRestore([item.id]); }} 
                                                    className="p-2 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-500/10 text-slate-500 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 transition-all"
                                                    title={t('inventory.restore')}
                                                >
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                                                </button>
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); initiatePermanentDelete([item.id]); }} 
                                                    className="p-2 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-500/10 text-slate-500 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-500 transition-all"
                                                    title={t('common.delete')}
                                                >
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </main>

        <footer className="px-6 py-5 border-t border-slate-200 dark:border-zinc-800/60 bg-slate-50/80 dark:bg-zinc-950/80 flex justify-end flex-shrink-0">
          <button onClick={onClose} className="px-8 py-3 bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-2xl transition-all active:scale-95">
            {t('common.close')}
          </button>
        </footer>

        {showDeleteConfirm && renderConfirmationModal()}
        
        <style>{`
            .custom-scrollbar::-webkit-scrollbar { width: 5px; }
            .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
            .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
            .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
            .dark .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; }
            .dark .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #475569; }
            
            @keyframes fade-in {
                from { opacity: 0; transform: scale(0.95); }
                to { opacity: 1; transform: scale(1); }
            }
            .animate-fade-in {
                animation: fade-in 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
            }
        `}</style>
      </div>
    </div>
  );
};

export default TrashModal;
