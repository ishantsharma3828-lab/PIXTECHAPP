
import React, { useState, useContext } from 'react';
import * as inventoryService from '../../services/inventoryService';
import { BatchUpdates, PriceAdjustment } from '../../services/inventoryService';
import { SettingsContext } from '../../contexts/SettingsContext';

interface BatchEditModalProps {
  selectedIds: string[];
  uniqueCategories: string[];
  uniqueBrands: string[];
  onClose: () => void;
  onSave: (result: { successCount: number; failureCount: number }) => void;
}

interface FieldWrapperProps {
    field: string;
    label: string;
    isEnabled: boolean;
    onToggle: (field: string) => void;
    children: React.ReactNode;
}

// Move FieldWrapper outside to prevent re-renders losing focus
const FieldWrapper: React.FC<FieldWrapperProps> = ({field, label, isEnabled, onToggle, children}) => (
    <div className={`p-4 sm:p-5 rounded-2xl transition-all border ${isEnabled ? 'bg-blue-50 dark:bg-blue-500/5 border-blue-200 dark:border-blue-500/20' : 'bg-slate-50 dark:bg-zinc-950/50 border-slate-200 dark:border-zinc-800'}`}>
        <label className="flex items-center space-x-3 mb-3 cursor-pointer group">
            <input 
                type="checkbox" 
                checked={isEnabled} 
                onChange={() => onToggle(field)} 
                className="h-4 w-4 rounded border-slate-300 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-blue-600 dark:text-blue-500 focus:ring-blue-500 focus:ring-offset-white dark:focus:ring-offset-slate-900 transition-colors" 
            />
            <span className={`font-bold text-sm tracking-tight transition-colors ${isEnabled ? 'text-blue-700 dark:text-blue-400' : 'text-slate-600 dark:text-gray-300 group-hover:text-slate-800 dark:group-hover:text-gray-200'}`}>{label}</span>
        </label>
        <div className={`transition-all duration-300 ${isEnabled ? 'opacity-100 translate-y-0' : 'opacity-50 pointer-events-none -translate-y-1'}`}>
            {children}
        </div>
    </div>
);

