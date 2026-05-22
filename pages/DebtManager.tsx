import React, { useState, useEffect, useContext } from 'react';
import { SettingsContext } from '../contexts/SettingsContext';
import * as billingService from '../services/billingService';
import { Sale, DebtDetails } from '../constants/billingTypes';
import {
    Calendar,
    CheckCircle,
    AlertCircle,
    Search,
    ChevronDown,
    ChevronUp,
    CreditCard,
    DollarSign,
    Landmark
} from 'lucide-react';

const DebtManager: React.FC = () => {
    const { t, settings } = useContext(SettingsContext);
    const [debts, setDebts] = useState<Sale[]>([]);
    const [expandedRow, setExpandedRow] = useState<string | null>(null);

    useEffect(() => {
        loadDebts();
    }, []);

    const loadDebts = async () => {
        // Fetch all sales and filter for debts
        // In a real app, use a dedicated API endpoint like /sales/debts
        const allSales = await billingService.getSalesHistory();
        const debtSales = allSales.filter(sale =>
            (sale.debtDetails && sale.debtDetails.isDebt) ||
            sale.payments.some(p => p.method === 'facilite')
        );
        setDebts(debtSales);
    };

    const [paymentModalOpen, setPaymentModalOpen] = useState(false);
    const [selectedInstallment, setSelectedInstallment] = useState<{ saleId: string, index: number, amount: number } | null>(null);

    const openPaymentModal = (saleId: string, index: number, amount: number) => {
        setSelectedInstallment({ saleId, index, amount });
        setPaymentModalOpen(true);
    };

    const confirmPayment = async (method: 'cash' | 'card' | 'transfer') => {
        if (!selectedInstallment) return;

        try {
            await billingService.updateDebtInstallment(selectedInstallment.saleId, selectedInstallment.index, method);
            loadDebts(); // Refresh list
            setPaymentModalOpen(false);
            setSelectedInstallment(null);
        } catch (error) {
            console.error("Failed to update installment", error);
            alert("Error updating payment status");
        }
    };

    return (
        <div className="h-full flex flex-col p-4 sm:p-6 lg:p-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2 tracking-tight">
                        <AlertCircle className="text-orange-500 w-6 h-6" />
                        Details & Plans
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Track customer debts and payment plans</p>
                </div>
                <div className="w-full sm:w-auto relative group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 w-4 h-4 group-focus-within:text-blue-500 transition-colors" />
                    <input
                        type="text"
                        placeholder="Search Customer..."
                        className="w-full sm:w-64 pl-10 pr-4 py-2 sm:py-2.5 text-sm border rounded-xl bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all dark:text-white placeholder-slate-400 dark:placeholder-slate-500 shadow-sm"
                    />
                </div>
            </div>

            <div className="bg-white dark:bg-zinc-900/50 rounded-2xl shadow-sm border border-slate-200 dark:border-zinc-800 flex-1 flex flex-col overflow-hidden">
                <div className="overflow-y-auto flex-1 custom-scrollbar">
                    {/* Desktop Table View */}
                    <div className="hidden md:block min-w-[800px]">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50/80 dark:bg-zinc-900/80 backdrop-blur border-b border-slate-200 dark:border-zinc-800 text-slate-500 dark:text-slate-400 uppercase text-[10px] sm:text-xs font-bold tracking-wider sticky top-0 z-10">
                                <tr>
                                    <th className="p-3 sm:p-4">Customer</th>
                                    <th className="p-3 sm:p-4">Date</th>
                                    <th className="p-3 sm:p-4">Plan / Type</th>
                                    <th className="p-3 sm:p-4 font-mono">Total Debt</th>
                                    <th className="p-3 sm:p-4">Next Due</th>
                                    <th className="p-3 sm:p-4">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/50">
                                {debts.map(sale => {
                                    const debt = sale.debtDetails;
                                    const isExpanded = expandedRow === sale.id;

                                    return (
                                        <React.Fragment key={sale.id}>
                                            <tr className={`hover:bg-slate-50/50 dark:hover:bg-zinc-800/20 transition-all cursor-pointer ${isExpanded ? 'bg-blue-50/30 dark:bg-blue-900/10' : ''}`} onClick={() => setExpandedRow(isExpanded ? null : sale.id)}>
                                                <td className="p-3 sm:p-4">
                                                    <div className="font-bold text-slate-800 dark:text-slate-200 text-sm sm:text-base">
                                                        {sale.customerName || 'Unknown'}
                                                    </div>
                                                    <div className="text-[10px] sm:text-xs text-slate-400 dark:text-slate-500 font-mono mt-0.5">ID: {sale.id.substring(0, 8)}</div>
                                                </td>
                                                <td className="p-3 sm:p-4 text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-medium">
                                                    {new Date(sale.date).toLocaleDateString()}
                                                </td>
                                                <td className="p-3 sm:p-4">
                                                    {debt?.installments ? (
                                                        <span className="inline-flex items-center px-2 py-1 bg-teal-100 dark:bg-teal-500/10 text-teal-700 dark:text-teal-400 border border-teal-200 dark:border-teal-500/20 rounded-md text-[10px] sm:text-xs font-bold uppercase tracking-wider">
                                                            Facilité ({debt.installments.length}x)
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center px-2 py-1 bg-orange-100 dark:bg-orange-500/10 text-orange-700 dark:text-orange-400 border border-orange-200 dark:border-orange-500/20 rounded-md text-[10px] sm:text-xs font-bold uppercase tracking-wider">
                                                            Standard
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="p-3 sm:p-4 font-mono font-bold text-red-500 dark:text-red-400 tracking-tight text-sm sm:text-base">
                                                    {settings.currencySymbol} {debt?.totalDebtAmount.toFixed(2)}
                                                </td>
                                                <td className="p-3 sm:p-4 text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-medium">
                                                    {debt?.dueDate ? new Date(debt.dueDate).toLocaleDateString() : 'N/A'}
                                                </td>
                                                <td className="p-3 sm:p-4">
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); setExpandedRow(isExpanded ? null : sale.id); }}
                                                        className={`p-1.5 rounded-lg border transition-all ${isExpanded ? 'bg-blue-100 border-blue-200 text-blue-600 dark:bg-blue-500/20 dark:border-blue-500/30 dark:text-blue-400' : 'bg-slate-100 border-slate-200 text-slate-500 hover:bg-slate-200 dark:bg-zinc-800 dark:border-zinc-700 dark:text-slate-400 dark:hover:bg-zinc-700'}`}
                                                    >
                                                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                                    </button>
                                                </td>
                                            </tr>
                                            {isExpanded && debt?.installments && (
                                                <tr className="bg-slate-50/50 dark:bg-zinc-900/50 border-b border-slate-100 dark:border-zinc-800/50">
                                                    <td colSpan={6} className="p-4 sm:p-6">
                                                        <div className="max-w-4xl mx-auto bg-white dark:bg-zinc-950 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-sm overflow-hidden animate-fade-in-down">
                                                            <div className="px-4 py-3 border-b border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/50 flex justify-between items-center">
                                                                <h4 className="font-bold text-sm text-slate-700 dark:text-slate-300">Payment Plan Details</h4>
                                                            </div>
                                                            <table className="w-full text-sm">
                                                                <thead className="bg-slate-50/50 dark:bg-zinc-900/20 border-b border-slate-100 dark:border-zinc-800/50 text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider">
                                                                    <tr>
                                                                        <th className="px-4 py-3 font-semibold text-left">#</th>
                                                                        <th className="px-4 py-3 font-semibold text-left">Due Date</th>
                                                                        <th className="px-4 py-3 font-semibold text-right">Amount</th>
                                                                        <th className="px-4 py-3 font-semibold text-center">Status</th>
                                                                        <th className="px-4 py-3 font-semibold text-right">Action</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/50">
                                                                    {debt.installments.map((inst, i) => (
                                                                        <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-zinc-800/20 transition-colors">
                                                                            <td className="px-4 py-3 font-mono text-xs text-slate-500 dark:text-slate-400">{i + 1}</td>
                                                                            <td className="px-4 py-3 text-slate-700 dark:text-slate-300 font-medium">{new Date(inst.dueDate).toLocaleDateString()}</td>
                                                                            <td className="px-4 py-3 text-right font-mono font-bold text-slate-700 dark:text-slate-200">{settings.currencySymbol}{inst.amount.toFixed(2)}</td>
                                                                            <td className="px-4 py-3 text-center">
                                                                                {inst.isPaid ? (
                                                                                    <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border border-emerald-100 dark:border-emerald-500/20">
                                                                                        <CheckCircle className="w-3.5 h-3.5" /> Paid
                                                                                    </span>
                                                                                ) : (
                                                                                    <span className="inline-flex text-orange-500 dark:text-orange-400 bg-orange-50 dark:bg-orange-500/10 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border border-orange-100 dark:border-orange-500/20">
                                                                                        PENDING
                                                                                    </span>
                                                                                )}
                                                                            </td>
                                                                            <td className="px-4 py-3 text-right">
                                                                                {!inst.isPaid && (
                                                                                    <button
                                                                                        onClick={() => openPaymentModal(sale.id, i, inst.amount)}
                                                                                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition-transform active:scale-95 shadow-sm shadow-blue-500/20"
                                                                                    >
                                                                                        Pay Now
                                                                                    </button>
                                                                                )}
                                                                            </td>
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile Card List View */}
                    <div className="md:hidden flex flex-col p-2 space-y-3">
                        {debts.map(sale => {
                            const debt = sale.debtDetails;
                            const isExpanded = expandedRow === sale.id;

                            return (
                                <div key={sale.id} className={`bg-white dark:bg-zinc-900 border rounded-xl overflow-hidden transition-all shadow-sm ${isExpanded ? 'border-blue-300 dark:border-blue-500/50 shadow-md ring-1 ring-blue-500/20' : 'border-slate-200 dark:border-zinc-800'}`}>
                                    {/* Card Header */}
                                    <div 
                                        className={`p-3 sm:p-4 flex flex-col gap-2 cursor-pointer transition-colors ${isExpanded ? 'bg-blue-50/30 dark:bg-blue-900/10' : 'hover:bg-slate-50 dark:hover:bg-zinc-800/30'}`}
                                        onClick={() => setExpandedRow(isExpanded ? null : sale.id)}
                                    >
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <div className="font-bold text-slate-800 dark:text-slate-200 text-sm">{sale.customerName || 'Unknown'}</div>
                                                <div className="text-[10px] text-slate-400 dark:text-slate-500 font-mono mt-0.5">ID: {sale.id.substring(0, 8)}</div>
                                            </div>
                                            <div className="text-right">
                                                 <div className="font-mono font-bold text-red-500 dark:text-red-400 text-sm">
                                                    {settings.currencySymbol} {debt?.totalDebtAmount.toFixed(2)}
                                                </div>
                                                <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Due: {debt?.dueDate ? new Date(debt.dueDate).toLocaleDateString() : 'N/A'}</div>
                                            </div>
                                        </div>
                                        
                                        <div className="flex justify-between items-end mt-1">
                                            <div className="flex items-center gap-2">
                                                <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1 bg-slate-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-zinc-700">
                                                    <Calendar className="w-3 h-3" />
                                                    {new Date(sale.date).toLocaleDateString()}
                                                </div>
                                                {debt?.installments ? (
                                                    <span className="inline-flex items-center px-1.5 py-0.5 bg-teal-100 dark:bg-teal-500/10 text-teal-700 dark:text-teal-400 border border-teal-200 dark:border-teal-500/20 rounded text-[9px] font-bold uppercase tracking-wider">
                                                        Facilité ({debt.installments.length}x)
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center px-1.5 py-0.5 bg-orange-100 dark:bg-orange-500/10 text-orange-700 dark:text-orange-400 border border-orange-200 dark:border-orange-500/20 rounded text-[9px] font-bold uppercase tracking-wider">
                                                        Standard
                                                    </span>
                                                )}
                                            </div>
                                            <button className={`p-1.5 rounded border transition-colors ${isExpanded ? 'bg-blue-100 border-blue-200 text-blue-600 dark:bg-blue-500/30 dark:border-blue-500/50 dark:text-blue-300' : 'bg-slate-100 border-slate-200 text-slate-500 dark:bg-zinc-800 dark:border-zinc-700 dark:text-slate-400'}`}>
                                                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Expanded Details */}
                                    {isExpanded && debt?.installments && (
                                        <div className="border-t border-slate-100 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-950/50 p-2 sm:p-3">
                                            <h4 className="text-[10px] sm:text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 px-1">Payment Plan</h4>
                                            <div className="space-y-2">
                                                {debt.installments.map((inst, i) => (
                                                    <div key={i} className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg p-2.5 flex items-center justify-between">
                                                        <div className="flex flex-col">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-[10px] font-mono text-slate-400 bg-slate-100 dark:bg-zinc-800 px-1 rounded">#{i + 1}</span>
                                                                <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{new Date(inst.dueDate).toLocaleDateString()}</span>
                                                            </div>
                                                            <span className="text-sm font-mono font-bold text-slate-800 dark:text-white mt-0.5">{settings.currencySymbol}{inst.amount.toFixed(2)}</span>
                                                        </div>
                                                        <div className="flex flex-col items-end gap-1.5">
                                                             {inst.isPaid ? (
                                                                <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border border-emerald-100 dark:border-emerald-500/20">
                                                                    <CheckCircle className="w-3 h-3" /> Paid
                                                                </span>
                                                            ) : (
                                                                <span className="inline-flex text-orange-500 dark:text-orange-400 bg-orange-50 dark:bg-orange-500/10 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border border-orange-100 dark:border-orange-500/20">
                                                                    PENDING
                                                                </span>
                                                            )}
                                                            {!inst.isPaid && (
                                                                <button
                                                                    onClick={() => openPaymentModal(sale.id, i, inst.amount)}
                                                                    className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-[10px] font-bold transition-transform active:scale-95 shadow-sm shadow-blue-500/20"
                                                                >
                                                                    Pay Now
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {debts.length === 0 && (
                        <div className="p-8 sm:p-12 text-center flex flex-col items-center justify-center h-full">
                             <div className="w-16 h-16 bg-slate-100 dark:bg-zinc-800/50 rounded-full flex items-center justify-center mb-4">
                                <AlertCircle className="w-8 h-8 text-slate-400" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300 mb-1">No Active Debts</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-500 max-w-sm mx-auto">There are currently no active debts or pending payment plans in the system.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Modernized Payment Modal */}
            {paymentModalOpen && selectedInstallment && (
                <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-fade-in-up" onClick={() => setPaymentModalOpen(false)}>
                    <div className="bg-white dark:bg-zinc-950 p-6 rounded-2xl shadow-2xl w-full max-w-sm border border-slate-200 dark:border-zinc-800" onClick={e => e.stopPropagation()}>
                        <div className="text-center mb-6">
                            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm border border-blue-200 dark:border-blue-500/30">
                                <DollarSign className="w-6 h-6" />
                            </div>
                            <h3 className="text-xl font-extrabold text-slate-800 dark:text-white tracking-tight">Confirm Payment</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                                Installment #{selectedInstallment.index + 1} for <span className="font-bold text-slate-700 dark:text-slate-300 font-mono">{settings.currencySymbol}{selectedInstallment.amount.toFixed(2)}</span>
                            </p>
                        </div>

                        <div className="space-y-2.5">
                            <button
                                onClick={() => confirmPayment('cash')}
                                className="w-full py-3.5 px-4 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30 rounded-xl font-bold flex justify-center items-center gap-2.5 transition-all active:scale-[0.98]"
                            >
                                <DollarSign className="w-4 h-4" />
                                Cash Payment
                            </button>
                            <button
                                onClick={() => confirmPayment('card')}
                                className="w-full py-3.5 px-4 bg-blue-50 hover:bg-blue-100 dark:bg-blue-500/10 dark:hover:bg-blue-500/20 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-500/30 rounded-xl font-bold flex justify-center items-center gap-2.5 transition-all active:scale-[0.98]"
                            >
                                <CreditCard className="w-4 h-4" />
                                Card Payment
                            </button>
                            <button
                                onClick={() => confirmPayment('transfer')}
                                className="w-full py-3.5 px-4 bg-purple-50 hover:bg-purple-100 dark:bg-purple-500/10 dark:hover:bg-purple-500/20 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-500/30 rounded-xl font-bold flex justify-center items-center gap-2.5 transition-all active:scale-[0.98]"
                            >
                                <Landmark className="w-4 h-4" />
                                Bank Transfer
                            </button>
                        </div>

                        <button
                            onClick={() => setPaymentModalOpen(false)}
                            className="mt-4 w-full py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 border border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl transition-all"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}
            
            <style>{`
            .custom-scrollbar::-webkit-scrollbar {
              width: 4px;
              height: 4px;
            }
            .custom-scrollbar::-webkit-scrollbar-track {
              background: transparent;
            }
            .custom-scrollbar::-webkit-scrollbar-thumb {
              background: #cbd5e1;
              border-radius: 10px;
            }
            .dark .custom-scrollbar::-webkit-scrollbar-thumb {
              background: #334155;
            }
            @keyframes fade-in-up {
              from { opacity: 0; transform: translateY(10px); }
              to { opacity: 1; transform: translateY(0); }
            }
            .animate-fade-in-up {
              animation: fade-in-up 0.2s ease-out forwards;
            }
            @keyframes fade-in-down {
              from { opacity: 0; transform: translateY(-10px); }
              to { opacity: 1; transform: translateY(0); }
            }
            .animate-fade-in-down {
              animation: fade-in-down 0.2s ease-out forwards;
            }
          `}</style>
        </div>
    );
};

export default DebtManager;

