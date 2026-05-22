
import React, { useState, useEffect } from 'react';
import ContactFormPanel from './ContactFormPanel';
import ContactsList from './ContactsList';
import ContactProfilePanel from './ContactProfilePanel';
import * as contactService from '../../services/contactService';
import { Contact } from '../../constants/contactTypes';
import { getCurrentUser } from '../../services/authService';

const ContactsPanel: React.FC = () => {
    const user = getCurrentUser();
    const role = user?.role || 'customer';
    const canEdit = role === 'admin';

    // RBAC: Restricted Access
    if (role === 'customer') {
        return (
            <div className="flex flex-col items-center justify-center h-full text-slate-500">
                <svg className="w-16 h-16 mb-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                <h2 className="text-xl font-bold mb-2">Access Restricted</h2>
                <p>You do not have permission to view Contacts.</p>
            </div>
        );
    }

    const [contacts, setContacts] = useState<Contact[]>([]);
    const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
    const [editingContact, setEditingContact] = useState<Contact | null>(null);
    const [isAddingContact, setIsAddingContact] = useState(false);
    const [mobileView, setMobileView] = useState<'list' | 'form' | 'profile'>('list');

    const loadContacts = async () => {
        const data = await contactService.getContacts();
        setContacts(data);
        if (selectedContact) {
            const updated = data.find(c => c.id === selectedContact.id);
            if (updated) setSelectedContact(updated);
        }
        if (editingContact) {
            const updated = data.find(c => c.id === editingContact.id);
            if (updated) setEditingContact(updated);
        }
    };

    useEffect(() => {
        loadContacts();
    }, []);

    const handleSelect = (contact: Contact) => {
        setSelectedContact(contact);
        setEditingContact(null);
        setIsAddingContact(false);
        setMobileView('profile');
    };

    const handleEditStart = (contact: Contact) => {
        setEditingContact(contact);
        setIsAddingContact(false);
        setMobileView('form');
    };

    const handleAddStart = () => {
        setEditingContact(null);
        setSelectedContact(null);
        setIsAddingContact(true);
        setMobileView('form');
    };

    const handleEditCancel = () => {
        setEditingContact(null);
        setIsAddingContact(false);
        setMobileView(selectedContact ? 'profile' : 'list');
    };

    const handleSave = () => {
        loadContacts();
        setEditingContact(null);
        setIsAddingContact(false);
        setMobileView('list');
    };

    const showFormPanel = editingContact || isAddingContact;

    return (
        <div className="flex flex-col h-full -m-4 sm:-m-6 md:-m-8 overflow-hidden relative">
            {/* Mobile View Toggles */}
            <div className="md:hidden flex bg-white dark:bg-zinc-950 border-b border-slate-200 dark:border-zinc-800 p-2 gap-2 z-50">
                <button 
                    onClick={() => setMobileView('list')}
                    className={`flex-1 py-2 px-3 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${mobileView === 'list' || (mobileView === 'profile' && !selectedContact) ? 'bg-[#3B82F6] text-white shadow-lg shadow-blue-500/20' : 'text-slate-500 dark:text-zinc-500 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800'}`}
                >
                    Directory
                </button>
                <button 
                    onClick={handleAddStart}
                    className={`flex-1 py-1.5 px-3 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${mobileView === 'form' && isAddingContact ? 'bg-[#3B82F6] text-white shadow-lg shadow-blue-500/20' : 'text-slate-500 dark:text-zinc-500 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800'}`}
                >
                    New Contact
                </button>
                {(selectedContact || editingContact) && (
                    <button 
                        onClick={() => setMobileView(editingContact ? 'form' : 'profile')}
                        className={`flex-1 py-1.5 px-3 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${mobileView === 'profile' || (mobileView === 'form' && editingContact) ? 'bg-[#3B82F6] text-white shadow-lg shadow-blue-500/20' : 'text-slate-500 dark:text-zinc-500 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800'}`}
                    >
                        {editingContact ? 'Edit' : 'Profile'}
                    </button>
                )}
            </div>

            <div className="flex-1 flex overflow-hidden relative">
                {/* Left: Add/Edit Form */}
                <div className={`${mobileView === 'form' ? 'flex' : 'hidden'} md:flex w-full md:w-auto md:w-80 lg:w-96 shrink-0 transform transition-transform duration-300 md:relative z-30 ${showFormPanel ? 'md:translate-x-0' : 'md:-translate-x-full md:absolute md:inset-y-0 md:left-0'}`}>
                    <ContactFormPanel
                        onSave={handleSave}
                        contactToEdit={editingContact}
                        onCancelEdit={handleEditCancel}
                        canEdit={canEdit}
                    />
                </div>

                {/* Center: List */}
                <div className={`${mobileView === 'list' ? 'flex' : 'hidden'} md:flex flex-1 min-w-0 md:min-w-[400px]`}>
                    <ContactsList
                        contacts={contacts}
                        selectedId={selectedContact?.id || null}
                        onSelect={handleSelect}
                        onAddContact={handleAddStart}
                    />
                </div>

                {/* Right: Profile */}
                <div className={`${mobileView === 'profile' ? 'flex' : 'hidden'} md:flex w-full md:w-auto md:w-[500px] shrink-0 border-l border-slate-200 dark:border-zinc-800 transform transition-transform duration-300 md:relative z-30 ${selectedContact ? 'md:translate-x-0' : 'md:translate-x-full md:absolute md:inset-y-0 md:right-0'}`}>
                    <ContactProfilePanel
                        contact={selectedContact}
                        onClose={() => { setSelectedContact(null); setMobileView('list'); }}
                        onEdit={handleEditStart}
                        canEdit={canEdit}
                    />
                </div>
            </div>

            {/* Mobile Back Button */}
            {mobileView !== 'list' && (
                <button 
                    onClick={() => setMobileView('list')}
                    className="md:hidden fixed bottom-24 right-6 w-12 h-12 bg-white dark:bg-zinc-800 rounded-full shadow-2xl flex items-center justify-center text-slate-600 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700 z-[60]"
                >
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                </button>
            )}
        </div>
    );
};

export default ContactsPanel;