const BatchEditModal: React.FC<BatchEditModalProps> = ({
  selectedIds,
  uniqueCategories,
  uniqueBrands,
  onClose,
  onSave,
}) => {
  const { settings, t } = useContext(SettingsContext);
  const [enabledFields, setEnabledFields] = useState<Set<string>>(new Set());
  const [updates, setUpdates] = useState<BatchUpdates>({});
  const [isSaving, setIsSaving] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [stopError, setStopError] = useState<string | null>(null);
  
  // Progress State
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);

  const isRightSideCurrency = settings.currencySymbol === 'DA' || settings.currencySymbol === 'DZD';

  const handleToggleField = (field: string) => {
    setEnabledFields(prev => {
      const newSet = new Set(prev);
      if (newSet.has(field)) {
        newSet.delete(field);
      } else {
        newSet.add(field);
      }
      return newSet;
    });
  };

  const handleUpdateChange = (field: keyof BatchUpdates, value: any) => {
    setUpdates(prev => ({ ...prev, [field]: value }));
  };
  
  const handlePriceAdjustmentChange = (field: keyof PriceAdjustment, value: any) => {
      setUpdates(prev => {
          const defaults: PriceAdjustment = { type: 'percentage_increase', value: 0 };
          const current = prev.price1 || defaults;
          
          const updated = { ...current, [field]: value };
          if (field === 'value') {
              updated.value = Number(value);
          }
          
          return { ...prev, price1: updated };
      });
  }

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          setImageFile(e.target.files[0]);
      }
  }

  const handleApply = async () => {
    if (enabledFields.size === 0) return;
    setShowConfirm(true);
  };

  const executeApply = async () => {
    setIsSaving(true);
    setStopError(null);
    
    // Initialize progress if AI is involved
    if (enabledFields.has('autoFillAI') || enabledFields.has('generateDescAI')) {
        setProgress({ current: 0, total: selectedIds.length });
    }

    const finalUpdates: BatchUpdates = {};
    enabledFields.forEach(field => {
        if (field === 'addImages' && imageFile) {
            finalUpdates.addImages = imageFile;
        } else if (field === 'removeImages') {
            finalUpdates.removeImages = true;
        } else if (field === 'autoFillAI') {
            finalUpdates.autoFillAI = true;
        } else if (field === 'generateDescAI') {
            finalUpdates.generateDescAI = true;
        } else if(field !== 'addImages') {
             (finalUpdates as any)[field as keyof BatchUpdates] = (updates as any)[field as keyof BatchUpdates];
        }
    });

    try {
        const result = await inventoryService.batchUpdateProducts(
            selectedIds, 
            finalUpdates,
            (current, total) => setProgress({ current, total })
        );
        
        if (result.stopped) {
            setStopError(`Process stopped early: AI Usage Limit Reached. ${result.successCount} items processed.`);
            // Don't close, show error
        } else {
            onSave(result);
            onClose();
        }
    } catch (err) {
        console.error("Batch update failed", err);
        setStopError("An unexpected error occurred.");
    } finally {
        setIsSaving(false);
        setProgress(null);
    }
  };

  const renderProgressOverlay = () => {
      if (!progress) return null;
      const pct = Math.round((progress.current / progress.total) * 100);
      
      return (
        <div className="absolute inset-0 bg-white/95 dark:bg-zinc-950/95 z-20 flex flex-col items-center justify-center p-8 text-center animate-fade-in rounded-lg">
            <div className="relative w-32 h-32 mb-6">
                <svg className="w-full h-full transform -rotate-90">
                    <circle cx="64" cy="64" r="56" fill="none" stroke="#e5e7eb" strokeWidth="12" className="dark:stroke-gray-800"/>
                    <circle 
                        cx="64" cy="64" r="56" 
                        fill="none" 
                        stroke="var(--color-primary, #3b82f6)" 
                        strokeWidth="12" 
                        strokeDasharray="351.86" 
                        strokeDashoffset={351.86 - (351.86 * pct / 100)}
                        className="transition-all duration-300 ease-out"
                        strokeLinecap="round"
                    />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center flex-col">
                    <span className="text-3xl font-bold text-slate-800 dark:text-white">{pct}%</span>
                </div>
            </div>
            <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">{t('batch.processing')}</h3>
            <p className="text-slate-500 dark:text-gray-400">
                Updating item {progress.current} of {progress.total}
            </p>
            <p className="text-xs text-orange-600 dark:text-orange-500 mt-4 animate-pulse">
                Process is throttled to prevent quota errors. Please wait...
            </p>
        </div>
      );
  }

  const renderConfirmationModal = () => (
    <div className="absolute inset-0 bg-gray-900/50 dark:bg-zinc-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
        <div className="bg-white dark:bg-zinc-950 rounded-2xl shadow-2xl p-6 max-w-sm w-full border border-slate-200 dark:border-zinc-800">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">{t('common.confirm')}</h3>
            <p className="mt-2 text-sm text-slate-600 dark:text-gray-400 leading-relaxed">
                You are about to modify <strong>{selectedIds.length}</strong> product(s). {t('batch.warn_undo')}
                {enabledFields.has('autoFillAI') || enabledFields.has('generateDescAI') ? 
                " AI operations will take approximately " + Math.ceil(selectedIds.length * 5 / 60) + " minutes to process safely." : ""}
                Are you sure you want to proceed?
            </p>
            <div className="mt-6 flex justify-end gap-3">
                <button onClick={() => setShowConfirm(false)} className="px-4 py-2 bg-slate-100 dark:bg-zinc-900 text-slate-700 dark:text-gray-300 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors font-bold text-sm border border-slate-200 dark:border-zinc-800">{t('common.cancel')}</button>
                <button onClick={executeApply} className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-500 transition-colors font-bold text-sm shadow-sm shadow-blue-600/20 dark:shadow-blue-900/20">{t('batch.apply')}</button>
            </div>
        </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-gray-900/50 dark:bg-zinc-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-0 md:p-4">
      <div className="bg-white dark:bg-zinc-950 rounded-none md:rounded-2xl shadow-2xl w-full h-[100dvh] md:w-[60vw] md:h-auto max-w-2xl md:max-h-[90vh] flex flex-col relative overflow-hidden border-0 md:border border-slate-200 dark:border-zinc-800 animate-fade-in-up">
        
        {/* Progress Overlay */}
        {renderProgressOverlay()}

        <header className="px-5 py-4 border-b border-slate-200 dark:border-zinc-800 flex justify-between items-center flex-shrink-0 bg-slate-50/90 dark:bg-zinc-950/90 backdrop-blur-md">
          <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight">{t('inventory.batch_edit')} ({selectedIds.length})</h2>
          <button onClick={onClose} disabled={isSaving} className="p-1.5 rounded-full bg-slate-200/50 dark:bg-zinc-900/50 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-500 dark:text-gray-400 hover:text-slate-700 dark:hover:text-gray-200 transition-colors disabled:opacity-50">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </header>

        <main className="flex-grow overflow-y-auto p-4 sm:p-6 space-y-4 custom-scrollbar bg-slate-50/50 dark:bg-zinc-950/20">
             {stopError && (
                 <div className="p-4 bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-xl border border-rose-200 dark:border-rose-500/20 mb-4 animate-bounce">
                     <p className="font-bold text-sm">⚠️ {stopError}</p>
                     <p className="text-xs mt-1 opacity-80">Please try again in a few minutes with fewer items.</p>
                 </div>
             )}

             {/* AI ACTIONS */}
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FieldWrapper field="autoFillAI" label={`✨ ${t('batch.ai_autofill')}`} isEnabled={enabledFields.has('autoFillAI')} onToggle={handleToggleField}>
                    <p className="text-xs text-slate-500 dark:text-gray-400 leading-relaxed">Automatically detects Brand, Category, SKU, and PC Specs (Socket, Wattage, Memory Type) from the Product Name.</p>
                </FieldWrapper>

                <FieldWrapper field="generateDescAI" label={`✨ ${t('batch.ai_desc')}`} isEnabled={enabledFields.has('generateDescAI')} onToggle={handleToggleField}>
                    <p className="text-xs text-slate-500 dark:text-gray-400 leading-relaxed">Generates a professional technical description for all selected items based on their names.</p>
                </FieldWrapper>
             </div>

             <div className="border-t border-slate-200 dark:border-zinc-800 my-4"></div>

            <FieldWrapper field="category" label={t('batch.cat')} isEnabled={enabledFields.has('category')} onToggle={handleToggleField}>
                <select 
                    value={updates.category || ''} 
                    onChange={(e) => handleUpdateChange('category', e.target.value)} 
                    className="form-input w-full"
                >
                    <option value="">Select a category...</option>
                    {uniqueCategories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
            </FieldWrapper>

            <FieldWrapper field="brand" label={t('batch.brand')} isEnabled={enabledFields.has('brand')} onToggle={handleToggleField}>
                <select 
                    value={updates.brand || ''}
                    onChange={(e) => handleUpdateChange('brand', e.target.value)} 
                    className="form-input w-full"
                >
                     <option value="">Select a brand...</option>
                    {uniqueBrands.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
            </FieldWrapper>

            <FieldWrapper field="minStock" label={t('batch.min_stock')} isEnabled={enabledFields.has('minStock')} onToggle={handleToggleField}>
                <input 
                    type="number" 
                    min="0" 
                    value={updates.minStock !== undefined ? updates.minStock : ''}
                    onChange={(e) => handleUpdateChange('minStock', Number(e.target.value))} 
                    className="form-input w-full" 
                    placeholder="e.g., 5" 
                />
            </FieldWrapper>

             <FieldWrapper field="price1" label={t('batch.price')} isEnabled={enabledFields.has('price1')} onToggle={handleToggleField}>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                    <select 
                        value={updates.price1?.type || 'percentage_increase'}
                        onChange={(e) => handlePriceAdjustmentChange('type', e.target.value)} 
                        className="form-input w-full sm:w-auto"
                    >
                        <option value="percentage_increase">Increase by %</option>
                        <option value="percentage_decrease">Decrease by %</option>
                        <option value="absolute_increase">
                            {isRightSideCurrency ? `Increase by (amount) ${settings.currencySymbol}` : `Increase by ${settings.currencySymbol}`}
                        </option>
                        <option value="absolute_decrease">
                             {isRightSideCurrency ? `Decrease by (amount) ${settings.currencySymbol}` : `Decrease by ${settings.currencySymbol}`}
                        </option>
                        <option value="set_to">
                             {isRightSideCurrency ? `Set to (amount) ${settings.currencySymbol}` : `Set to ${settings.currencySymbol}`}
                        </option>
                    </select>
                    <input 
                        type="number" 
                        min="0" 
                        value={updates.price1?.value || 0} 
                        onChange={(e) => handlePriceAdjustmentChange('value', e.target.value)} 
                        className="form-input w-full" 
                    />
                </div>
            </FieldWrapper>

            <FieldWrapper field="addImages" label={t('batch.add_img')} isEnabled={enabledFields.has('addImages')} onToggle={handleToggleField}>
                <p className="text-xs text-slate-500 dark:text-gray-400 mb-3">Adds one image to each selected product (up to 5 total images). This will not replace existing images.</p>
                <input type="file" accept="image/*" onChange={handleImageFileChange} className="form-input w-full file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-blue-50 dark:file:bg-blue-500/10 file:text-blue-600 dark:file:text-blue-500 hover:file:bg-blue-100 dark:hover:file:bg-blue-500/20" />
            </FieldWrapper>

             <FieldWrapper field="removeImages" label={t('batch.remove_img')} isEnabled={enabledFields.has('removeImages')} onToggle={handleToggleField}>
                 <p className="text-xs font-medium text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 p-3 rounded-xl border border-rose-200 dark:border-rose-500/20">Warning: This will permanently delete all existing images from the selected products.</p>
            </FieldWrapper>
        </main>

        <footer className="p-4 sm:p-5 border-t border-slate-200 dark:border-zinc-800 flex justify-end items-center gap-3 flex-shrink-0 bg-slate-50/90 dark:bg-zinc-950/90 backdrop-blur-md">
          <button onClick={onClose} disabled={isSaving} className="px-5 py-2.5 bg-slate-100 dark:bg-zinc-900 text-slate-700 dark:text-gray-300 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors font-bold text-sm border border-slate-200 dark:border-zinc-800 disabled:opacity-50">{t('common.cancel')}</button>
          <button onClick={handleApply} disabled={isSaving || enabledFields.size === 0} className="px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-500 transition-colors font-bold text-sm shadow-sm shadow-blue-600/20 dark:shadow-blue-900/20 disabled:opacity-50 disabled:cursor-not-allowed">
            {isSaving ? t('batch.processing') : t('batch.apply')}
          </button>
        </footer>

        {showConfirm && renderConfirmationModal()}

        <style>{`
            .form-input {
              background-color: var(--bg-input, #ffffff);
              border: 1px solid var(--border-input, #e2e8f0);
              border-radius: 0.75rem; /* rounded-xl */
              padding: 0.625rem 1rem;
              color: var(--text-input, #0f172a);
              font-size: 0.875rem;
              transition: all 0.2s;
            }
            .dark .form-input {
              background-color: rgba(15, 23, 42, 0.5); /* slate-900/50 */
              border-color: rgba(31, 41, 55, 1); /* gray-800 */
              color: #f8fafc; /* slate-50 */
            }
            .form-input:focus {
              outline: none;
              border-color: #3b82f6; /* blue-500 */
              box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
            }
            .form-input::placeholder {
              color: #9ca3af; /* gray-400 */
            }
            .dark .form-input::placeholder {
              color: #6b7280; /* gray-500 */
            }
            @keyframes fade-in {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            @keyframes fade-in-up {
                from { opacity: 0; transform: translateY(10px); }
                to { opacity: 1; transform: translateY(0); }
            }
            .animate-fade-in {
                animation: fade-in 0.2s ease-out forwards;
            }
            .animate-fade-in-up {
                animation: fade-in-up 0.3s ease-out forwards;
            }
            .custom-scrollbar::-webkit-scrollbar {
              width: 6px;
              height: 6px;
            }
            .custom-scrollbar::-webkit-scrollbar-track {
              background: transparent;
            }
            .custom-scrollbar::-webkit-scrollbar-thumb {
              background: #d1d5db; /* gray-300 */
              border-radius: 10px;
            }
            .dark .custom-scrollbar::-webkit-scrollbar-thumb {
              background: rgba(55, 65, 81, 0.5); /* gray-700 */
            }
            .custom-scrollbar::-webkit-scrollbar-thumb:hover {
              background: #9ca3af; /* gray-400 */
            }
            .dark .custom-scrollbar::-webkit-scrollbar-thumb:hover {
              background: rgba(75, 85, 99, 0.8); /* gray-600 */
            }
          `}</style>
      </div>
    </div>
  );
};

export default BatchEditModal;
