import React, { useState, useContext, useEffect } from 'react';
import { SettingsContext } from '../../contexts/SettingsContext';
import { Product } from '../../constants/inventoryFields';
import { FONT_PRESETS } from '../../constants/defaultSettings';
import { motion, AnimatePresence } from 'framer-motion';
import { usePermissions } from '../../hooks/usePermissions';

export type ExportFormat = 'pdf' | 'csv' | 'xlsx';
export type ExportTheme = 'cyberpunk_list' | 'poster_showcase' | 'corporate_clean';
export type TitleBackgroundStyle = 'gaming_hex' | 'cyber_circuit' | 'abstract_gradient' | 'minimal';
export type BgRemovalMode = 'none' | 'all' | 'custom';

export interface ExportOptions {
    format: ExportFormat;
    theme: ExportTheme;
    title: string;
    subtitle: string;
    showPrice: boolean;
    priceField: string;
    showSku: boolean;
    showDescription: boolean;
    showImages: boolean;
    columns: number;
    invertLogo: boolean;
    bgRemovalMode: BgRemovalMode;
    bgRemovalCustomIds: string[];
    titleBackground: TitleBackgroundStyle;
    selectedFields: string[];
    priceFont: string; 
}

interface ExportConfigModalProps {
    products: Product[];
    onClose: () => void;
    onExport: (options: ExportOptions) => void;
    /** When true, restricts format to PDF only (e.g. for cashier role) */
    pdfOnly?: boolean;
}

