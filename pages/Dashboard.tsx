import React, { useContext, useState, useEffect, useMemo } from 'react';
import { UIContext } from '../contexts/UIContext';
import { SettingsContext } from '../contexts/SettingsContext';
import { performManualSync } from '../services/syncService';
import { getDatabase } from '../services/db';
import * as authService from '../services/authService';

// Service Imports
import { getProducts } from '../services/inventoryService';
import { getSalesHistory, getCustomers, getDrafts } from '../services/billingService';
import { getServiceTickets } from '../services/serviceDeskService';
import { getRMAs } from '../services/rmaService';
import { getExpenses } from '../services/expenseService';
import { Link } from 'react-router-dom';
import CustomerDashboard from '../components/Dashboard/CustomerDashboard';

// Types
type DashboardStats = {
  topSelling: any[];
  lowSelling: any[];
  recentSales: any[];
  pendingOrders: any[];
  activeTickets: any[];
  recentRMAs: any[];
  topCustomers: any[];
  totalRevenueToday: number;
  totalExpensesToday: number;
  netProfitToday: number;
};

const Dashboard: React.FC = () => {
  const user = authService.getCurrentUser();
  const { t } = useContext(SettingsContext);

  if (user?.role === 'customer') {
    return <CustomerDashboard />;
  }

  // Sync State
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Data State
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    topSelling: [],
    lowSelling: [],
    recentSales: [],
    pendingOrders: [],
    activeTickets: [],
    recentRMAs: [],
    topCustomers: [],
    totalRevenueToday: 0,
    totalExpensesToday: 0,
    netProfitToday: 0
  });

  // --- DATA FETCHING ---
  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setIsLoading(true);
        console.log("Loading Dashboard Data...");

        // 1. Fetch Raw Data using Services
        const [products, sales, customers] = await Promise.all([
          getProducts(),
          getSalesHistory(),
          getCustomers()
        ]);

        const tickets = getServiceTickets(); // Sync
        const rmas = getRMAs(); // Sync
        const drafts = getDrafts(); // Sync (Pending Orders)
        const expenses = getExpenses(); // Sync

        // 2. Compute Top Selling / Low Selling
        const productSalesCount: Record<string, number> = {};
        let todayRevenue = 0;
        let todayExpenses = 0;
        const todayStr = new Date().toDateString();

        sales.forEach(sale => {
          // Revenue Today
          if (new Date(sale.date).toDateString() === todayStr) {
            todayRevenue += sale.total;
          }

          // Item Counts
          sale.items.forEach((item: any) => {
            const pid = item.id;
            productSalesCount[pid] = (productSalesCount[pid] || 0) + item.quantity;
          });
        });

        // Compute Today's Expenses
        expenses.forEach(exp => {
          if (exp.status === 'active' && new Date(exp.date).toDateString() === todayStr) {
            todayExpenses += exp.amount;
          }
        });

        const netProfitToday = todayRevenue - todayExpenses;

        // Map counts to product details
        const rankedProducts = products.map(p => ({
          ...p,
          salesCount: productSalesCount[p.id] || 0
        })).sort((a, b) => b.salesCount - a.salesCount);

        const topSelling = rankedProducts.slice(0, 5);
        const lowSelling = rankedProducts.filter(p => p.salesCount === 0).slice(0, 5);

        // 3. Recent Sales
        const recentSales = [...sales].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5);

        // 4. Active Tickets (Open, In Progress)
        const activeTickets = tickets
          .filter(t => ['received', 'diagnosing', 'waiting_parts', 'repairing'].includes(t.status))
          .sort((a, b) => new Date(b.dateIn).getTime() - new Date(a.dateIn).getTime())
          .slice(0, 5);

        // 5. Recent RMAs
        const recentRMAs = rmas
          .sort((a, b) => new Date(b.createdDate).getTime() - new Date(a.createdDate).getTime())
          .slice(0, 5);

        // 6. Top Customers (by total spent)
        const customerSpending: Record<string, number> = {};
        sales.forEach(s => {
          if (s.customerId) {
            customerSpending[s.customerId] = (customerSpending[s.customerId] || 0) + s.total;
          }
        });

        const topCustomers = customers
          .map(c => ({ ...c, calculatedSpent: customerSpending[c.id] || 0 }))
          .sort((a, b) => b.calculatedSpent - a.calculatedSpent)
          .slice(0, 5);

        setStats({
          topSelling,
          lowSelling,
          recentSales,
          pendingOrders: drafts.slice(0, 5),
          activeTickets,
          recentRMAs,
          topCustomers,
          totalRevenueToday: todayRevenue,
          totalExpensesToday: todayExpenses,
          netProfitToday: netProfitToday
        });

      } catch (error) {
        console.error("Dashboard Data Load Failed", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadDashboardData();
  }, []);

  const handleSync = async () => {
    setIsSyncing(true);
    setSyncStatus('idle');
    setErrorMessage('');

    const failsafeTimer = setTimeout(() => {
      if (isSyncing) {
        setSyncStatus('success');
        setIsSyncing(false);
      }
    }, 8000);

    try {
      const db = await getDatabase();
      await performManualSync(db);
      setSyncStatus('success');
      setTimeout(() => setSyncStatus('idle'), 5000);
    } catch (error: any) {
      setSyncStatus('error');
      setErrorMessage(error.message || 'Error');
    } finally {
      clearTimeout(failsafeTimer);
      setIsSyncing(false);
    }
  };

  const handleEmergencyUpload = async () => {
    if (!confirm('Force upload all local products? This will push data to the Node.js API when connected.')) return;
    setIsSyncing(true);
    setErrorMessage('Starting Upload...');
    try {
      const { productsCollection } = await import('../db');
      const docs = await productsCollection.query().fetch();
      const user = authService.getCurrentUser();

      if (!user?.organizationId) throw new Error('No Org ID — please log in first.');

      // TODO: Replace with apiBridge bulk sync endpoint when Node.js backend is live.
      // const { error } = await apiBridge.sync.push({ products: { created: docs.map(d => d._raw), updated: [], deleted: [] } }, 0);
      console.log(`[Dashboard] Emergency upload stub — ${docs.length} products ready.`, docs.map((d: any) => d.id));

      setSyncStatus('success');
      alert(`Upload Ready — ${docs.length} products queued (backend not connected yet).`);
    } catch (e: any) {
      setErrorMessage(e.message);
      setSyncStatus('error');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="space-y-4 md:space-y-6 animate-fade-in px-2 sm:px-0">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-zinc-100 tracking-tight">{t('dashboard.title')}</h1>
          <div className="flex flex-wrap items-center gap-2 mt-1.5">
            <span className="px-2 py-0.5 bg-slate-50 dark:bg-zinc-900 text-[9px] md:text-[10px] rounded-md text-slate-500 dark:text-zinc-400 uppercase tracking-wider font-bold border border-slate-300 dark:border-zinc-700">
              Org: {user?.organizationId?.slice(0, 8) || 'N/A'}
            </span>
            <span className="px-2 py-0.5 bg-[#3B82F6]/10 text-[#3B82F6] text-[9px] md:text-[10px] rounded-md uppercase tracking-wider font-bold border border-[#3B82F6]/20">
              {user?.role || 'Guest'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* Live Indicator */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[#10B981]/10 text-[#10B981] rounded-md text-[10px] font-bold border border-[#10B981]/20 shadow-sm">
            <div className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse shadow-[0_0_6px_rgba(16,185,129,0.8)]"></div>
            LIVE
          </div>
        </div>
      </div>

      {/* Error Message */}
      {errorMessage && (
        <div className="bg-red-500/10 text-red-400 p-3 rounded-md text-xs border border-red-500/20">
          {errorMessage}
        </div>
      )}

      {/* --- WIDGET GRID --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">

        {/* 1. FINANCIALS (Admin) */}
        {user?.role === 'admin' && (
          <div className="col-span-1 md:col-span-2 bg-white dark:bg-zinc-950 rounded-xl shadow-sm p-5 md:p-7 text-slate-900 dark:text-zinc-100 flex flex-col justify-between relative overflow-hidden border border-slate-200 dark:border-zinc-800 min-h-[160px]">
            <div className="relative z-10 w-full">
              <p className="text-slate-500 dark:text-zinc-400 text-[10px] font-bold uppercase tracking-widest mb-3">Today's Performance</p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-8">
                <div>
                  <p className="text-zinc-500 text-[10px] uppercase font-bold tracking-wider mb-1">Total Revenue</p>
                  <div className="flex items-baseline gap-1 flex-wrap">
                    <h2 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tighter truncate max-w-full text-slate-900 dark:text-zinc-100">{stats.totalRevenueToday.toLocaleString()}</h2>
                    <span className="text-xs md:text-sm font-bold text-slate-500 dark:text-zinc-400">DZD</span>
                  </div>
                </div>

                {/* Hide Net Profit for Manager, show only for Admin */}
                {user?.role === 'admin' && (
                  <div>
                    <p className="text-zinc-500 text-[10px] uppercase font-bold tracking-wider mb-1">Net Profit</p>
                    <div className="flex items-baseline gap-1 flex-wrap">
                      <h2 className={`text-xl sm:text-2xl md:text-3xl font-black tracking-tighter truncate max-w-full ${stats.netProfitToday >= 0 ? 'text-[#10B981]' : 'text-rose-400'}`}>
                        {stats.netProfitToday > 0 ? '+' : ''}{stats.netProfitToday.toLocaleString()}
                      </h2>
                      <span className="text-xs md:text-sm font-bold text-slate-500 dark:text-zinc-400">DZD</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-6 pt-4 border-t border-slate-200 dark:border-zinc-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 text-[10px] font-bold">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-zinc-500">EXPENSES</span>
                  <span className="text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-md truncate max-w-[150px] sm:max-w-none border border-rose-500/20">-{stats.totalExpensesToday.toLocaleString()} DZD</span>
                </div>
                <span className="bg-slate-50 dark:bg-zinc-900 text-slate-500 dark:text-zinc-400 border border-slate-300 dark:border-zinc-700 px-2 py-1 rounded-md tracking-wide uppercase self-end sm:self-auto">{stats.recentSales.length} Sales</span>
              </div>
            </div>
            {/* Background Decoration */}
            <div className="absolute -right-4 -bottom-4 opacity-5 text-[#3B82F6] transform rotate-12">
              <svg className="w-32 h-32 md:w-48 md:h-48" fill="currentColor" viewBox="0 0 24 24"><path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
          </div>
        )}

        {/* 2. RECENT SALES */}
        <div className="modern-card p-5 flex flex-col bg-white dark:bg-zinc-950 border-slate-200 dark:border-zinc-800">
          <h3 className="font-bold text-slate-900 dark:text-zinc-100 text-xs uppercase tracking-widest mb-5 flex items-center gap-2 opacity-80">
            <div className="w-1.5 h-1.5 rounded-full bg-[#3B82F6]"></div>
            Recent Sales
          </h3>
          <div className="space-y-4 flex-1">
            {stats.recentSales.length === 0 ? (
              <div className="h-full flex items-center justify-center py-8">
                <p className="text-xs text-zinc-500 italic">No sales recorded today.</p>
              </div>
            ) : stats.recentSales.map((sale: any) => (
              <div key={sale.id} className="flex justify-between items-center group">
                <div className="min-w-0">
                  <p className="font-bold text-slate-900 dark:text-zinc-100 text-sm tracking-tight group-hover:text-[#3B82F6] transition-colors">#{sale.id.slice(-6)}</p>
                  <p className="text-[10px] text-slate-500 dark:text-zinc-400 font-medium">{new Date(sale.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                </div>
                <div className="text-right">
                  <span className="font-mono font-bold text-[#3B82F6] bg-[#3B82F6]/10 px-2 py-1 rounded-md border border-[#3B82F6]/20 text-xs">{sale.total.toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
          <Link to="/sales-log" className="mt-6 block w-full py-2.5 text-center text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-zinc-400 bg-slate-50 dark:bg-zinc-900 hover:bg-slate-100 dark:hover:bg-[#1A1A1A] hover:text-[#3B82F6] rounded-md border border-slate-300 dark:border-zinc-700 transition-all">
            View Full Log
          </Link>
        </div>

        {/* 3. ACTIVE TICKETS */}
        <div className="modern-card p-5 flex flex-col bg-white dark:bg-zinc-950 border-slate-200 dark:border-zinc-800">
          <h3 className="font-bold text-slate-900 dark:text-zinc-100 text-xs uppercase tracking-widest mb-5 flex items-center gap-2 opacity-80">
            <div className="w-1.5 h-1.5 rounded-full bg-[#A855F7]"></div>
            Service Desk
          </h3>
          <div className="space-y-4 flex-1">
            {stats.activeTickets.length === 0 ? (
              <div className="h-full flex items-center justify-center py-8">
                <p className="text-xs text-zinc-500 italic">No active tickets.</p>
              </div>
            ) : stats.activeTickets.map((t: any) => (
              <div key={t.id} className="flex justify-between items-start gap-3 group">
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-900 dark:text-zinc-100 text-sm truncate group-hover:text-[#A855F7] transition-colors">{t.ticketNumber}</p>
                  <p className="text-[10px] text-slate-500 dark:text-zinc-400 truncate font-medium">{t.deviceType} • {t.problemDescription}</p>
                </div>
                <span className={`px-2 py-0.5 rounded-md text-[9px] uppercase font-black tracking-tighter whitespace-nowrap border ${
                  t.status === 'ready' ? 'bg-[#10B981]/10 text-[#10B981] border-[#10B981]/20' :
                  t.status === 'repairing' ? 'bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/20' : 
                  'bg-slate-50 dark:bg-zinc-900 text-slate-500 dark:text-zinc-400 border-slate-300 dark:border-zinc-700'
                }`}>
                  {t.status}
                </span>
              </div>
            ))}
          </div>
          <Link to="/service-desk" className="mt-6 block w-full py-2.5 text-center text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-zinc-400 bg-slate-50 dark:bg-zinc-900 hover:bg-slate-100 dark:hover:bg-[#1A1A1A] hover:text-[#A855F7] rounded-md border border-slate-300 dark:border-zinc-700 transition-all">
            Open Desk
          </Link>
        </div>

        {/* 4. TOP PRODUCTS */}
        <div className="modern-card p-5 flex flex-col bg-white dark:bg-zinc-950 border-slate-200 dark:border-zinc-800">
          <h3 className="font-bold text-slate-900 dark:text-zinc-100 text-xs uppercase tracking-widest mb-5 flex items-center gap-2 opacity-80">
            <div className="w-1.5 h-1.5 rounded-full bg-[#10B981]"></div>
            Top Selling
          </h3>
          <div className="space-y-4 flex-1">
            {stats.topSelling.length === 0 ? (
              <div className="h-full flex items-center justify-center py-8">
                <p className="text-xs text-zinc-500 italic">No data yet.</p>
              </div>
            ) : stats.topSelling.map((p: any) => (
              <div key={p.id} className="flex justify-between items-center group">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-slate-900 dark:text-zinc-100 truncate group-hover:text-[#10B981] transition-colors">{p.name}</p>
                  <p className="text-[10px] text-slate-500 dark:text-zinc-400 font-medium uppercase tracking-wider">{p.category}</p>
                </div>
                <div className="ml-3">
                  <span className="font-black text-[10px] text-slate-900 dark:text-zinc-100 bg-slate-50 dark:bg-zinc-900 px-2 py-1 rounded-md border border-slate-300 dark:border-zinc-700 shadow-inner">
                    {p.salesCount} <span className="opacity-50 font-bold">SOLD</span>
                  </span>
                </div>
              </div>
            ))}
          </div>
          <Link to="/inventory" className="mt-6 block w-full py-2.5 text-center text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-zinc-400 bg-slate-50 dark:bg-zinc-900 hover:bg-slate-100 dark:hover:bg-[#1A1A1A] hover:text-[#10B981] rounded-md border border-slate-300 dark:border-zinc-700 transition-all">
            Inventory
          </Link>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;
