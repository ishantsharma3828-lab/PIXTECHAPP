
import React, { useContext } from 'react';
import { SettingsContext } from '../../contexts/SettingsContext';

export interface SalesFilters {
    startDate: string;
    endDate: string;
    status: string;
    paymentMethod: string;
    searchQuery: string;
    syncStatus: string;
}

interface SalesFilterBarProps {
    filters: SalesFilters;
    onFilterChange: (filters: SalesFilters) => void;
    onRefresh: () => void;
    onExport: () => void;
}

const SalesFilterBar: React.FC<SalesFilterBarProps> = ({ filters, onFilterChange, onRefresh, onExport }) => {
    const { t } = useContext(SettingsContext);
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        onFilterChange({ ...filters, [name]: value });
    };

    const setDateRange = (days: number) => {
        const end = new Date();
        const start = new Date();
        start.setDate(end.getDate() - days);
        onFilterChange({
            ...filters,
            startDate: start.toISOString().split('T')[0],
            endDate: end.toISOString().split('T')[0]
        });
    };

    return (
        <div className="bg-white dark:bg-zinc-950/80 md:bg-white md:dark:bg-zinc-950 border-b md:border border-slate-200 dark:border-zinc-800 md:rounded-xl p-1.5 md:p-4 mb-1.5 md:mb-4 sticky top-0 z-20 shadow-sm md:shadow-none backdrop-blur-md">
            <div className="flex flex-col xl:flex-row gap-1.5 md:gap-4 justify-between items-end xl:items-center">
                
                {/* Mobile Top Row: Search + Actions */}
                <div className="flex gap-1.5 w-full">
                    {/* Search */}
                    <div className="relative flex-1">
                        <input 
                            type="text" 
                            name="searchQuery"
                            value={filters.searchQuery}
                            onChange={handleChange}
                            placeholder={t('header.search_placeholder')}
                            className="w-full pl-6 md:pl-9 pr-2 md:pr-3 py-1 md:py-2 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded md:rounded-lg text-[10px] md:text-sm text-slate-800 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-500 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all shadow-none md:shadow-sm"
                        />
                        <svg className="w-3 h-3 md:w-4 md:h-4 text-slate-400 dark:text-zinc-500 absolute left-2 md:left-3 top-1.5 md:top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    </div>
                    {/* Actions Group Mini */}
                    <button onClick={() => setDateRange(0)} className="px-2 py-1 md:py-2 text-[9px] md:text-xs font-bold text-slate-900 dark:text-zinc-100 bg-slate-100 dark:bg-zinc-900 hover:bg-slate-200 dark:hover:bg-zinc-800 rounded flex-none transition-colors border border-slate-200 dark:border-zinc-800 shadow-sm hidden sm:block">{t('sales.today')}</button>
                    <button onClick={onRefresh} className="p-1 md:p-2 text-slate-500 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-zinc-900 rounded flex-none transition-colors shadow-sm bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800" title={t('sales.refresh')}>
                        <svg className="w-3.5 h-3.5 md:w-5 md:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                    </button>
                    <button onClick={onExport} className="flex items-center justify-center gap-1 px-2 md:px-4 py-1 md:py-2 bg-blue-600 text-white text-[9px] md:text-sm font-bold rounded hover:bg-blue-500 shadow-sm flex-none transition-colors">
                        <svg className="w-3 h-3 md:w-4 md:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        <span className="hidden sm:inline">{t('common.export')}</span>
                        <span className="sm:hidden">Export</span>
                    </button>
                </div>

                {/* Mobile Bottom Row: Grid of 4 Filters */}
                <div className="grid grid-cols-4 gap-1.5 w-full">
                    {/* Date Start */}
                    <div>
                        <input 
                            type="date" 
                            name="startDate"
                            value={filters.startDate}
                            onChange={handleChange}
                            title={t('sales.date_start')}
                            className="w-full px-1 md:px-2 py-1 md:py-2 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded text-[8px] md:text-sm text-slate-800 dark:text-zinc-100 focus:ring-1 focus:ring-blue-500 outline-none shadow-none md:shadow-sm"
                        />
                    </div>
                    {/* Date End */}
                    <div>
                        <input 
                            type="date" 
                            name="endDate"
                            value={filters.endDate}
                            onChange={handleChange}
                            title={t('sales.date_end')}
                            className="w-full px-1 md:px-2 py-1 md:py-2 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded text-[8px] md:text-sm text-slate-800 dark:text-zinc-100 focus:ring-1 focus:ring-blue-500 outline-none shadow-none md:shadow-sm"
                        />
                    </div>
                    {/* Status */}
                    <div>
                        <select 
                            name="status" 
                            value={filters.status} 
                            onChange={handleChange}
                            title={t('sales.status')}
                            className="w-full px-1 md:px-2 py-1 md:py-2 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded text-[8px] md:text-sm text-slate-800 dark:text-zinc-100 focus:ring-1 focus:ring-blue-500 outline-none shadow-none md:shadow-sm cursor-pointer"
                        >
                            <option value="all">S: {t('common.all')}</option>
                            <option value="completed">{t('sales.status.completed')}</option>
                            <option value="void">{t('sales.status.void')}</option>
                            <option value="refunded">{t('sales.status.refunded')}</option>
                        </select>
                    </div>
                    {/* Sync */}
                    <div>
                        <select 
                            name="syncStatus" 
                            value={filters.syncStatus} 
                            onChange={handleChange}
                            title={t('sales.sync')}
                            className="w-full px-1 md:px-2 py-1 md:py-2 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded text-[8px] md:text-sm text-slate-800 dark:text-zinc-100 focus:ring-1 focus:ring-blue-500 outline-none shadow-none md:shadow-sm cursor-pointer"
                        >
                            <option value="all">Sy: {t('common.all')}</option>
                            <option value="synced">{t('sales.sync.synced')}</option>
                            <option value="pending">{t('sales.sync.pending')}</option>
                        </select>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SalesFilterBar;
