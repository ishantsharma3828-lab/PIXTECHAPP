
import React, { useState, useEffect } from 'react';
import AddExpensePanel from './AddExpensePanel';
import ExpensesList from './ExpensesList';
import ExpenseDetailsPanel from './ExpenseDetailsPanel';
import { Expense } from '../../constants/expenseTypes';
import * as expenseService from '../../services/expenseService';
import { usePermissions } from '../../hooks/usePermissions';

const ExpensesPanel: React.FC = () => {
    const { allowedTabs, canAddExpense, canViewExpenseHistory } = usePermissions();

    // TabGuard in App.tsx already blocks access — this is a secondary check
    if (!allowedTabs.has('expenses')) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-slate-500">
                <h2 className="text-xl font-bold mb-2">Access Restricted</h2>
                <p>You do not have permission to view Expenses.</p>
            </div>
        );
    }

    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
    const [isMobilePanelOpen, setIsMobilePanelOpen] = useState<'sidebar' | 'main'>('sidebar');
    const [view, setView] = useState<'new' | 'detail'>(canViewExpenseHistory ? 'list' : 'new' as any); // fallback cast because it might default to 'new'

    const loadData = () => {
        const data = expenseService.getExpenses();
        setExpenses(data);
        if (selectedExpense) {
            const updated = data.find(e => e.id === selectedExpense.id);
            if (updated) setSelectedExpense(updated);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleSelect = (expense: Expense) => {
        setSelectedExpense(expense);
        setView('detail');
        setIsMobilePanelOpen('main');
    };

    const handleSave = (newExpenseId?: string) => {
        const updatedData = expenseService.getExpenses();
        setExpenses(updatedData);
        if (newExpenseId) {
            const newExpense = updatedData.find(e => e.id === newExpenseId);
            if (newExpense) setSelectedExpense(newExpense);
        }
        setView('detail');
        setIsMobilePanelOpen('main');
    };

    return (
        <div className="flex h-full -mx-4 sm:-mx-6 md:-m-8 overflow-hidden relative bg-white dark:bg-gray-900">
            {/* Context Actions for Mobile */}
            <div className="md:hidden absolute bottom-[calc(1rem+env(safe-area-inset-bottom,0px))] right-4 z-40 flex flex-col gap-3">
                {canAddExpense && (
                    <button 
                        onClick={() => { setView('new'); setSelectedExpense(null); setIsMobilePanelOpen('main'); }}
                        className="w-14 h-14 bg-[var(--color-primary)] text-white rounded-full shadow-xl flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
                    >
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                    </button>
                )}
            </div>

            {/* Left Sidebar */}
            <div className={`flex flex-col border-r border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-gray-800/50 shrink-0 md:w-[360px] md:relative md:flex md:inset-auto md:z-auto ${isMobilePanelOpen === 'sidebar' ? 'absolute inset-0 w-full z-50' : 'hidden'}`}>
                {canAddExpense && (
                    <div className="p-4 border-b border-slate-200 dark:border-zinc-800">
                        <button
                            onClick={() => { setView('new'); setSelectedExpense(null); setIsMobilePanelOpen('main'); }}
                            className="w-full py-2 bg-[var(--color-primary)] text-white font-medium rounded-lg hover:brightness-110 flex items-center justify-center gap-2"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                            New Expense
                        </button>
                    </div>
                )}
                
                <div className="flex-1 overflow-hidden flex flex-col">
                    {canViewExpenseHistory ? (
                        <ExpensesList
                            expenses={expenses}
                            selectedId={selectedExpense?.id || null}
                            onSelect={handleSelect}
                        />
                    ) : (
                        <div className="p-5 text-center text-slate-500">
                            History hidden based on your permissions.
                        </div>
                    )}
                </div>
            </div>

            {/* Main Content Area */}
            <div className={`flex-1 overflow-y-auto bg-white dark:bg-gray-900 md:relative md:block md:inset-auto md:z-auto ${isMobilePanelOpen === 'main' ? 'absolute inset-0 w-full z-50' : 'hidden'}`}>
                {/* Mobile Back Button */}
                <div className="md:hidden flex items-center p-4 border-b border-slate-200 dark:border-zinc-800">
                    <button onClick={() => setIsMobilePanelOpen('sidebar')} className="p-2 -ml-2 text-slate-600 dark:text-gray-300">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                    </button>
                    <h2 className="ml-2 text-lg font-bold">{view === 'new' ? 'New Expense' : 'Expense Details'}</h2>
                </div>

                <div className="p-4 md:p-8 h-full">
                    {view === 'new' && canAddExpense ? (
                        <div className="max-w-2xl mx-auto border border-slate-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm h-full">
                            <AddExpensePanel onSave={handleSave} />
                        </div>
                    ) : selectedExpense && canViewExpenseHistory ? (
                        <div className="max-w-3xl mx-auto h-full">
                            <ExpenseDetailsPanel
                                expense={selectedExpense}
                                onUpdate={loadData}
                            />
                        </div>
                    ) : (
                        <div className="flex items-center justify-center h-full text-slate-400">
                            Select an expense to view details
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ExpensesPanel;
