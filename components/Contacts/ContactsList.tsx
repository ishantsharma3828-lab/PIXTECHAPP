
import React, { useState, useContext } from 'react';
import { Contact, ContactRole } from '../../constants/contactTypes';
import { SettingsContext } from '../../contexts/SettingsContext';

interface ContactsListProps {
    contacts: Contact[];
    selectedId: string | null;
    onSelect: (contact: Contact) => void;
    onAddContact: () => void;
}

const ContactsList: React.FC<ContactsListProps> = ({ contacts, selectedId, onSelect, onAddContact }) => {
    const { settings, t } = useContext(SettingsContext);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterRole, setFilterRole] = useState<ContactRole | 'all'>('all');

    const isRightSideCurrency = settings.currencySymbol === 'DA' || settings.currencySymbol === 'DZD';
    const formatPrice = (val: number) => isRightSideCurrency ? `${val.toFixed(2)} ${settings.currencySymbol}` : `${settings.currencySymbol}${val.toFixed(2)}`;

    const filteredContacts = contacts.filter(c => {
        const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                              c.phone.includes(searchQuery) || 
                              (c.companyName || '').toLowerCase().includes(searchQuery.toLowerCase());
        
        const matchesRole = filterRole === 'all' || c.roles.includes(filterRole);
        
        return matchesSearch && matchesRole;
    });

    const getRoleBadgeColor = (role: ContactRole) => {
        switch(role) {
            case 'customer': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
            case 'supplier': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300';
            case 'technician': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300';
            case 'employee': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
            default: return 'bg-slate-100 text-slate-800 dark:bg-gray-700 dark:text-gray-300';
        }
    };

    return (
        <div className="flex-1 bg-slate-100 dark:bg-gray-900 flex flex-col min-w-0 md:min-w-[400px]">
            {/* Header & Filter */}
            <div className="p-4 bg-white dark:bg-gray-800 border-b border-slate-200 dark:border-zinc-800 shadow-sm sticky top-0 z-10 space-y-3">
                <div className="flex justify-between items-center">
                    <h3 className="font-bold text-slate-800 dark:text-white text-lg">{t('contacts.directory')} ({filteredContacts.length})</h3>
                    <div className="flex gap-2">
                        <select 
                            value={filterRole} 
                            onChange={(e) => setFilterRole(e.target.value as any)}
                            className="text-sm border rounded bg-slate-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white px-2 py-1"
                        >
                            <option value="all">{t('common.all')}</option>
                            <option value="customer">{t('contacts.role.customer')}</option>
                            <option value="supplier">{t('contacts.role.supplier')}</option>
                            <option value="technician">{t('contacts.role.technician')}</option>
                            <option value="employee">{t('contacts.role.employee')}</option>
                            <option value="partner">{t('contacts.role.partner')}</option>
                            <option value="lead">{t('contacts.role.lead')}</option>
                        </select>
                        <button 
                            onClick={onAddContact}
                            className="bg-[var(--color-primary)] text-white px-3 py-1 rounded text-sm font-bold hover:bg-opacity-90 transition-colors flex items-center gap-1"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                            <span className="hidden sm:inline">{t('contacts.add_new')}</span>
                        </button>
                    </div>
                </div>
                <div className="relative">
                    <input 
                        type="text" 
                        placeholder={t('header.search_placeholder')} 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-gray-700 border border-slate-200 dark:border-gray-600 rounded-md text-sm focus:ring-2 focus:ring-[var(--color-primary)] outline-none"
                    />
                    <svg className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {filteredContacts.length === 0 ? (
                    <div className="text-center py-10 text-gray-400">{t('contacts.no_contacts')}</div>
                ) : (
                    filteredContacts.map(contact => (
                        <div 
                            key={contact.id}
                            onClick={() => onSelect(contact)}
                            className={`bg-white dark:bg-gray-800 rounded-lg p-3 border shadow-sm cursor-pointer hover:shadow-md transition-all flex items-center gap-4 ${selectedId === contact.id ? 'border-[var(--color-primary)] ring-1 ring-[var(--color-primary)]' : 'border-transparent hover:border-slate-300 dark:hover:border-gray-600'}`}
                        >
                            <div className="w-12 h-12 bg-slate-200 dark:bg-gray-700 rounded-full flex items-center justify-center text-lg font-bold text-slate-600 dark:text-gray-300 overflow-hidden flex-shrink-0">
                                {contact.pictureUrl ? (
                                    <img src={contact.pictureUrl} alt="" className="w-full h-full object-cover" />
                                ) : (
                                    contact.name.charAt(0).toUpperCase()
                                )}
                            </div>
                            
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-start">
                                    <h4 className="font-bold text-slate-800 dark:text-white truncate">{contact.name}</h4>
                                    {contact.currentBalance !== 0 && (
                                        <span className={`text-xs font-bold ${contact.currentBalance > 0 ? 'text-green-600' : 'text-red-500'}`}>
                                            {contact.currentBalance > 0 ? '+' : ''}{formatPrice(contact.currentBalance)}
                                        </span>
                                    )}
                                </div>
                                <div className="text-sm text-slate-500 truncate">
                                    {contact.type === 'company' && <span className="mr-1">🏢</span>}
                                    {contact.companyName ? `${contact.companyName} • ` : ''}{contact.phone}
                                </div>
                                <div className="flex gap-1 mt-2">
                                    {contact.roles.map(r => (
                                        <span key={r} className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${getRoleBadgeColor(r)}`}>
                                            {t(`contacts.role.${r}`)}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default ContactsList;
