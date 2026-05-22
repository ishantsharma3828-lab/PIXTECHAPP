
import React, { useState, useEffect } from 'react';
import TicketCreationPanel from './TicketCreationPanel';
import ActiveTicketsList from './ActiveTicketsList';
import TicketDetailsWorkspace from './TicketDetailsWorkspace';
import * as serviceDeskService from '../../services/serviceDeskService';
import { ServiceTicket } from '../../constants/serviceTypes';

import { getCurrentUser } from '../../services/authService';

const ServiceDeskPanel: React.FC = () => {
    const [tickets, setTickets] = useState<ServiceTicket[]>([]);
    const [selectedTicket, setSelectedTicket] = useState<ServiceTicket | null>(null);

    const [isMobilePanelOpen, setIsMobilePanelOpen] = useState<'sidebar' | 'main'>('sidebar');
    const [view, setView] = useState<'new' | 'detail'>('new');

    const loadTickets = () => {
        const data = serviceDeskService.getServiceTickets();
        setTickets(data);
        if (selectedTicket) {
            const updated = data.find(t => t.id === selectedTicket.id);
            if (updated) setSelectedTicket(updated);
        }
    };

    useEffect(() => {
        loadTickets();
    }, []);

    const user = getCurrentUser();

    return (
        <div className="flex h-full -mx-4 sm:-mx-6 md:-m-8 overflow-hidden relative bg-white dark:bg-gray-900">
            {/* Context Actions for Mobile */}
            <div className="md:hidden absolute bottom-[calc(1rem+env(safe-area-inset-bottom,0px))] right-4 z-40 flex flex-col gap-3">
                <button 
                    onClick={() => { setView('new'); setSelectedTicket(null); setIsMobilePanelOpen('main'); }}
                    className="w-14 h-14 bg-[var(--color-primary)] text-white rounded-full shadow-xl flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
                >
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                </button>
            </div>

            {/* Left Sidebar */}
            <div className={`flex flex-col border-r border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-gray-800/50 shrink-0 md:w-[320px] md:relative md:flex md:inset-auto md:z-auto ${isMobilePanelOpen === 'sidebar' ? 'absolute inset-0 w-full z-50' : 'hidden'}`}>
                <div className="p-4 border-b border-slate-200 dark:border-zinc-800">
                    <button
                        onClick={() => { setView('new'); setSelectedTicket(null); setIsMobilePanelOpen('main'); }}
                        className="w-full py-2 bg-[var(--color-primary)] text-white font-medium rounded-lg hover:brightness-110 flex items-center justify-center gap-2"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                        New Repair Order
                    </button>
                </div>
                
                <div className="flex-1 overflow-hidden flex flex-col">
                    <ActiveTicketsList
                        tickets={tickets}
                        selectedId={selectedTicket?.id || null}
                        onSelect={(t) => { setSelectedTicket(t); setView('detail'); setIsMobilePanelOpen('main'); }}
                    />
                </div>
            </div>

            {/* Main Content Area */}
            <div className={`flex-1 overflow-y-auto bg-white dark:bg-gray-900 md:relative md:block md:inset-auto md:z-auto ${isMobilePanelOpen === 'main' ? 'absolute inset-0 w-full z-50' : 'hidden'}`}>
                {/* Mobile Back Button */}
                <div className="md:hidden flex items-center p-4 border-b border-slate-200 dark:border-zinc-800">
                    <button onClick={() => setIsMobilePanelOpen('sidebar')} className="p-2 -ml-2 text-slate-600 dark:text-gray-300">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                    </button>
                    <h2 className="ml-2 text-lg font-bold">{view === 'new' ? 'New Intake' : 'Ticket Details'}</h2>
                </div>

                <div className="p-4 md:p-8 h-full">
                    {view === 'new' ? (
                        <div className="max-w-2xl mx-auto border border-slate-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm h-full">
                            <TicketCreationPanel onCreate={(newId) => { 
                                const updatedTickets = serviceDeskService.getServiceTickets();
                                setTickets(updatedTickets);
                                if (newId) {
                                    const newTicket = updatedTickets.find(t => t.id === newId);
                                    if (newTicket) setSelectedTicket(newTicket);
                                }
                                setView('detail'); 
                            }} />
                        </div>
                    ) : selectedTicket ? (
                        <div className="max-w-4xl mx-auto h-full">
                            <TicketDetailsWorkspace
                                ticket={selectedTicket}
                                onUpdate={loadTickets}
                            />
                        </div>
                    ) : (
                        <div className="flex items-center justify-center h-full text-slate-400">
                            Select a ticket or create a new order
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ServiceDeskPanel;
