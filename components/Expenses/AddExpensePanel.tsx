
import React, { useState, useContext, useRef } from 'react';
import { SettingsContext } from '../../contexts/SettingsContext';
import { ExpenseCategory, ExpensePaymentMethod } from '../../constants/expenseTypes';
import * as expenseService from '../../services/expenseService';
import { getCurrentUser } from '../../services/authService';

interface AddExpensePanelProps {
    onSave: (newExpenseId?: string) => void;
}

const AddExpensePanel: React.FC<AddExpensePanelProps> = ({ onSave }) => {
    const { settings, t } = useContext(SettingsContext);
    const user = getCurrentUser();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [formData, setFormData] = useState({
        date: new Date().toISOString().split('T')[0],
        category: 'Office' as ExpenseCategory,
        subcategory: '',
        description: '',
        amount: '',
        paymentMethod: 'Cash' as ExpensePaymentMethod,
        paidFrom: 'Cash Drawer',
        responsiblePerson: user?.username || '',
        relatedStoreId: 'Main Store',
        relatedTechnicianId: '',
        isTaxIncluded: true,
        taxRate: 0,
        receiptUrl: ''
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        const checked = (e.target as HTMLInputElement).checked;
        
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onload = (ev) => {
                setFormData(prev => ({ ...prev, receiptUrl: ev.target?.result as string }));
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const amount = parseFloat(formData.amount);
        if (!amount || amount <= 0) return alert("Please enter a valid amount");

        // Calculate Tax
        let taxAmount = 0;
        if (formData.taxRate > 0) {
            if (formData.isTaxIncluded) {
                // Amount = Base + Tax
                // Base = Amount / (1 + Rate)
                const base = amount / (1 + formData.taxRate / 100);
                taxAmount = amount - base;
            } else {
                taxAmount = amount * (formData.taxRate / 100);
            }
        }

        const newExpense = expenseService.createExpense({
            date: new Date(formData.date).toISOString(),
            category: formData.category,
            subcategory: formData.subcategory,
            description: formData.description,
            amount: amount,
            taxAmount: taxAmount,
            taxRate: Number(formData.taxRate),
            isTaxIncluded: formData.isTaxIncluded,
            paymentMethod: formData.paymentMethod,
            paidFrom: formData.paidFrom,
            responsiblePerson: formData.responsiblePerson,
            relatedStoreId: formData.relatedStoreId,
            relatedTechnicianId: formData.relatedTechnicianId,
            receiptUrl: formData.receiptUrl,
            createdBy: user?.username || 'system'
        }, user?.username || 'system', user?.id || 'system');

        alert("Expense Recorded");
        onSave(newExpense.id);
        
        // Reset specific fields
        setFormData(prev => ({ 
            ...prev, 
            amount: '', 
            description: '', 
            receiptUrl: '',
            subcategory: ''
        }));
    };

    return (
        <div className="flex flex-col h-full bg-white dark:bg-zinc-900 border-r border-slate-200 dark:border-zinc-800 shadow-xl z-20 w-full md:max-w-sm">
            <div className="p-5 border-b border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-gray-900">
                <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                    <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    {t('expenses.add_new')}
                </h2>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t('expenses.date')}</label>
                        <input type="date" name="date" value={formData.date} onChange={handleChange} className="form-input w-full" required />
                    </div>
                    
                    <div className="col-span-2">
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t('expenses.category')}</label>
                        <select name="category" value={formData.category} onChange={handleChange} className="form-select w-full" required>
                            {expenseService.EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{t(`expenses.cat.${c}`)}</option>)}
                        </select>
                    </div>

                    <div className="col-span-2">
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t('expenses.subcategory')}</label>
                        <input name="subcategory" value={formData.subcategory} onChange={handleChange} className="form-input w-full" placeholder="e.g. Printer Paper" />
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t('expenses.description')}</label>
                    <textarea name="description" value={formData.description} onChange={handleChange} className="form-input w-full h-20 resize-none" placeholder="..." required />
                </div>

                <div className="p-4 bg-slate-50 dark:bg-gray-700/30 rounded-lg border border-slate-200 dark:border-gray-600">
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">{t('expenses.cost_tax')}</label>
                    <div className="flex gap-2 mb-3">
                        <div className="flex-1 relative">
                            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500 pointer-events-none">{settings.currencySymbol}</span>
                            <input 
                                type="number" 
                                name="amount" 
                                value={formData.amount} 
                                onChange={handleChange} 
                                className="form-input w-full pl-8 font-bold text-lg" 
                                placeholder="0.00" 
                                min="0" 
                                step="0.01"
                                required 
                            />
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <label className="text-sm text-slate-600 dark:text-gray-300">{t('expenses.tax_included')}</label>
                            <input type="checkbox" name="isTaxIncluded" checked={formData.isTaxIncluded} onChange={handleChange} className="h-4 w-4 text-[var(--color-primary)] rounded" />
                        </div>
                        <div className="flex items-center gap-2 flex-1">
                            <label className="text-sm text-slate-600 dark:text-gray-300">{t('expenses.tax_rate')}</label>
                            <input type="number" name="taxRate" value={formData.taxRate} onChange={handleChange} className="form-input w-16 py-1 text-right" />
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t('expenses.payment_method')}</label>
                        <select name="paymentMethod" value={formData.paymentMethod} onChange={handleChange} className="form-select w-full">
                            <option>Cash</option>
                            <option>Card</option>
                            <option>Bank</option>
                            <option>Cheque</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t('expenses.paid_from')}</label>
                        <select name="paidFrom" value={formData.paidFrom} onChange={handleChange} className="form-select w-full">
                            <option>Cash Drawer</option>
                            <option>Main Account</option>
                            <option>Petty Cash</option>
                        </select>
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t('expenses.responsible')}</label>
                    <input name="responsiblePerson" value={formData.responsiblePerson} onChange={handleChange} className="form-input w-full" />
                </div>

                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t('expenses.receipt')}</label>
                    <div 
                        onClick={() => fileInputRef.current?.click()}
                        className="border-2 border-dashed border-slate-300 dark:border-gray-600 rounded-lg p-4 text-center cursor-pointer hover:bg-slate-50 dark:hover:bg-gray-700 transition"
                    >
                        {formData.receiptUrl ? (
                            <img src={formData.receiptUrl} alt="Receipt" className="h-20 mx-auto object-contain" />
                        ) : (
                            <span className="text-sm text-slate-500">{t('expenses.click_upload')}</span>
                        )}
                        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                    </div>
                </div>

                <button type="submit" className="w-full py-3 bg-[var(--color-primary)] text-white font-bold rounded-lg shadow hover:brightness-110 flex items-center justify-center gap-2 mt-4">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                    {t('expenses.save')}
                </button>
            </form>

            <style>{`
                .form-input, .form-select {
                    background-color: #f9fafb;
                    border: 1px solid #d1d5db;
                    border-radius: 0.375rem;
                    padding: 0.6rem;
                    font-size: 0.875rem;
                }
                .dark .form-input, .dark .form-select {
                    background-color: #374151;
                    border-color: #4b5563;
                    color: white;
                }
            `}</style>
        </div>
    );
};

export default AddExpensePanel;