const ExportConfigModal: React.FC<ExportConfigModalProps> = ({ products, onClose, onExport, pdfOnly = false }) => {
    const { settings, t } = useContext(SettingsContext);
    const { visiblePrices, showStock } = usePermissions();
    
    const [options, setOptions] = useState<ExportOptions>({
        format: 'pdf',
        theme: 'poster_showcase',
        title: settings.companyName,
        subtitle: 'PRODUCT CATALOG 2024',
        showPrice: true,
        priceField: 'price1',
        showSku: true,
        showDescription: true,
        showImages: true,
        columns: 2,
        invertLogo: false,
        bgRemovalMode: 'none',
        bgRemovalCustomIds: [],
        titleBackground: 'gaming_hex',
        selectedFields: [],
        priceFont: settings.primaryFont
    });

    const [orderedFields, setOrderedFields] = useState<string[]>([]);

    useEffect(() => {
        const visibleFields = settings.productFields
            .filter(f => f.isVisible)
            .map(f => f.key as string);
        visibleFields.unshift('images');
        setOrderedFields(visibleFields);
    }, [settings.productFields]);

    useEffect(() => {
        setOptions(prev => ({ 
            ...prev, 
            selectedFields: orderedFields
        }));
    }, [orderedFields]);

    const handleToggle = (field: keyof ExportOptions) => {
        setOptions(prev => ({ ...prev, [field]: !prev[field] }));
    };

    const toggleFieldSelection = (key: string) => {
        setOrderedFields(prev => {
            if (prev.includes(key)) {
                return prev.filter(k => k !== key);
            } else {
                return [...prev, key];
            }
        });
    }

    const getFieldLabel = (key: string) => {
        if (key === 'images') return t('inventory.images');
        if (key.startsWith('price') || ['name', 'sku', 'brand', 'category', 'quantity', 'costPrice', 'minStock', 'description', 'warranty'].includes(key)) {
             return t(`inventory.col.${key}`);
        }
        const field = settings.productFields.find(f => f.key === key);
        return field ? field.label : key;
    }

    const isPDF = options.format === 'pdf';

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex sm:items-center justify-center p-0 sm:p-4 pointer-events-none">
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm pointer-events-auto" 
                    onClick={onClose} 
                />
                
                <motion.div 
                    initial={{ y: '100%' }}
                    animate={{ y: 0 }}
                    exit={{ y: '100%' }}
                    transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                    className="bg-white dark:bg-zinc-950 rounded-t-[32px] sm:rounded-[28px] w-full sm:max-w-md max-h-[90dvh] shadow-2xl absolute bottom-0 sm:relative z-10 border-t sm:border border-slate-100 dark:border-zinc-800 flex flex-col pointer-events-auto overflow-hidden mt-auto sm:mt-0"
                >
                    {/* Mobile Handle */}
                    <div className="w-12 h-1.5 bg-slate-200 dark:bg-zinc-800 rounded-full mx-auto mt-4 mb-2 sm:hidden shrink-0"></div>

                    {/* Header */}
                    <div className="flex items-center justify-between px-6 pb-4 pt-2 border-b border-gray-100 dark:border-zinc-800/60 shrink-0">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-[14px] bg-blue-50 dark:bg-blue-600/10 flex items-center justify-center text-blue-600 dark:text-blue-500 border border-blue-100 dark:border-blue-500/20 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                            </div>
                            <div>
                                <h2 className="text-base font-bold text-slate-800 dark:text-white leading-tight">{t('export.title')}</h2>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Configure Download</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300 rounded-full hover:bg-slate-50 dark:hover:bg-zinc-900 transition-colors">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8 custom-scrollbar">
                        
                        {/* Format Selection */}
                        <div className="space-y-3">
                            <label className="text-[10px] font-bold text-slate-500 dark:text-slate-500 uppercase tracking-[0.2em] ml-1">{t('export.format')}</label>
                            {pdfOnly ? (
                                <div className="flex p-1.5 bg-slate-100 dark:bg-zinc-900 rounded-[18px] border border-slate-200 dark:border-zinc-800/50">
                                    <div className="flex-1 py-3 rounded-2xl text-[11px] font-bold uppercase tracking-wider text-center bg-white dark:bg-zinc-800 text-slate-900 dark:text-white shadow-sm">PDF</div>
                                </div>
                            ) : (
                                <div className="flex p-1.5 bg-slate-100 dark:bg-zinc-900 rounded-[18px] border border-slate-200 dark:border-zinc-800/50">
                                    {(['pdf', 'csv', 'xlsx'] as const).map(fmt => (
                                        <button
                                            key={fmt}
                                            onClick={() => setOptions({ ...options, format: fmt })}
                                            className={`flex-1 py-3 rounded-2xl text-[11px] font-bold uppercase tracking-wider transition-all duration-200 ${
                                                options.format === fmt 
                                                ? 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-white shadow-sm' 
                                                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                                            }`}
                                        >
                                            {fmt}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* PDF Specific Options */}
                        {isPDF && (
                            <motion.div initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} className="space-y-6">
                                {/* Branding & Titles */}
                                <div className="space-y-4 p-5 rounded-[20px] bg-slate-50 dark:bg-zinc-900/50 border border-slate-100 dark:border-zinc-800">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase ml-1 tracking-widest">Main Title</label>
                                        <input 
                                            type="text" 
                                            value={options.title} 
                                            onChange={e => setOptions({...options, title: e.target.value})}
                                            placeholder="e.g. My Catalog"
                                            className="w-full bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white text-sm rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500/50 outline-none transition-all placeholder:text-gray-400"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-200 dark:border-zinc-800 mt-4">
                                        <Toggle label={t('export.show_images')} checked={options.showImages} onChange={() => handleToggle('showImages')} />
                                        <Toggle label={t('export.show_price')} checked={options.showPrice} onChange={() => handleToggle('showPrice')} />
                                        <Toggle label={t('export.show_sku')} checked={options.showSku} onChange={() => handleToggle('showSku')} />
                                        <Toggle label={t('export.show_desc')} checked={options.showDescription} onChange={() => handleToggle('showDescription')} />
                                    </div>
                                </div>
                                
                                {/* Layout */}
                                <div className="space-y-3">
                                    <label className="text-[10px] font-bold text-slate-500 dark:text-slate-500 uppercase tracking-[0.2em] ml-1">{t('export.layout')}</label>
                                    <div className="flex p-1 bg-slate-100 dark:bg-zinc-900 rounded-2xl">
                                        {[1, 2, 3, 4].map(col => (
                                            <button
                                                key={col}
                                                onClick={() => setOptions({...options, columns: col})}
                                                className={`flex-1 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${
                                                    options.columns === col ? 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-white shadow-sm scale-105' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                                                }`}
                                            >
                                                {col === 1 ? 'List' : `${col} Col`}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {/* XLSX/CSV Specific Options */}
                        {!isPDF && (
                            <motion.div initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} className="space-y-6">
                                <label className="text-[10px] font-bold text-slate-500 dark:text-slate-500 uppercase tracking-[0.2em] ml-1">Export Fields</label>
                                <div className="grid grid-cols-2 gap-2 max-h-72 overflow-y-auto custom-scrollbar pr-2">
                                    <label className="flex items-center space-x-3 cursor-pointer p-3 rounded-[14px] bg-slate-50 dark:bg-zinc-900/50 hover:bg-slate-100 dark:hover:bg-zinc-900 transition-all border border-slate-100 dark:border-zinc-800">
                                        <input 
                                            type="checkbox" 
                                            className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                            checked={orderedFields.includes('images')}
                                            onChange={() => toggleFieldSelection('images')}
                                        />
                                        <span className="text-xs font-bold text-slate-700 dark:text-zinc-300">Images</span>
                                    </label>
                                    {settings.productFields
                                      .filter((field) => {
                                          const keyStr = field.key as string;
                                          if (keyStr === 'costPrice' && !visiblePrices.includes('cost_price')) return false;
                                          if (['price2', 'price3', 'price4'].includes(keyStr) && !visiblePrices.includes(keyStr as any)) return false;
                                          if (['quantity', 'minStock'].includes(keyStr) && !showStock) return false;
                                          return true;
                                      })
                                      .map(field => (
                                        <label key={field.key} className="flex items-center space-x-3 cursor-pointer p-3 rounded-[14px] bg-slate-50 dark:bg-zinc-900/50 hover:bg-slate-100 dark:hover:bg-zinc-900 transition-all border border-slate-100 dark:border-zinc-800">
                                            <input 
                                                type="checkbox" 
                                                className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                                checked={orderedFields.includes(field.key as string)}
                                                onChange={() => toggleFieldSelection(field.key as string)}
                                            />
                                            <span className="text-xs font-bold text-slate-700 dark:text-zinc-300 truncate">{getFieldLabel(field.key as string)}</span>
                                        </label>
                                    ))}
                                </div>
                            </motion.div>
                        )}
                    </div>

                    {/* Footer Actions */}
                    <div className="p-4 sm:p-6 border-t border-slate-100 dark:border-zinc-800 shrink-0 bg-white dark:bg-zinc-950 pb-8 sm:pb-6">
                        <button 
                            onClick={() => onExport(options)}
                            className="w-full py-4 bg-[#2563eb] text-white rounded-[16px] shadow-[0_4px_14px_0_rgb(37,99,235,0.39)] hover:shadow-[0_6px_20px_rgba(37,99,235,0.23)] font-bold text-sm hover:bg-[#1d4ed8] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                            {options.format === 'pdf' ? t('export.generate_pdf') : `${t('export.download')} .${options.format.toUpperCase()}`}
                        </button>
                    </div>
                </motion.div>
            </div>

            <style>{`
            .custom-scrollbar::-webkit-scrollbar { width: 4px; }
            .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
            .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
            .dark .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; }
            `}</style>
        </AnimatePresence>
    );
};

const Toggle: React.FC<{label: string, checked: boolean, onChange: () => void}> = ({label, checked, onChange}) => (
    <label className="flex items-center justify-between cursor-pointer py-1.5 group">
        <span className="text-xs font-bold text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-slate-200 transition-colors">{label}</span>
        <div 
            onClick={onChange}
            className={`relative w-9 h-5 transition-all duration-300 ease-in-out rounded-full shadow-inner ${checked ? 'bg-blue-600' : 'bg-slate-200 dark:bg-zinc-800'}`}
        >
            <div className={`absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transform transition-all duration-300 ease-in-out ${checked ? 'translate-x-4' : 'translate-x-0'}`}></div>
        </div>
    </label>
);

export default ExportConfigModal;
