
import React, { useState, useEffect, useContext, useMemo } from 'react';
import { Sale } from '../../constants/billingTypes';
import { SettingsContext } from '../../contexts/SettingsContext';
import * as billingService from '../../services/billingService';
import { getCurrentUser } from '../../services/authService';
import { salesCollection } from '../../db';
import { usePermissions } from '../../hooks/usePermissions';
import SalesFilterBar, { SalesFilters } from './SalesFilterBar';
import SalesTable from './SalesTable';
import TransactionDetailsPanel from './TransactionDetailsPanel';
import ReceiptModal from '../Billing/ReceiptModal';

const SalesLogPanel: React.FC = () => {
    const { settings, t } = useContext(SettingsContext);
    const user = getCurrentUser();
    const {
        canDeleteSale, canVoidSale, canViewRevenueSummary, salesScopedToSelf,
        allowedTabs,
    } = usePermissions();

    // TabGuard in App.tsx already blocks access — this is a secondary check
    // for the RBAC restricted-access message (technician / customer role fallback)
    const role = user?.role || 'customer';
    if (['technician', 'customer', 'inventory_manager'].includes(role) && !allowedTabs.has('sales-log')) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-slate-500">
                <h2 className="text-xl font-bold mb-2">Access Restricted</h2>
                <p>You do not have permission to view Sales Logs.</p>
            </div>
        );
    }

    const [allSales, setAllSales] = useState<Sale[]>([]);
    const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);
    const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

    // Default Filters: Current Month
    const [filters, setFilters] = useState<SalesFilters>({
        startDate: new Date(new Date().setDate(1)).toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
        status: 'all',
        paymentMethod: 'all',
        searchQuery: '',
        syncStatus: 'all'
    });

    const loadData = async () => {
        const history = await billingService.getSalesHistory();
        setAllSales(history);
    };

    // Reactive subscription — re-fetches whenever WatermelonDB's sales
    // collection changes (including after a pull completes post-refresh).
    useEffect(() => {
        loadData(); // initial fetch

        const subscription = salesCollection.query().observe().subscribe(() => {
            loadData();
        });

        return () => subscription.unsubscribe();
    }, []);

    const filteredSales = useMemo(() => {
        return allSales.filter(sale => {
            const saleDate = new Date(sale.date).toISOString().split('T')[0];

            // Date Range
            if (saleDate < filters.startDate || saleDate > filters.endDate) return false;

            // Status
            if (filters.status !== 'all' && sale.status !== filters.status) return false;

            // Sync Status
            if (filters.syncStatus !== 'all') {
                const status = sale.syncStatus || 'synced';
                if (status !== filters.syncStatus) return false;
            }

            // Search (Invoice #, Customer, or Items)
            if (filters.searchQuery) {
                const query = filters.searchQuery.toLowerCase();
                const matchesId = sale.id.toLowerCase().includes(query);
                const matchesCustomer = (sale.customerName || '').toLowerCase().includes(query);
                const matchesItems = (sale.items || []).some(item =>
                    (item.name || '').toLowerCase().includes(query) ||
                    (item.sku || '').toLowerCase().includes(query)
                );

                if (!matchesId && !matchesCustomer && !matchesItems) return false;
            }

            return true;
        }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [allSales, filters]);

    // Revenue Summary (Manager only via canViewRevenueSummary)
    const summary = useMemo(() => {
        if (!canViewRevenueSummary) return null;

        const activeSales = filteredSales.filter(s => s.status === 'completed');
        const totalRevenue = activeSales.reduce((sum, s) => sum + s.total, 0);
        const totalTax = activeSales.reduce((sum, s) => sum + s.tax, 0);

        return {
            revenue: totalRevenue,
            tax: totalTax,
            count: filteredSales.length,
            completedCount: activeSales.length
        };
    }, [filteredSales, canViewRevenueSummary]);

    const isRightSideCurrency = settings.currencySymbol === 'DA' || settings.currencySymbol === 'DZD';
    const formatPrice = (val: number) => isRightSideCurrency ? `${val.toFixed(2)} ${settings.currencySymbol}` : `${settings.currencySymbol}${val.toFixed(2)}`;

    const handleRowClick = (sale: Sale) => {
        setSelectedSale(sale);
        setIsDetailsOpen(true);
    };

    const handleVoid = async (reason: string) => {
        if (!selectedSale || !user || !canVoidSale) return;
        const updatedSale = await billingService.voidSale(selectedSale.id, user.username, reason);
        if (updatedSale) {
            setAllSales(prev => prev.map(s => s.id === updatedSale.id ? updatedSale : s));
            setSelectedSale(updatedSale);
        }
    };

    const handleDelete = async () => {
        if (!selectedSale || !user || !canDeleteSale) return;
        const success = await billingService.deleteSale(selectedSale.id);
        if (success) {
            setAllSales(prev => prev.filter(s => s.id !== selectedSale.id));
            setSelectedSale(null);
            setIsDetailsOpen(false);
        }
    };

    return (
        <div className="flex flex-col h-full relative">
            <div className="mb-2 md:mb-4 px-2">
                <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white leading-tight">{t('sales.title')}</h1>
                <p className="text-slate-500 dark:text-gray-400 text-xs md:text-sm hidden md:block">{t('sales.subtitle')}</p>
            </div>

            <SalesFilterBar
                filters={filters}
                onFilterChange={setFilters}
                onRefresh={loadData}
                onExport={() => billingService.exportSalesToExcel(filteredSales)}
            />

            <div className="flex-1 overflow-hidden relative flex flex-col">
                <div className="flex-1 overflow-hidden">
                    <SalesTable
                        sales={filteredSales}
                        onRowClick={handleRowClick}
                        settings={settings}
                    />
                </div>

                {summary && (
                    <div className="mt-1 md:mt-4 p-1.5 px-2 md:p-4 bg-gray-900 text-white rounded-t-lg md:rounded-lg shadow-[0_-4px_10px_rgba(0,0,0,0.1)] flex justify-between items-center z-10 pb-[calc(3.5rem+env(safe-area-inset-bottom,0px))] md:pb-4 relative border-t border-slate-700/50 flex-none">
                        <div className="flex justify-between md:justify-start flex-1 items-center gap-2 md:gap-6">
                            <div className="flex flex-col">
                                <span className="text-[7.5px] md:text-xs uppercase text-gray-400 font-bold tracking-wider">Revenue</span>
                                <span className="text-[11px] md:text-2xl font-black text-green-400 leading-none">{formatPrice(summary.revenue)}</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[7.5px] md:text-xs uppercase text-gray-400 font-bold tracking-wider">Taxes</span>
                                <span className="text-[11px] md:text-xl font-bold text-blue-400 leading-none">{formatPrice(summary.tax)}</span>
                            </div>
                            <div className="flex flex-col border-l border-slate-700/50 pl-2">
                                <span className="text-[7.5px] md:text-xs uppercase text-gray-400 font-bold tracking-wider">Trans.</span>
                                <span className="text-[11px] md:text-xl font-bold leading-none">{summary.count}</span>
                            </div>
                        </div>
                        <div className="pl-2 ml-1 border-l border-slate-700/50 flex flex-col justify-center">
                            <div className="px-1.5 py-0.5 bg-white/10 rounded-full text-[7px] uppercase font-black tracking-widest text-white/50 border border-white/10">
                                View
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <TransactionDetailsPanel
                sale={selectedSale}
                isOpen={isDetailsOpen}
                onClose={() => setIsDetailsOpen(false)}
                onReprint={() => setIsReceiptModalOpen(true)}
                onVoid={handleVoid}
                onDelete={handleDelete}
                settings={settings}
            />

            {isReceiptModalOpen && selectedSale && (
                <ReceiptModal
                    sale={selectedSale}
                    onClose={() => setIsReceiptModalOpen(false)}
                />
            )}
        </div>
    );
};

export default SalesLogPanel;
