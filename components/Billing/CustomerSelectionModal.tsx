
import React, { useState, useEffect, useContext } from 'react';
import * as billingService from '../../services/billingService';
import { Customer } from '../../constants/billingTypes';
import { SettingsContext } from '../../contexts/SettingsContext';

interface CustomerSelectionModalProps {
    onSelect: (customer: Customer) => void;
    onClose: () => void;
}

const CustomerSelectionModal: React.FC<CustomerSelectionModalProps> = ({ onSelect, onClose }) => {
    const { settings, t } = useContext(SettingsContext);
    const [activeTab, setActiveTab] = useState<'search' | 'create'>('search');
    const [searchQuery, setSearchQuery] = useState('');
    const [customers, setCustomers] = useState<Customer[]>([]);

    // New Customer Form State
    const [newCustomer, setNewCustomer] = useState({ name: '', phone: '', email: '', address: '' });

    useEffect(() => {
        billingService.getCustomers().then(setCustomers);
    }, []);

    const filteredCustomers = customers.filter(c =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.phone && c.phone.includes(searchQuery)) ||
        (c.email && c.email.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const handleCreateSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newCustomer.name) return;

        // BillingService now delegates to ContactService, ensuring unity.
        // We pass basic info. 
        const created = await billingService.addCustomer(newCustomer);
        onSelect(created);
        onClose();
    };

    const getTierColor = (tier?: string) => {
        switch (tier) {
            case 'Platinum': return 'bg-slate-50 dark:bg-zinc-900 text-white border-slate-300 dark:border-zinc-700';
            case 'Gold': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'Silver': return 'bg-slate-100 text-slate-800 border-slate-200';
            default: return 'bg-orange-50 text-orange-800 border-orange-100'; // Bronze
        }
    };

    const isRightSideCurrency = settings.currencySymbol === 'DA' || settings.currencySymbol === 'DZD';
    const formatPrice = (val: number) => isRightSideCurrency ? `${val.toFixed(2)} ${settings.currencySymbol}` : `${settings.currencySymbol}${val.toFixed(2)}`;


    return (
        <div className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center p-0 md:p-4 animate-fade-in backdrop-blur-sm">
            <div className="bg-slate-50 dark:bg-zinc-900 rounded-none md:rounded-xl shadow-2xl w-full h-[100dvh] md:w-[60vw] md:h-auto md:max-h-[80vh] max-w-2xl flex flex-col overflow-hidden border-0 md:border border-slate-200 dark:border-zinc-800">

                {/* Header / Tabs */}
                <div className="flex border-b border-slate-200 dark:border-zinc-800 relative bg-white dark:bg-zinc-950/80">
                    <button
                        onClick={() => setActiveTab('search')}
                        className={`flex-1 py-4 font-bold text-sm uppercase tracking-wider transition-colors ${activeTab === 'search'
                            ? 'bg-slate-50 dark:bg-zinc-900 text-blue-400 border-b-2 border-blue-500'
                            : 'text-slate-500 dark:text-zinc-400 hover:bg-slate-50 dark:bg-zinc-900/50'
                            }`}
                    >
                        {t('billing.find_customer')}
                    </button>
                    <button
                        onClick={() => setActiveTab('create')}
                        className={`flex-1 py-4 font-bold text-sm uppercase tracking-wider transition-colors ${activeTab === 'create'
                            ? 'bg-slate-50 dark:bg-zinc-900 text-blue-400 border-b-2 border-blue-500'
                            : 'text-slate-500 dark:text-zinc-400 hover:bg-slate-50 dark:bg-zinc-900/50'
                            }`}
                    >
                        {t('billing.new_customer')}
                    </button>
                    <button onClick={onClose} className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full hover:bg-slate-50 dark:bg-zinc-900 transition-colors">
                        <svg className="w-5 h-5 text-slate-500 dark:text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-hidden flex flex-col bg-transparent">

                    {/* SEARCH TAB */}
                    {activeTab === 'search' && (
                        <div className="flex-1 flex flex-col p-6">
                            <div className="relative mb-4">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <svg className="h-5 w-5 text-slate-500 dark:text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                                </div>
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 bg-white dark:bg-zinc-950/80 text-white border border-slate-200 dark:border-zinc-800 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder-slate-500"
                                    placeholder={t('header.search_placeholder')}
                                    autoFocus
                                />
                            </div>

                            <div className="flex-1 overflow-y-auto space-y-3">
                                {filteredCustomers.length === 0 ? (
                                    <div className="text-center py-10 opacity-50">
                                        <svg className="w-16 h-16 mx-auto mb-2 text-slate-600 dark:text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                                        <p className="text-slate-500 dark:text-zinc-400">{t('contacts.no_contacts')}</p>
                                    </div>
                                ) : (
                                    filteredCustomers.map(customer => (
                                        <div
                                            key={customer.id}
                                            onClick={() => { onSelect(customer); onClose(); }}
                                            className="group p-4 border border-slate-200 dark:border-zinc-800 rounded-xl hover:border-blue-500 hover:shadow-md cursor-pointer transition-all flex items-center gap-4 bg-slate-50 dark:bg-zinc-900/80"
                                        >
                                            <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg flex-shrink-0 ${getTierColor(customer.tier)}`}>
                                                {customer.name.charAt(0)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <h4 className="font-bold text-white truncate">{customer.name}</h4>
                                                    {customer.tier && (
                                                        <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase font-bold border ${getTierColor(customer.tier)}`}>
                                                            {customer.tier}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-sm text-slate-500 dark:text-zinc-400 flex flex-wrap gap-x-4">
                                                    {customer.phone && <span>📞 {customer.phone}</span>}
                                                    {customer.email && <span className="truncate">✉️ {customer.email}</span>}
                                                </div>
                                                {customer.address && <div className="text-xs text-slate-600 dark:text-zinc-500 truncate mt-1">📍 {customer.address}</div>}
                                            </div>
                                            <div className="text-right">
                                                <div className="text-xs text-slate-600 dark:text-zinc-500 uppercase font-bold">Points</div>
                                                <div className="text-lg font-bold text-blue-400">{customer.loyaltyPoints}</div>
                                                <div className="text-xs text-slate-600 dark:text-zinc-500">Total: {formatPrice(customer.totalSpent)}</div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}

                    {/* CREATE TAB */}
                    {activeTab === 'create' && (
                        <div className="flex-1 p-8 flex flex-col justify-center max-w-lg mx-auto w-full overflow-y-auto">
                            <form onSubmit={handleCreateSubmit} className="space-y-5">
                                <div className="text-center mb-6">
                                    <div className="w-20 h-20 bg-slate-100 dark:bg-gray-700 rounded-full mx-auto flex items-center justify-center mb-3">
                                        <svg className="w-10 h-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>
                                    </div>
                                    <h3 className="text-xl font-bold text-slate-800 dark:text-white">{t('billing.new_customer')}</h3>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">{t('contacts.name')} *</label>
                                    <input
                                        type="text"
                                        required
                                        value={newCustomer.name}
                                        onChange={e => setNewCustomer({ ...newCustomer, name: e.target.value })}
                                        className="w-full form-input"
                                        placeholder="John Doe"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">{t('contacts.phone')}</label>
                                    <input
                                        type="tel"
                                        value={newCustomer.phone}
                                        onChange={e => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                                        className="w-full form-input"
                                        placeholder="555-0123"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">{t('contacts.email')}</label>
                                    <input
                                        type="email"
                                        value={newCustomer.email}
                                        onChange={e => setNewCustomer({ ...newCustomer, email: e.target.value })}
                                        className="w-full form-input"
                                        placeholder="john@example.com"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">{t('contacts.address')}</label>
                                    <input
                                        type="text"
                                        value={newCustomer.address}
                                        onChange={e => setNewCustomer({ ...newCustomer, address: e.target.value })}
                                        className="w-full form-input"
                                        placeholder="123 Main St, City"
                                    />
                                </div>

                                <button type="submit" className="w-full py-3 bg-[var(--color-primary)] text-white font-bold rounded-lg shadow hover:brightness-110 transition-all mt-4">
                                    {t('common.save')}
                                </button>
                            </form>
                        </div>
                    )}
                </div>

                <div className="p-4 bg-slate-50 dark:bg-gray-900 border-t border-slate-200 dark:border-slate-200 dark:border-zinc-800 flex justify-end">
                    <button onClick={onClose} className="px-6 py-2 text-slate-600 dark:text-gray-300 hover:bg-slate-200 dark:hover:bg-gray-700 rounded-lg font-medium">
                        {t('common.cancel')}
                    </button>
                </div>
            </div>
            <style>{`
            .form-input {
                padding: 0.75rem;
                border: 1px solid #e5e7eb;
                border-radius: 0.5rem;
                background-color: #f9fafb;
                transition: all 0.2s;
            }
            .form-input:focus {
                border-color: var(--color-primary);
                background-color: #fff;
                outline: none;
                box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
            }
            .dark .form-input {
                background-color: #374151;
                border-color: #4b5563;
                color: white;
            }
            .dark .form-input:focus {
                background-color: #1f2937;
            }
            @keyframes fade-in {
                from { opacity: 0; transform: scale(0.98); }
                to { opacity: 1; transform: scale(1); }
            }
            .animate-fade-in {
                animation: fade-in 0.2s ease-out forwards;
            }
        `}</style>
        </div>
    );
};

export default CustomerSelectionModal;
