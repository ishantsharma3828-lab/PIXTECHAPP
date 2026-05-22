
import React, { useContext } from 'react';
import { Expense } from '../../constants/expenseTypes';
import { SettingsContext } from '../../contexts/SettingsContext';
import * as expenseService from '../../services/expenseService';
import { getCurrentUser } from '../../services/authService';
import { ExpenseStatus } from '../../constants/expenseTypes';

interface ExpenseDetailsPanelProps {
    expense: Expense | null;
    onUpdate: () => void;
}

const ExpenseDetailsPanel: React.FC<ExpenseDetailsPanelProps> = ({ expense, onUpdate }) => {
    const { settings, t } = useContext(SettingsContext);
    const user = getCurrentUser();
    
    if (!expense) {
        return (
            <div className="w-[350px] bg-white dark:bg-gray-800 border-l border-slate-200 dark:border-zinc-800 flex items-center justify-center text-gray-400">
                <p>Select an expense to view details</p>
            </div>
        );
    }

    const isRightSideCurrency = settings.currencySymbol === 'DA' || settings.currencySymbol === 'DZD';
    const formatPrice = (val: number) => isRightSideCurrency ? `${val.toFixed(2)} ${settings.currencySymbol}` : `${settings.currencySymbol}${val.toFixed(2)}`;

    const handleUpdateStatus = (newStatus: ExpenseStatus) => {
        if (!user || (user.role !== 'admin' && user.role !== 'manager')) {
            return alert("Only admins or managers can update expense status.");
        }
        
        if (newStatus === 'cancelled' || newStatus === 'rejected') {
            const reason = prompt(`Enter reason for ${newStatus}:`);
            if (!reason) return;
            if (newStatus === 'cancelled') {
                expenseService.cancelExpense(expense.id, user.username, user.id, reason);
            } else {
                expenseService.updateExpenseStatus(expense.id, newStatus, user.username, user.id);
            }
        } else {
            expenseService.updateExpenseStatus(expense.id, newStatus, user.username, user.id);
        }
        onUpdate();
    };

    return (
        <div className="w-full md:w-[350px] shrink-0 bg-white dark:bg-zinc-900 border-l border-slate-200 dark:border-zinc-800 flex flex-col h-full shadow-xl z-20">
            <div className="p-6 border-b border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-gray-900 flex justify-between items-start">
                <div>
                    <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        {t('expenses.details')}
                        <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${
                            expense.status === 'paid' ? 'bg-green-100 text-green-700' :
                            expense.status === 'approved' ? 'bg-blue-100 text-blue-700' :
                            expense.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'
                        }`}>
                            {expense.status.toUpperCase()}
                        </span>
                    </h2>
                    <p className="text-sm text-slate-500 font-mono mt-1">{expense.id}</p>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {expense.status === 'cancelled' && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3 rounded text-sm text-red-800 dark:text-red-300">
                        <strong>Cancelled by {expense.cancelledBy}:</strong> {expense.cancelledReason}
                    </div>
                )}

                <div className="space-y-4">
                    <DetailRow label={t('expenses.date')} value={new Date(expense.date).toLocaleDateString()} />
                    <DetailRow label={t('expenses.category')} value={t(`expenses.cat.${expense.category}`)} />
                    <DetailRow label={t('expenses.subcategory')} value={expense.subcategory || '-'} />
                    <DetailRow label={t('expenses.description')} value={expense.description} />
                    <DetailRow label={t('expenses.responsible')} value={expense.responsiblePerson} />
                    <DetailRow label={t('stock.location')} value={expense.relatedStoreId || '-'} />
                </div>

                <div className="border-t border-slate-200 dark:border-zinc-800 pt-4 space-y-3">
                    <h4 className="font-bold text-slate-700 dark:text-gray-300 uppercase text-xs mb-2">{t('expenses.financials')}</h4>
                    <DetailRow label={t('expenses.payment_method')} value={expense.paymentMethod} />
                    <DetailRow label={t('expenses.paid_from')} value={expense.paidFrom} />
                    <DetailRow label={t('expenses.tax_amount')} value={formatPrice(expense.taxAmount)} />
                    <div className="flex justify-between items-center text-lg font-bold pt-2 border-t dark:border-zinc-800">
                        <span className="text-slate-800 dark:text-white">{t('stock.total')}</span>
                        <span className="text-[var(--color-primary)]">{formatPrice(expense.amount)}</span>
                    </div>
                </div>

                {expense.receiptUrl && (
                    <div className="border-t border-slate-200 dark:border-zinc-800 pt-4">
                        <h4 className="font-bold text-slate-700 dark:text-gray-300 uppercase text-xs mb-2">{t('expenses.receipt')}</h4>
                        <div className="rounded-lg border border-slate-200 dark:border-zinc-800 overflow-hidden">
                            <img src={expense.receiptUrl} alt="Receipt" className="w-full h-auto object-contain bg-slate-50" />
                        </div>
                    </div>
                )}
            </div>

            <div className="p-4 border-t border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-gray-900 space-y-3">
                {expense.status === 'pending' && user && (user.role === 'admin' || user.role === 'manager') && (
                    <div className="flex gap-2">
                        <button onClick={() => handleUpdateStatus('approved')} className="flex-1 py-2 bg-green-500 text-white rounded font-medium hover:bg-green-600 transition">Approve</button>
                        <button onClick={() => handleUpdateStatus('rejected')} className="flex-1 py-2 bg-red-500 text-white rounded font-medium hover:bg-red-600 transition">Reject</button>
                    </div>
                )}
                {expense.status === 'approved' && user && (user.role === 'admin' || user.role === 'manager') && (
                    <button onClick={() => handleUpdateStatus('paid')} className="w-full py-2 bg-[var(--color-primary)] text-white rounded font-medium hover:brightness-110 transition">Mark as Paid</button>
                )}
                {(expense.status === 'paid' || expense.status === 'approved') && user?.role === 'admin' && (
                    <button onClick={() => handleUpdateStatus('cancelled')} className="w-full py-2 border border-red-200 text-red-600 dark:border-red-900/30 dark:text-red-400 rounded font-medium hover:bg-red-50 dark:hover:bg-red-900/20 transition">Cancel Expense</button>
                )}

                <button 
                    onClick={() => window.print()}
                    className="w-full py-2 bg-white dark:bg-gray-800 border border-slate-300 dark:border-gray-600 rounded text-slate-700 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-gray-700 font-medium"
                >
                    {t('expenses.print_voucher')}
                </button>
            </div>
        </div>
    );
};

const DetailRow: React.FC<{label: string, value: string}> = ({label, value}) => (
    <div className="flex justify-between text-sm">
        <span className="text-slate-500">{label}</span>
        <span className="font-medium text-slate-800 dark:text-gray-200 text-right">{value}</span>
    </div>
);

export default ExpenseDetailsPanel;
