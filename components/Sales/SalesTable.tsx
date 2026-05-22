
import React, { useContext } from 'react';
import { Sale } from '../../constants/billingTypes';
import { SettingsContext } from '../../contexts/SettingsContext';

interface SalesTableProps {
    sales: Sale[];
    onRowClick: (sale: Sale) => void;
    settings: any;
}

const SalesTable: React.FC<SalesTableProps> = ({ sales, onRowClick, settings }) => {
    const { t } = useContext(SettingsContext);
    const isRightSideCurrency = settings.currencySymbol === 'DA' || settings.currencySymbol === 'DZD';
    const formatPrice = (val: number) => isRightSideCurrency ? `${val.toFixed(2)} ${settings.currencySymbol}` : `${settings.currencySymbol}${val.toFixed(2)}`;

    const getStatusStyles = (status: string, sync: string) => {
        if (status === 'void' || status === 'refunded') return 'border-l-4 border-red-500 bg-red-50 dark:bg-red-900/10 text-red-700 dark:text-red-400';
        // Removed Sync Pending check to prevent all new sales from being yellow
        if (status === 'pending') return 'border-l-4 border-yellow-400 bg-yellow-50 dark:bg-yellow-900/10 text-slate-700 dark:text-gray-300';
        return 'border-l-4 border-green-500 hover:bg-slate-50 dark:hover:bg-gray-700/50 text-slate-700 dark:text-gray-300';
    };

    const getStatusBadge = (sale: Sale) => {
        if (!sale) return null;
        if (sale.status === 'void') return <span className="px-2 py-0.5 rounded text-xs font-bold bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300">{t('sales.status.void').toUpperCase()}</span>;
        if (sale.status === 'refunded') return <span className="px-2 py-0.5 rounded text-xs font-bold bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300">{t('sales.status.refunded').toUpperCase()}</span>;

        const payments = sale.payments || [];
        const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
        const total = sale.total || 0;
        const isFullyPaid = totalPaid >= (total - 0.01);

        if (sale.syncStatus === 'pending') {
            // Only show icon, don't override the main status badge if we want to show payment status
            // But if we want to show sync status explicitly:
            // return <span className="...">{t('sales.sync.pending')}</span>;
            // Better: Show main status, maybe add a small dot? 
            // For now, let's prioritize Payment Status as the "Badge"
        }

        if (!isFullyPaid) {
            // Check if it's a Debt/Facilité Plan
            if (sale.debtDetails && sale.debtDetails.isDebt) {
                return <span className="px-2 py-0.5 rounded text-xs font-bold bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                    FACILITÉ / DEBT ({total > 0 ? ((totalPaid / total) * 100).toFixed(0) : 0}%)
                </span>;
            }

            return <span className="px-2 py-0.5 rounded text-xs font-bold bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300">
                PARTIAL ({total > 0 ? ((totalPaid / total) * 100).toFixed(0) : 0}%)
            </span>;
        }

        return <span className="px-2 py-0.5 rounded text-xs font-bold bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">{t('sales.status.completed').toUpperCase()}</span>;
    };

    return (
        <div className="flex flex-col h-full rounded-none md:rounded-xl md:border-slate-200 md:dark:border-zinc-800 md:bg-white md:dark:bg-zinc-950 md:border md:shadow-sm">
            <div className="overflow-auto flex-1 px-1 sm:px-2 md:p-0 custom-scrollbar">
                {/* Desktop Table View */}
                <div className="hidden md:block">
                    <table className="min-w-full divide-y divide-slate-200 dark:divide-zinc-800">
                        <thead className="bg-slate-50/50 dark:bg-zinc-950/50 sticky top-0 z-10 backdrop-blur-sm border-b border-slate-200 dark:border-zinc-800">
                            <tr>
                                <th className="px-6 py-3 text-left text-[10px] font-black text-slate-800 dark:text-zinc-400 uppercase tracking-widest">{t('sales.col.date')}</th>
                                <th className="px-6 py-3 text-left text-[10px] font-black text-slate-800 dark:text-zinc-400 uppercase tracking-widest">{t('sales.col.invoice')}</th>
                                <th className="px-6 py-3 text-left text-[10px] font-black text-slate-800 dark:text-zinc-400 uppercase tracking-widest">{t('sales.col.customer')}</th>
                                <th className="px-6 py-3 text-left text-[10px] font-black text-slate-800 dark:text-zinc-400 uppercase tracking-widest">{t('sales.col.items')}</th>
                                <th className="px-6 py-3 text-left text-[10px] font-black text-slate-800 dark:text-zinc-400 uppercase tracking-widest hidden lg:table-cell">{t('sales.col.payment')}</th>
                                <th className="px-6 py-3 text-right text-[10px] font-black text-slate-800 dark:text-zinc-400 uppercase tracking-widest">{t('sales.col.total')}</th>
                                <th className="px-6 py-3 text-center text-[10px] font-black text-slate-800 dark:text-zinc-400 uppercase tracking-widest">{t('sales.col.status')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-zinc-800">
                            {sales.map((sale) => (
                                <tr
                                    key={sale.id}
                                    onClick={() => onRowClick(sale)}
                                    className={`cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-zinc-900/50 ${getStatusStyles(sale.status, sale.syncStatus || 'synced')}`}
                                >
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        <div className="font-medium text-slate-900 dark:text-zinc-100">{new Date(sale.date).toLocaleDateString()}</div>
                                        <div className="text-xs text-slate-500 dark:text-zinc-500">{new Date(sale.date).toLocaleTimeString()}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-slate-800 dark:text-zinc-300">
                                        {sale.friendlyId || sale.id.substring(0, 8)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 dark:text-zinc-100">
                                        {sale.customerName || 'Walk-in Customer'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-zinc-500">
                                        {sale.items.length} items
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-zinc-500 uppercase hidden lg:table-cell">
                                        {sale.payments.map(p => t(`billing.pay_${p.method}` as any)).join(', ')}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-blue-600 dark:text-blue-400">
                                        {formatPrice(sale.total)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                        {getStatusBadge(sale)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden space-y-1.5 pb-[calc(4rem+env(safe-area-inset-bottom,0px))] px-0.5">
                    {sales.map((sale) => (
                        <div
                            key={sale.id}
                            onClick={() => onRowClick(sale)}
                            className={`p-1.5 px-2 bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded shadow-sm cursor-pointer hover:border-slate-300 dark:hover:border-zinc-700 transition-colors ${getStatusStyles(sale.status, sale.syncStatus || 'synced')}`}
                        >
                            {/* Mobile Card Layout Redux */}
                            <div className="flex justify-between items-center mb-0.5">
                                <div className="flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-1.5">
                                    <div className="flex items-center gap-1.5">
                                        <span className="font-mono text-[8.5px] font-bold text-slate-800 dark:text-zinc-300 bg-slate-100 dark:bg-zinc-800 px-1 py-[1px] rounded">
                                            {sale.friendlyId || sale.id.substring(0, 8)}
                                        </span>
                                        <span className="font-bold text-[10.5px] sm:text-xs text-slate-900 dark:text-zinc-100 truncate max-w-[120px] sm:max-w-none hidden sm:block">
                                            {sale.customerName || 'Walk-in'}
                                        </span>
                                    </div>
                                    <span className="font-bold text-[11px] sm:text-sm text-slate-900 dark:text-zinc-100 truncate pr-1 sm:hidden max-w-[150px]">
                                        {sale.customerName || 'Walk-in Customer'}
                                    </span>
                                </div>
                                
                                <div className="flex flex-col items-end">
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                        <div className="scale-[0.6] origin-right -mr-1">
                                            {getStatusBadge(sale)}
                                        </div>
                                    </div>
                                    <span className="font-bold text-[11px] sm:text-sm text-blue-600 dark:text-blue-400 whitespace-nowrap leading-none mt-0.5">
                                        {formatPrice(sale.total)}
                                    </span>
                                </div>
                            </div>
                            
                            <div className="flex justify-between items-center text-[8px] sm:text-[9px] text-slate-500 dark:text-zinc-500 mt-1 border-t border-slate-100 dark:border-zinc-800/50 pt-1">
                                <div className="flex items-center gap-1">
                                    <span>{new Date(sale.date).toLocaleDateString()}</span>
                                    <span className="hidden sm:inline-block">{new Date(sale.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                                <div className="text-right truncate pl-2 max-w-[60%] font-medium">
                                    {sale.items.length} item{sale.items.length !== 1 ? 's' : ''} • {sale.payments.map(p => t(`billing.pay_${p.method}` as any)).join(', ')}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {sales.length === 0 && (
                    <div className="px-6 py-12 text-center text-slate-500 dark:text-zinc-500 text-sm">
                        {t('stock.no_orders')}
                    </div>
                )}
            </div>
        </div>
    );
};

export default SalesTable;
