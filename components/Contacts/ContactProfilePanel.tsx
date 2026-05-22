
import React, { useState, useContext, useEffect } from 'react';
import { Contact } from '../../constants/contactTypes';
import { SettingsContext } from '../../contexts/SettingsContext';
import * as billingService from '../../services/billingService';
import { Sale } from '../../constants/billingTypes';
import * as serviceDeskService from '../../services/serviceDeskService';
import * as stockService from '../../services/stockService';

interface ContactProfilePanelProps {
    contact: Contact | null;
    onClose: () => void;
    onEdit?: (contact: Contact) => void;
    canEdit?: boolean;
}

const ContactProfilePanel: React.FC<ContactProfilePanelProps> = ({ contact, onClose, onEdit, canEdit = true }) => {
    const { settings, t } = useContext(SettingsContext);
    const [activeTab, setActiveTab] = useState<'overview' | 'financial' | 'activity'>('overview');
    const [sales, setSales] = useState<Sale[]>([]);

    useEffect(() => {
        if (contact) {
            billingService.getSalesHistory().then(allSales => {
                setSales(allSales.filter(s => 
                    (s.customerName || '').toLowerCase() === contact.name.toLowerCase() || 
                    (s.customerId === contact.id)
                ));
            });
        }
    }, [contact]);

    if (!contact) {
        return (
            <div className="hidden md:flex w-full md:w-[450px] bg-white dark:bg-gray-800 border-l border-slate-200 dark:border-zinc-800 items-center justify-center text-gray-400">
                <p>Select a contact to view profile</p>
            </div>
        );
    }

    const isRightSideCurrency = settings.currencySymbol === 'DA' || settings.currencySymbol === 'DZD';
    const formatPrice = (val: number) => isRightSideCurrency ? `${val.toFixed(2)} ${settings.currencySymbol}` : `${settings.currencySymbol}${val.toFixed(2)}`;

    // Mock connections
    const tickets = serviceDeskService.getServiceTickets().filter(t => 
        t.customerName.toLowerCase() === contact.name.toLowerCase() ||
        t.technicianId === contact.name 
    );

    const pos = stockService.getPurchaseOrders().filter(p => 
        p.supplierName.toLowerCase() === contact.name.toLowerCase()
    );

    return (
        <div className="w-full bg-white dark:bg-gray-800 flex flex-col h-full shadow-xl z-20">
            {/* Header */}
            <div className="p-6 border-b border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-gray-900 relative">
                <div className="absolute top-4 right-4 flex gap-2">
                    {onEdit && (
                        <button 
                            onClick={() => onEdit(contact)} 
                            className="text-gray-400 hover:text-[var(--color-primary)] p-1 rounded-full hover:bg-slate-200 dark:hover:bg-gray-700 transition-colors"
                            title="Edit Contact"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L16.732 3.732z" /></svg>
                        </button>
                    )}
                    <button onClick={onClose} className="text-gray-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-200 dark:hover:bg-gray-700 transition-colors">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
                
                <div className="flex items-center gap-4 mb-4">
                    {contact.pictureUrl ? (
                        <img src={contact.pictureUrl} alt="Profile" className="w-16 h-16 rounded-full object-cover shadow-lg border-2 border-white dark:border-zinc-800" />
                    ) : (
                        <div className="w-16 h-16 bg-[var(--color-primary)] rounded-full flex items-center justify-center text-2xl font-bold text-white shadow-lg">
                            {contact.name.charAt(0).toUpperCase()}
                        </div>
                    )}
                    
                    <div>
                        <h2 className="text-xl font-bold text-slate-800 dark:text-white">{contact.name}</h2>
                        {contact.type === 'company' && contact.legalForm && (
                            <span className="text-xs bg-slate-200 dark:bg-gray-700 px-1 rounded mr-2">{contact.legalForm}</span>
                        )}
                        <p className="text-sm text-slate-500 inline">{contact.companyName}</p>
                        <div className="flex gap-1 mt-1">
                            {contact.roles.map(r => <span key={r} className="text-[10px] bg-blue-100 dark:bg-blue-900/30 px-2 rounded-full uppercase font-bold text-blue-600 dark:text-blue-300">{t(`contacts.role.${r}`)}</span>)}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                    <button className="py-2 bg-green-50 text-green-700 rounded border border-green-200 flex items-center justify-center gap-2 text-xs font-bold hover:bg-green-100">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                        {t('contacts.call')}
                    </button>
                    <button className="py-2 bg-blue-50 text-blue-700 rounded border border-blue-200 flex items-center justify-center gap-2 text-xs font-bold hover:bg-blue-100">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                        Email
                    </button>
                    <button className="py-2 bg-green-100 text-green-800 rounded border border-green-200 flex items-center justify-center gap-2 text-xs font-bold hover:bg-green-200">
                        {t('contacts.whatsapp')}
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-200 dark:border-zinc-800">
                {['overview', 'financial', 'activity'].map(tab => (
                    <button 
                        key={tab}
                        onClick={() => setActiveTab(tab as any)}
                        className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
                            activeTab === tab 
                            ? 'border-[var(--color-primary)] text-[var(--color-primary)] bg-slate-50 dark:bg-gray-800' 
                            : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50 dark:hover:bg-gray-700'
                        }`}
                    >
                        {t(`contacts.tab.${tab}`)}
                    </button>
                ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
                
                {/* OVERVIEW TAB */}
                {activeTab === 'overview' && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs text-slate-500 uppercase mb-1">{t('contacts.phone')}</label>
                                <p className="font-medium text-slate-800 dark:text-white">{contact.phone || '-'}</p>
                            </div>
                            <div>
                                <label className="block text-xs text-slate-500 uppercase mb-1">{t('contacts.email')}</label>
                                <p className="font-medium text-slate-800 dark:text-white truncate" title={contact.email}>{contact.email || '-'}</p>
                            </div>
                            <div className="col-span-2">
                                <label className="block text-xs text-slate-500 uppercase mb-1">{t('contacts.address')}</label>
                                <p className="font-medium text-slate-800 dark:text-white">{contact.address || '-'}</p>
                                <p className="text-sm text-slate-600 dark:text-gray-400">{contact.city}</p>
                            </div>
                        </div>

                        {/* Professional Details Card */}
                        {(contact.rcNumber || contact.nifNumber || contact.nisNumber || contact.artNumber) && (
                            <div className="bg-slate-50 dark:bg-gray-900/50 p-4 rounded-lg border border-slate-200 dark:border-zinc-800">
                                <h4 className="text-xs font-bold text-slate-600 dark:text-gray-300 uppercase mb-3 border-b border-slate-200 pb-2">Professional Details</h4>
                                <div className="grid grid-cols-2 gap-y-3 gap-x-2 text-sm">
                                    {contact.legalForm && (
                                        <div>
                                            <span className="text-slate-500 text-xs block">Legal Form</span>
                                            <span className="font-medium">{contact.legalForm}</span>
                                        </div>
                                    )}
                                    {contact.rcNumber && (
                                        <div>
                                            <span className="text-slate-500 text-xs block">RC Number</span>
                                            <span className="font-medium">{contact.rcNumber}</span>
                                        </div>
                                    )}
                                    {contact.nifNumber && (
                                        <div>
                                            <span className="text-slate-500 text-xs block">NIF (Tax ID)</span>
                                            <span className="font-medium">{contact.nifNumber}</span>
                                        </div>
                                    )}
                                    {contact.nisNumber && (
                                        <div>
                                            <span className="text-slate-500 text-xs block">NIS</span>
                                            <span className="font-medium">{contact.nisNumber}</span>
                                        </div>
                                    )}
                                    {contact.artNumber && (
                                        <div>
                                            <span className="text-slate-500 text-xs block">ART (AI)</span>
                                            <span className="font-medium">{contact.artNumber}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {contact.notes && (
                            <div className="bg-yellow-50 dark:bg-yellow-900/10 p-3 rounded border border-yellow-100 dark:border-yellow-800">
                                <label className="block text-xs font-bold text-yellow-800 dark:text-yellow-500 uppercase mb-1">{t('contacts.notes')}</label>
                                <p className="text-sm text-slate-700 dark:text-gray-300 italic">"{contact.notes}"</p>
                            </div>
                        )}

                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">{t('contacts.tags')}</label>
                            <div className="flex flex-wrap gap-2">
                                {contact.tags.map(t => <span key={t} className="px-2 py-1 bg-slate-100 dark:bg-gray-700 rounded text-xs text-slate-600 dark:text-gray-300">{t}</span>)}
                                {contact.tags.length === 0 && <span className="text-sm text-gray-400">No tags</span>}
                            </div>
                        </div>
                    </div>
                )}

                {/* FINANCIAL TAB */}
                {activeTab === 'financial' && (
                    <div className="space-y-6">
                        <div className="p-4 bg-slate-50 dark:bg-gray-900/50 rounded-xl border border-slate-200 dark:border-zinc-800 text-center">
                            <p className="text-sm text-slate-500 uppercase mb-1">{t('contacts.balance')}</p>
                            <div className={`text-3xl font-extrabold ${contact.currentBalance > 0 ? 'text-green-600' : contact.currentBalance < 0 ? 'text-red-500' : 'text-slate-800 dark:text-white'}`}>
                                {formatPrice(Math.abs(contact.currentBalance))}
                                <span className="text-sm font-medium ml-2 text-slate-500">
                                    {contact.currentBalance > 0 ? `(${t('contacts.credit')})` : contact.currentBalance < 0 ? `(${t('contacts.debt')})` : ''}
                                </span>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="flex justify-between border-b pb-2 dark:border-zinc-800">
                                <span className="text-slate-600 dark:text-gray-400">{t('contacts.credit_limit')}</span>
                                <span className="font-bold">{formatPrice(contact.creditLimit)}</span>
                            </div>
                            <div className="flex justify-between border-b pb-2 dark:border-zinc-800">
                                <span className="text-slate-600 dark:text-gray-400">{t('contacts.payment_terms')}</span>
                                <span className="font-bold">{contact.paymentTerms}</span>
                            </div>
                            <div className="flex justify-between border-b pb-2 dark:border-zinc-800">
                                <span className="text-slate-600 dark:text-gray-400">{t('contacts.lifetime_spend')}</span>
                                <span className="font-bold">{formatPrice(sales.reduce((acc, s) => acc + s.total, 0))}</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* ACTIVITY TAB */}
                {activeTab === 'activity' && (
                    <div className="space-y-6">
                        {sales.length > 0 && (
                            <div>
                                <h3 className="font-bold text-slate-800 dark:text-white mb-2 flex items-center gap-2">
                                    <span className="bg-green-100 text-green-800 p-1 rounded"><svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg></span>
                                    {t('contacts.recent_sales')}
                                </h3>
                                <div className="space-y-2">
                                    {sales.slice(0, 3).map(s => (
                                        <div key={s.id} className="text-sm border-l-2 border-green-500 pl-3 py-1">
                                            <div className="flex justify-between">
                                                <span className="font-mono text-xs text-slate-500">{s.id}</span>
                                                <span className="font-bold">{formatPrice(s.total)}</span>
                                            </div>
                                            <div className="text-xs text-gray-400">{new Date(s.date).toLocaleDateString()}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        {/* Other activities (tickets, POs) can be similarly listed */}
                        {sales.length === 0 && tickets.length === 0 && pos.length === 0 && (
                            <p className="text-center text-gray-400 text-sm italic py-4">No recent activity found.</p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ContactProfilePanel;
