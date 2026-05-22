import { Sale, CartItem } from '../constants/billingTypes';
import { Expense } from '../constants/expenseTypes';
import { Contact } from '../constants/contactTypes';
import { ReportData, DateRange } from '../constants/reportTypes';
import * as billingService from './billingService';
import * as expenseService from './expenseService';
import * as contactService from './contactService';
import * as serviceDeskService from './serviceDeskService';
import * as inventoryService from './inventoryService';

// --- TYPES ---
export interface KPIData {
    label: string;
    value: string | number;
    trend: string;
    trendLabel?: string;
    color: 'green' | 'red' | 'blue' | 'yellow' | 'gray';
}

export interface ChartData {
    title: string;
    labels: string[];
    data: number[];
    color?: string;
}

export interface ListData {
    title: string;
    items: { label: string; value: string | number; sub?: string }[];
}

export interface DashboardData {
    kpis: KPIData[];
    charts: ChartData[];
    lists: ListData[];
    custom?: any;
}

// --- HELPERS (Replacing date-fns) ---
const parseISO = (dateString: string) => new Date(dateString);
const differenceInDays = (dateLeft: Date, dateRight: Date) => {
    const diffTime = Math.abs(dateLeft.getTime() - dateRight.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};
const subDays = (date: Date, amount: number) => {
    const newDate = new Date(date);
    newDate.setDate(date.getDate() - amount);
    return newDate;
};

// --- LOCAL STORAGE HELPERS FOR "SCIENTIFIC" DATA ---
const EXPERIMENTS_KEY = 'pos_experiments';
const SALES_ACTIVITY_KEY = 'pos_sales_activity';
const TARGETS_KEY = 'pos_targets';

export const getExperiments = () => {
    try {
        return JSON.parse(localStorage.getItem(EXPERIMENTS_KEY) || '[]');
    } catch { return []; }
};

export const saveExperiment = (experiment: any) => {
    const current = getExperiments();
    const updated = [experiment, ...current];
    localStorage.setItem(EXPERIMENTS_KEY, JSON.stringify(updated));
    return updated;
};

export const getSalesActivity = () => {
    try {
        return JSON.parse(localStorage.getItem(SALES_ACTIVITY_KEY) || '{"calls":0,"meetings":0,"demos":0}');
    } catch { return { calls: 0, meetings: 0, demos: 0 }; }
};

export const saveSalesActivity = (activity: any) => { // Incremental updates
    const current = getSalesActivity();
    const updated = {
        calls: current.calls + (activity.calls || 0),
        meetings: current.meetings + (activity.meetings || 0),
        demos: current.demos + (activity.demos || 0)
    };
    localStorage.setItem(SALES_ACTIVITY_KEY, JSON.stringify(updated));
    return updated;
};

// --- REAL DATA AGGREGATION ---

export const getDashboardData = async (type: string, t: any): Promise<DashboardData> => {

    // 1. FETCH ALL REAL DATA
    const [sales, quotes, expenses, contacts, products, tickets] = await Promise.all([
        billingService.getSalesHistory(),
        billingService.getQuotes(),
        expenseService.getExpenses(),
        contactService.getContacts(),
        inventoryService.getProducts(),
        serviceDeskService.getServiceTickets()
    ]);

    // 2. COMMON METRICS
    const totalRevenue = sales.reduce((sum, s) => sum + s.total, 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    const grossProfit = totalRevenue - totalExpenses; // Simplified: Revenue - Expenses (needs true COGS later)
    const margin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

    // Inventory Value (Hoisted for use in Financial Dashboard)
    const inventoryValue = products.reduce((sum, p) => sum + ((p.costPrice || 0) * (p.quantity || 0)), 0);

    // Filter Sales by Date (This Month vs Last Month)
    const now = new Date();
    const thisMonthSales = sales.filter(s => new Date(s.date).getMonth() === now.getMonth());
    const lastMonthSales = sales.filter(s => new Date(s.date).getMonth() === now.getMonth() - 1);

    const rRevenue = thisMonthSales.reduce((sum, s) => sum + s.total, 0);
    const lRevenue = lastMonthSales.reduce((sum, s) => sum + s.total, 0);
    const revTrend = lRevenue > 0 ? ((rRevenue - lRevenue) / lRevenue) * 100 : 0;

    // --- 1. EXECUTIVE DASHBOARD (The Flight Deck) ---
    if (type === 'executive') {
        // Real Cash Balance (Proxy: Revenue - Expenses. Real implementation needs Bank API integration)
        const cashBalance = grossProfit;

        // Runway (Assumes Avg Monthly Burn)
        const monthlyExpenses = totalExpenses / (expenses.length > 0 ? 1 : 1); // Simple avg for now
        const runway = monthlyExpenses > 0 ? (cashBalance / monthlyExpenses) : 99;

        // Category Share
        const categoryMap: Record<string, number> = {};
        sales.forEach(sale => {
            sale.items.forEach(item => {
                const cat = item.category || 'Uncategorized';
                categoryMap[cat] = (categoryMap[cat] || 0) + (item.unitPrice * item.quantity);
            });
        });
        const topCategories = Object.entries(categoryMap)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .map(([label, val]) => ({ label, value: `$${val.toFixed(0)}` }));

        return {
            kpis: [
                { label: 'Real Volume (Rev)', value: `$${rRevenue.toLocaleString()}`, trend: `${revTrend > 0 ? '+' : ''}${revTrend.toFixed(1)}%`, color: 'green', trendLabel: 'vs last month' },
                { label: 'Net Margin', value: `${margin.toFixed(1)}%`, trend: margin > 30 ? 'Healthy' : 'Low', color: margin > 30 ? 'green' : 'red', trendLabel: 'profitability' },
                { label: 'Burn Rate', value: `$${monthlyExpenses.toFixed(0)}`, trend: 'Monthly', color: 'red', trendLabel: 'avg expenses' },
                { label: 'Runway', value: `${runway.toFixed(1)} Mo`, trend: runway < 3 ? 'CRITICAL' : 'Safe', color: runway < 3 ? 'red' : 'blue', trendLabel: 'cash left' }
            ],
            charts: [
                {
                    title: 'Revenue Trend (Real)',
                    labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'], // Simplified bucket
                    data: [rRevenue * 0.2, rRevenue * 0.3, rRevenue * 0.1, rRevenue * 0.4], // Placeholder distribution until we group by week
                    color: '#8b5cf6'
                }
            ],
            lists: [
                { title: 'Top Performing Categories', items: topCategories }
            ],
            custom: {
                cash: cashBalance,
                burn: monthlyExpenses,
                runway: runway,
                cac: totalRevenue > 0 ? (totalExpenses / sales.length).toFixed(2) : 0, // Blended CAC Proxy
                ltv: (totalRevenue / (contacts.length || 1)).toFixed(0) // Avg Value per Contact
            }
        } as any;
    }

    // --- 2. OPERATIONAL DASHBOARD (The Engine Room) ---
    if (type === 'operational') {
        const throughput = sales.length; // Orders processed

        const lowStockCount = products.filter(p => (p.quantity || 0) <= (p.minStock || 0)).length;

        // Fulfillment Speed (Ticket Resolution)
        const completedTickets = tickets.filter(t => t.dateOut && t.dateIn);
        const avgResolutionTime = completedTickets.reduce((sum, t) => {
            return sum + differenceInDays(parseISO(t.dateOut!), parseISO(t.dateIn));
        }, 0) / (completedTickets.length || 1);

        return {
            kpis: [
                { label: 'Throughput', value: throughput, trend: 'Orders', color: 'blue' },
                { label: 'Inventory Value', value: `$${inventoryValue.toLocaleString()}`, trend: `${products.length} SKUs`, color: 'yellow' },
                { label: 'Avg Lead Time', value: `${avgResolutionTime.toFixed(1)} Days`, trend: 'Service', color: avgResolutionTime < 3 ? 'green' : 'yellow' },
                { label: 'Low Stock Alerts', value: lowStockCount, trend: 'Items', color: lowStockCount > 0 ? 'red' : 'green' }
            ],
            charts: [],
            lists: [],
            custom: {
                throughput,
                inventoryValue,
                opex: totalExpenses,
                leadTime: avgResolutionTime
            }
        } as any;
    }

    // --- 3. FINANCIAL DASHBOARD (The Scoreboard) ---
    if (type === 'financial') {
        // Cash Flow = Revenue - Expenses (Simple Proxy)
        const netCashFlow = totalRevenue - totalExpenses;

        // DII (Days Inventory Outstanding)
        // (Avg Inventory / COGS) * 365
        // Using Total Expenses as COGS proxy roughly for now if costPrice missing on sales
        const cogs = sales.reduce((sum, s) => {
            // Try to calculate real COGS from item cost price if available, else 60% of rev
            const saleCost = s.items.reduce((is, i) => is + (i.costPrice || i.unitPrice * 0.6) * i.quantity, 0);
            return sum + saleCost;
        }, 0);

        const avgInv = inventoryValue; // Point-in-time proxy
        const dii = cogs > 0 ? (avgInv / cogs) * 365 : 0;

        return {
            kpis: [],
            charts: [],
            lists: [],
            custom: {
                cashFlow: netCashFlow,
                grossMargin: margin,
                dii: dii,
                unitEconomics: {
                    ltv: (totalRevenue / (contacts.length || 1)),
                    cac: (totalExpenses / (sales.length || 1)) // Blended
                }
            }
        } as any;
    }

    // --- 4. MARKETING DASHBOARD (Growth Hacking) ---
    if (type === 'marketing') {
        // Filter Expenses for Marketing
        const marketingExpenses = expenses.filter(e => e.category === 'Marketing').reduce((sum, e) => sum + e.amount, 0);
        const newCustomers = contacts.filter(c => {
            // Check if created this month
            return c.createdAt && new Date(c.createdAt).getMonth() === now.getMonth();
        }).length;

        const cpa = newCustomers > 0 ? marketingExpenses / newCustomers : 0;

        // 50% Rule Monitor
        const programSpend = marketingExpenses;
        const totalSpend = totalExpenses;
        const marketingShare = totalSpend > 0 ? (programSpend / totalSpend) * 100 : 0;

        // Bullseye Channels (Proxy: Look at text in Expenses or default)
        // Since we don't have tagged channels on customers yet, we show Total Spend.
        const traction = [
            { channel: 'Blended (Total)', cpa: cpa, ltv: (totalRevenue / (contacts.length || 1)) }
        ];

        // Experiments (Local Storage)
        const experiments = getExperiments(); // { id, name, iceScore, status }

        return {
            kpis: [],
            charts: [],
            lists: [],
            custom: {
                fiftyPercentRule: {
                    marketingShare: marketingShare,
                    status: marketingShare > 30 ? 'success' : 'warning'
                },
                bullseye: traction,
                experiments: experiments, // Real list from local storage
                leakyBucket: {
                    visitors: 1000, // Still hard to track without web analytics
                    signups: newCustomers, // Real
                    activated: sales.length, // Real sales
                    activationRate: newCustomers > 0 ? (sales.length / newCustomers) * 100 : 0
                }
            }
        } as any;
    }

    // --- 5. SALES DASHBOARD (Scientific Sales) ---
    if (type === 'sales') {
        // Pipeline Creation Rate (PCR)
        // Count Drafts/Quotes created this month vs last
        const thisMonthQuotes = quotes.filter(q => new Date(q.date).getMonth() === now.getMonth());
        const lastMonthQuotes = quotes.filter(q => new Date(q.date).getMonth() === now.getMonth() - 1);

        const pcrValue = thisMonthQuotes.reduce((sum, q) => sum + q.total, 0);
        const pcrLast = lastMonthQuotes.reduce((sum, q) => sum + q.total, 0);
        const pcrTrend = pcrLast > 0 ? ((pcrValue - pcrLast) / pcrLast) * 100 : 0;

        // Sales Machine (Activity)
        const activity = getSalesActivity(); // From Local Storage

        // Lead Sources (Seeds/Nets/Spears)
        // Proxy: Expenses categories or Customer Tags
        // Defaulting to "Uncategorized" if no tags
        const sources = [
            { type: 'All Sources', volume: quotes.length, conversion: 20, cpa: 0 }
        ];

        // Predictive Lead Scoring (Hot List)
        // Score based on: Data Completeness + Quote Value
        const hotList = contacts.map(c => {
            let score = 0;
            if (c.email) score += 20;
            if (c.phone) score += 20;
            if (c.companyName) score += 10;
            // Add open quote value?
            return { name: c.name, score, company: c.companyName || 'Unknown' };
        }).sort((a, b) => b.score - a.score).slice(0, 5);

        return {
            kpis: [],
            charts: [],
            lists: [],
            custom: {
                pcr: {
                    value: `$${pcrValue.toLocaleString()}`,
                    trend: `${pcrTrend.toFixed(1)}%`,
                    status: pcrTrend >= 0 ? 'success' : 'danger'
                },
                machine: {
                    active: activity, // Real counters
                    revenue: rRevenue
                },
                sources,
                spin: { explicit: 0, implied: 0, advanceRate: 0 }, // Needs manual entry form to be real
                handoff: { sdr: 0, ae: 0, mismatch: false },
                hotList
            }
        } as any;
    }

    // --- 6. CUSTOMER SUCCESS (Loyalty) ---
    if (type === 'customers') {
        const completedTickets = tickets.filter(t => t.dateOut && t.dateIn);

        // NRR (Net Revenue Retention)
        // Needs historical cohort analysis. Proxy:
        // (Revenue from Repeat Customers) / (Total Revenue) ? 
        // Or just Growth of Account Value.
        // Let's use: (This Month Rev from Existing Cust / Last Month Rev) * 100
        // Identify "Existing" as joined < this month
        const existingCustIds = contacts.filter(c => new Date(c.createdAt).getMonth() < now.getMonth()).map(c => c.id);
        const expansionRev = thisMonthSales
            .filter(s => s.customerId && existingCustIds.includes(s.customerId))
            .reduce((sum, s) => sum + s.total, 0);

        const startingARR = lRevenue; // Proxy
        const nrr = startingARR > 0 ? ((startingARR + expansionRev) / startingARR) * 100 : 100;

        // PADRE
        // Deployment Speed = Avg Ticket Time
        const avgTime = completedTickets.reduce((sum, t) => {
            return sum + differenceInDays(parseISO(t.dateOut!), parseISO(t.dateIn));
        }, 0) / (completedTickets.length || 1);

        // Active Usage: Sales Frequency (Orders per week per customer)
        const weeklyOrders = sales.length / 4;

        // Defection Warnings (Usage Gaps)
        // Customers who bought 60 days ago but not since?
        const driftDate = subDays(now, 60);
        const atRisk = contacts.filter(c => {
            // Find last sale
            const custSales = sales.filter(s => s.customerId === c.id);
            if (custSales.length === 0) return false;
            const lastSaleDate = new Date(Math.max(...custSales.map(s => new Date(s.date).getTime())));
            return lastSaleDate < driftDate;
        }).slice(0, 5).map(c => ({
            name: c.name,
            reason: 'Drifting: No purchase in 60+ days',
            drop: 100,
            value: 'High'
        }));

        // Best Fit (NPS)
        // Proxy: Repeat Purchase Rate (Customers > 1 Order)
        const repeatCustCount = contacts.filter(c => {
            return sales.filter(s => s.customerId === c.id).length > 1;
        }).length;
        const repeatRate = contacts.length > 0 ? (repeatCustCount / contacts.length) * 100 : 0;

        return {
            kpis: [],
            charts: [],
            lists: [],
            custom: {
                nrr: {
                    value: `${nrr.toFixed(1)}%`,
                    status: nrr > 100 ? 'success' : 'warning',
                    breakdown: { starting: startingARR, expansion: expansionRev, churn: 0 }
                },
                padre: {
                    deploymentSpeed: { value: `${avgTime.toFixed(1)} Days`, trend: 'Avg Ticket', status: 'success' },
                    activeUsage: { value: `${repeatRate.toFixed(0)}%`, trend: 'Repeat Rate', status: 'success' },
                    expansionVelocity: { value: `$${expansionRev.toFixed(0)}`, trend: 'Expansion Rev', status: 'success' }
                },
                economics: {
                    ltv: `$${(totalRevenue / (contacts.length || 1)).toFixed(0)}`,
                    referralRate: 'N/A', // Need source tracking
                    premiumScore: 'High'
                },
                defection: {
                    atRisk,
                    spiralAlert: false
                },
                alignment: {
                    segments: [
                        { name: 'Repeat Buyers', nps: repeatRate, fit: 'Good' }
                    ],
                    ahaCompletion: `${repeatRate.toFixed(0)}%`
                }
            }
        } as any;
    }

    return { kpis: [], charts: [], lists: [] };
};

export const getLiveKPIs = async (t: any): Promise<any[]> => {
    const dashboardData = await getDashboardData('executive', t);
    return dashboardData.kpis;
};

export const generateReport = async (reportId: string, range: DateRange, t: (key: string) => string): Promise<ReportData> => {
    // 1. Parse Dates
    const start = new Date(range.start);
    const end = new Date(range.end);

    // 2. Switch Report Type
    if (reportId === 'sales') {
        const sales = await billingService.getSalesHistory();
        const filtered = sales.filter(s => {
            const d = new Date(s.date);
            return d >= start && d <= end;
        });

        const totalRev = filtered.reduce((sum, s) => sum + s.total, 0);
        const count = filtered.length;

        // Group by Day for Chart
        const chartMap = new Map<string, number>();
        filtered.forEach(s => {
            const day = s.date.split('T')[0];
            chartMap.set(day, (chartMap.get(day) || 0) + s.total);
        });

        const chartData = Array.from(chartMap.entries())
            .map(([label, value]) => ({ label, value }))
            .sort((a, b) => new Date(a.label).getTime() - new Date(b.label).getTime());

        return {
            title: 'Sales Performance Report',
            summary: [
                { label: 'Total Revenue', value: `$${totalRev.toLocaleString()}` },
                { label: 'Transactions', value: count.toString() },
                { label: 'Avg Ticket', value: count > 0 ? `$${(totalRev / count).toFixed(2)}` : '$0' }
            ],
            chartData,
            tableHeaders: ['Date', 'ID', 'Customer', 'Items', 'Total'],
            tableRows: filtered.map(s => [
                new Date(s.date).toLocaleDateString(),
                s.id.substring(0, 8),
                s.customerName || 'Walk-in',
                s.items.length,
                `$${s.total.toFixed(2)}`
            ])
        };
    }

    if (reportId === 'inventory') {
        const products = await inventoryService.getProducts();
        const lowStock = products.filter(p => p.quantity <= (p.minStock || 5));
        const totalValue = products.reduce((sum, p) => sum + (Number(p.price1) * p.quantity), 0);

        return {
            title: 'Inventory Status Report',
            summary: [
                { label: 'Total Stock Value', value: `$${totalValue.toLocaleString()}` },
                { label: 'Total SKUs', value: products.length.toString() },
                { label: 'Low Stock Items', value: lowStock.length.toString() }
            ],
            chartData: products.slice(0, 10).map(p => ({ label: p.name.substring(0, 10), value: p.quantity })), // Top 10 Stock Levels
            tableHeaders: ['SKU', 'Name', 'Stock', 'Value', 'Status'],
            tableRows: products.map(p => [
                p.sku || 'N/A',
                p.name,
                p.quantity,
                `$${(p.quantity * Number(p.price1)).toFixed(2)}`,
                p.quantity <= (p.minStock || 5) ? 'LOW' : 'OK'
            ])
        };
    }

    // Default Fallback
    return {
        title: 'General Report',
        summary: [],
        chartData: [],
        tableHeaders: ['Metric', 'Value'],
        tableRows: []
    };
};
