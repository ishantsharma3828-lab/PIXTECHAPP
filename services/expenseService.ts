
import { Expense, ExpenseCategory, ExpenseStatus } from '../constants/expenseTypes';
import { logExpenseCreated, logExpenseStatusChange } from './activityLogService';
import { addNotification } from './notificationService';

const EXPENSES_KEY = 'pos_expenses';

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
    'Rent', 'Salaries', 'Utilities', 'Marketing', 'Maintenance', 'Logistics', 'Inventory', 'Office', 'Other'
];

export const getExpenses = (): Expense[] => {
    try {
        const stored = localStorage.getItem(EXPENSES_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch (e) {
        console.error("Failed to load expenses", e);
        return [];
    }
};

export const saveExpense = (expense: Expense): Expense => {
    const expenses = getExpenses();
    const index = expenses.findIndex(e => e.id === expense.id);
    
    if (index >= 0) {
        expenses[index] = expense;
    } else {
        expenses.unshift(expense);
    }
    
    localStorage.setItem(EXPENSES_KEY, JSON.stringify(expenses));
    return expense;
};

export const createExpense = (data: Omit<Expense, 'id' | 'status'>, username: string, userId: string): Expense => {
    const newExpense: Expense = {
        ...data,
        id: `exp_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        status: 'pending'
    };
    const saved = saveExpense(newExpense);
    
    // Log and notify
    logExpenseCreated(userId, username, saved.id, saved.amount);
    addNotification({
        title: 'New Expense Submitted',
        message: `${username} submitted an expense for ${saved.amount.toFixed(2)}. Needs approval.`,
        type: 'info',
        audience: 'admin'
    });

    return saved;
};

export const updateExpenseStatus = (id: string, status: ExpenseStatus, username: string, userId: string): Expense | null => {
    const expenses = getExpenses();
    const index = expenses.findIndex(e => e.id === id);
    if (index === -1) return null;

    const updated = {
        ...expenses[index],
        status
    };
    
    expenses[index] = updated;
    localStorage.setItem(EXPENSES_KEY, JSON.stringify(expenses));
    
    logExpenseStatusChange(userId, username, updated.id, status);
    
    addNotification({
        title: 'Expense Status Updated',
        message: `Expense ${updated.id} is now ${status}.`,
        type: status === 'approved' ? 'success' : status === 'rejected' ? 'error' : 'info',
    });

    return updated;
};

export const cancelExpense = (id: string, username: string, userId: string, reason: string): Expense | null => {
    const expenses = getExpenses();
    const index = expenses.findIndex(e => e.id === id);
    if (index === -1) return null;

    const updated = {
        ...expenses[index],
        status: 'cancelled' as const,
        cancelledBy: username,
        cancelledReason: reason
    };
    
    expenses[index] = updated;
    localStorage.setItem(EXPENSES_KEY, JSON.stringify(expenses));
    
    logExpenseStatusChange(userId, username, updated.id, 'cancelled');
    
    return updated;
};
