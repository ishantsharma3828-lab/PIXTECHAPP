
import React, { useContext, useState } from 'react';
import { Expense } from '../../constants/expenseTypes';
import { SettingsContext } from '../../contexts/SettingsContext';
import * as expenseService from '../../services/expenseService';

interface ExpensesListProps {
    expenses: Expense[];
    selectedId: string | null;
    onSelect: (expense: Expense) => void;
}

const ExpensesList: React.FC<ExpensesListProps> = ({ expenses, selectedId, onSelect }) => {
    const { settings, t } = useContext(SettingsContext);
    const [filterCategory, setFilterCategory] = useState<string>('all');
    
    const isRightSideCurrency = settings.currencySymbol === 'DA' || settings.currencySymbol === 'DZD';
    const formatPrice = (val: number) => isRightSideCurrency ? `${val.toFixed(2)} ${settings.currencySymbol}` : `${settings.currencySymbol}${val.toFixed(2)}`;

    const filteredExpenses = expenses.filter(e => {
        if (filterCategory !== 'all' && e.category !== filterCategory) return false;
        return true;
    });

    return (
        <div className="flex-1 bg-slate-100 dark:bg-zinc-950 flex flex-col min-w-0 md:min-w-[400px]">
            <div className="p-4 bg-white dark:bg-zinc-950 border-b border-slate-200 dark:border-zinc-800 shadow-sm sticky top-0 z-10 flex justify-between items-center">
                <h3 className="font-bold text-slate-800 dark:text-white text-lg">{t('expenses.ledger')}</h3>
                <select 
                    value={filterCategory} 
                    onChange={(e) => setFilterCategory(e.target.value)}
                    className="text-sm border rounded bg-slate-50 dark:bg-zinc-900 dark:border-zinc-800 dark:text-white px-2 py-1 outline-none focus:ring-1 focus:ring-blue-500"
                >
                    <option value="all">{t('common.all')}</option>
                    {expenseService.EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{t(`expenses.cat.${c}`)}</option>)}
                </select>
            </div>

            <div className="flex-1 overflow-auto bg-slate-50 dark:bg-transparent p-2 md:p-0">
                {/* Desktop Table View */}
                <table className="min-w-full text-sm hidden md:table">
                    <thead className="bg-slate-50 dark:bg-zinc-900 sticky top-0">
                        <tr className="text-left text-xs font-semibold text-slate-500 dark:text-zinc-400 uppercase">
                            <th className="px-4 py-3">{t('expenses.date')}</th>
                            <th className="px-4 py-3">{t('expenses.category')}</th>
                            <th className="px-4 py-3">{t('expenses.description')}</th>
                            <th className="px-4 py-3 text-right">{t('expenses.amount')}</th>
                            <th className="px-4 py-3 text-center">{t('expenses.status')}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-[#1F1F1F] bg-white dark:bg-zinc-950">
                        {filteredExpenses.length === 0 ? (
                            <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-500">{t('expenses.no_expenses')}</td></tr>
                        ) : (
                            filteredExpenses.map(expense => (
                                <tr 
                                    key={expense.id} 
                                    onClick={() => onSelect(expense)}
                                    className={`cursor-pointer hover:bg-slate-50 dark:hover:bg-zinc-900 transition-colors ${selectedId === expense.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''} ${expense.status === 'cancelled' ? 'opacity-60 bg-red-50 dark:bg-red-900/10' : ''}`}
                                >
                                    <td className="px-4 py-3 whitespace-nowrap text-slate-600 dark:text-gray-300">
                                        {new Date(expense.date).toLocaleDateString()}
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className="bg-slate-100 dark:bg-zinc-900 px-2 py-1 rounded text-xs font-medium text-slate-700 dark:text-gray-300 border border-slate-200 dark:border-zinc-800">
                                            {t(`expenses.cat.${expense.category}`)}
                                        </span>
                                        {expense.subcategory && <span className="text-xs text-slate-500 ml-1">/ {expense.subcategory}</span>}
                                    </td>
                                    <td className="px-4 py-3 text-slate-800 dark:text-white truncate max-w-[200px]">
                                        {expense.description}
                                    </td>
                                    <td className="px-4 py-3 text-right font-bold text-slate-900 dark:text-white">
                                        {formatPrice(expense.amount)}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        {expense.status === 'cancelled' ? (
                                            <span className="text-xs text-red-600 font-bold uppercase">{t('expenses.status_cancelled')}</span>
                                        ) : (
                                            <span className="text-xs text-green-600 font-bold uppercase">{t('expenses.status_active')}</span>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>

                {/* Mobile Card View */}
                <div className="md:hidden flex flex-col space-y-2">
                    {filteredExpenses.length === 0 ? (
                        <div className="p-10 text-center text-slate-500">{t('expenses.no_expenses')}</div>
                    ) : (
                        filteredExpenses.map(expense => (
                            <div 
                                key={expense.id}
                                onClick={() => onSelect(expense)}
                                className={`p-3 bg-white dark:bg-zinc-950 rounded-xl shadow-sm border border-slate-200 dark:border-zinc-800 flex flex-col gap-2 ${selectedId === expense.id ? 'ring-2 ring-blue-500' : ''} ${expense.status === 'cancelled' ? 'opacity-60' : ''}`}
                            >
                                <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-2">
                                        <span className="bg-slate-100 dark:bg-zinc-900 px-2 py-1 rounded text-xs font-medium text-slate-700 dark:text-gray-300 border border-slate-200 dark:border-zinc-800">
                                            {t(`expenses.cat.${expense.category}`)}
                                        </span>
                                        {expense.subcategory && <span className="text-xs text-slate-500">/ {expense.subcategory}</span>}
                                    </div>
                                    <span className="text-xs text-slate-500">{new Date(expense.date).toLocaleDateString()}</span>
                                </div>
                                <div className="flex justify-between items-end mt-1">
                                    <span className="text-sm text-slate-800 dark:text-white line-clamp-1 flex-1 pr-2">{expense.description}</span>
                                    <div className="flex flex-col items-end shrink-0">
                                        <span className="font-bold text-slate-900 dark:text-white shadow-sm">{formatPrice(expense.amount)}</span>
                                        {expense.status === 'cancelled' && <span className="text-[10px] text-red-600 font-bold uppercase tracking-wider">{t('expenses.status_cancelled')}</span>}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default ExpensesList;
