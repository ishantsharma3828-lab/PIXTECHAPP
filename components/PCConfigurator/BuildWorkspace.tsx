
import React, { useContext } from 'react';
import { BuildPart, CATEGORIES, checkCompatibility, calculateTotalWattage, PartCategory } from '../../services/pcBuilderService';
import { SettingsContext } from '../../contexts/SettingsContext';

interface BuildWorkspaceProps {
    parts: BuildPart[];
    onRemovePart: (uniqueId: string) => void;
    onSelectCategory: (categoryId: PartCategory) => void;
}

const BuildWorkspace: React.FC<BuildWorkspaceProps> = ({ parts, onRemovePart, onSelectCategory }) => {
    const { settings, t } = useContext(SettingsContext);
    
    // Derived Metrics
    const compatibility = checkCompatibility(parts);
    const estimatedWattage = calculateTotalWattage(parts);
    const totalPrice = parts.reduce((sum, p) => sum + p.price1, 0);
    const totalCost = parts.reduce((sum, p) => sum + (p.costPrice || 0), 0);
    const margin = totalPrice > 0 ? ((totalPrice - totalCost) / totalPrice) * 100 : 0;

    const isRightSideCurrency = settings.currencySymbol === 'DA' || settings.currencySymbol === 'DZD';
    const formatPrice = (val: number) => isRightSideCurrency ? `${val.toFixed(2)} ${settings.currencySymbol}` : `${settings.currencySymbol}${val.toFixed(2)}`;

    const getIconForCategory = (categoryId: string) => {
        switch (categoryId) {
            case 'CPU': return "/pictures/cpu.webp";
            case 'Motherboard': return "/pictures/mobo.webp";
            case 'Cooling': return "/pictures/cooling.webp";
            case 'RAM': return "/pictures/ram.webp";
            case 'GPU': return "/pictures/gpu.webp";
            case 'Storage': return "/pictures/ssd.webp";
            case 'PSU': return "/pictures/psu.webp";
            case 'Case': return "/pictures/case.webp";
            default: return null;
        }
    };

    // Group by category for visual structure (or just list them in a logical order)
    const renderPartSlot = (categoryLabel: string, categoryId: PartCategory) => {
        const partsInCat = parts.filter(p => p.categoryType === categoryId);
        const iconSrc = getIconForCategory(categoryId);
        
        return (
            <div key={categoryId} className="mb-2 md:mb-4 bg-white dark:bg-gray-800 rounded md:rounded-lg border border-slate-200 dark:border-zinc-800 overflow-hidden shadow-sm transition-all hover:shadow-md">
                <div 
                    className="bg-slate-50 dark:bg-gray-900/50 px-3 py-2 md:px-4 md:py-3 border-b border-slate-200 dark:border-zinc-800 flex justify-between items-center cursor-pointer hover:bg-slate-100 dark:hover:bg-gray-800 transition-colors"
                    onClick={() => onSelectCategory(categoryId)}
                >
                    <div className="flex items-center gap-2 md:gap-3">
                        {iconSrc ? (
                            <img src={iconSrc} alt={categoryLabel} className="w-5 h-5 md:w-8 md:h-8 object-contain" />
                        ) : (
                            <div className="w-5 h-5 md:w-8 md:h-8 bg-slate-200 dark:bg-gray-700 rounded-full flex items-center justify-center">
                                <svg className="w-3 h-3 md:w-4 md:h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>
                            </div>
                        )}
                        <span className="font-bold text-xs md:text-sm text-slate-700 dark:text-gray-300 uppercase tracking-wider">{t(`pc.cat.${categoryId}`)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        {partsInCat.length === 0 && <span className="text-[9px] md:text-xs text-gray-400 italic bg-slate-200 dark:bg-gray-700 px-2 py-0.5 md:py-1 rounded-full">{t('pc.empty')}</span>}
                        <button className="text-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-white p-1 rounded transition-colors">
                            <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                        </button>
                    </div>
                </div>
                
                {partsInCat.length > 0 && (
                    <div className="divide-y divide-gray-100 dark:divide-gray-700">
                        {partsInCat.map(part => {
                            // Extract Key Specs for Display
                            const socket = part.customFields?.socket;
                            const memType = part.customFields?.memory_type || part.customFields?.memoryType;
                            const watts = part.customFields?.wattage;

                            return (
                                <div key={part.uniqueId} className="p-2 md:p-3 flex items-center gap-2 md:gap-4 hover:bg-slate-50 dark:hover:bg-gray-700/30 transition-colors">
                                    <div className="w-8 h-8 md:w-10 md:h-10 bg-slate-100 dark:bg-gray-700 rounded overflow-hidden flex-shrink-0">
                                        {part.images?.[0] ? (
                                            <img src={part.images[0].url} className="w-full h-full object-cover" alt="" />
                                        ) : (
                                            <div className="flex items-center justify-center h-full text-[8px] md:text-[10px] text-gray-400">IMG</div>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="font-bold text-[10px] md:text-sm text-slate-800 dark:text-white truncate">{part.name}</div>
                                        <div className="text-[9px] md:text-xs text-slate-500 flex flex-wrap gap-1 md:gap-2 mt-0.5 md:mt-1">
                                            <span className="hidden sm:inline-block">{part.sku}</span>
                                            {/* Smart Badges */}
                                            {socket && <span className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 px-1 rounded">{socket}</span>}
                                            {memType && <span className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 px-1 rounded">{memType}</span>}
                                            {watts && <span className="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300 px-1 rounded">{watts}W</span>}
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="font-bold text-xs md:text-sm text-[var(--color-primary)]">{formatPrice(part.price1)}</div>
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); onRemovePart(part.uniqueId); }}
                                            className="text-[9px] md:text-xs text-red-400 hover:text-red-600 hover:underline mt-0.5 md:mt-1"
                                        >
                                            {t('pc.remove')}
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="flex flex-col h-full bg-slate-100 dark:bg-gray-900 overflow-hidden relative">
            {/* Top Status Bar */}
            <div className="bg-white dark:bg-gray-800 p-2 md:p-4 shadow-sm border-b border-slate-200 dark:border-zinc-800 flex justify-between gap-1 md:gap-4 sticky top-0 z-10 shrink-0">
                <div className={`flex flex-col items-center justify-center p-1 md:p-2 rounded md:rounded-lg border flex-1 ${compatibility.compatible ? 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20' : 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20'}`}>
                    <span className="text-[8px] md:text-xs uppercase font-bold opacity-70">Comp</span>
                    <span className="font-bold text-[10px] md:text-base">{compatibility.compatible ? t('pc.ok') : t('pc.issues')}</span>
                </div>
                <div className="flex flex-col items-center justify-center p-1 md:p-2 rounded md:rounded-lg bg-blue-50 border border-blue-200 text-blue-800 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-300 flex-1">
                    <span className="text-[8px] md:text-xs uppercase font-bold opacity-70">Power</span>
                    <span className="font-bold text-[10px] md:text-base">~{estimatedWattage}W</span>
                </div>
                <div className="flex flex-col items-center justify-center p-1 md:p-2 rounded md:rounded-lg bg-purple-50 border border-purple-200 text-purple-800 dark:bg-purple-900/20 dark:border-purple-800 dark:text-purple-300 flex-1">
                    <span className="text-[8px] md:text-xs uppercase font-bold opacity-70">Margin</span>
                    <span className="font-bold text-[10px] md:text-base">{margin.toFixed(1)}%</span>
                </div>
            </div>

            {/* Compatibility Errors */}
            {!compatibility.compatible && (
                <div className="bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 p-3 text-sm border-b border-red-200 dark:border-red-800 animate-pulse">
                    <ul className="list-disc list-inside">
                        {compatibility.issues.map((issue, i) => <li key={i}>{issue}</li>)}
                    </ul>
                </div>
            )}

            {/* Part Slots */}
            <div className="flex-1 overflow-y-auto p-4 max-w-4xl mx-auto w-full">
                {CATEGORIES.map(cat => renderPartSlot(cat.label, cat.id))}
            </div>
        </div>
    );
};

export default BuildWorkspace;
