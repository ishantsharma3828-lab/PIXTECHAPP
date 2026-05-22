
import React, { useContext } from 'react';
import { ServiceTicket, ServiceStatus } from '../../constants/serviceTypes';
import { SettingsContext } from '../../contexts/SettingsContext';
import { getCurrentUser } from '../../services/authService';

interface ActiveTicketsListProps {
    tickets: ServiceTicket[];
    selectedId: string | null;
    onSelect: (ticket: ServiceTicket) => void;
}

const ActiveTicketsList: React.FC<ActiveTicketsListProps> = ({ tickets, selectedId, onSelect }) => {
    const { t } = useContext(SettingsContext);
    const user = getCurrentUser();

    const visibleTickets = tickets.filter(ticket => {
        if (!user) return false;
        if (user.role === 'customer') {
            // Customers only see their own tickets
            return ticket.customerId === user.id; // Assuming user.id matches customerId or we need to look up contact
        }
        // Others see all for now, or we could restrict 'technician' to assigned only?
        // Requirement: "View All" for Admin/Tech. Manager/Cashier see Updates. 
        // Let's allow all staff to see list for now.
        return true;
    });

    const getStatusColor = (status: ServiceStatus) => {
        switch (status) {
            case 'intake': return 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-300';
            case 'diagnosis': return 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300';
            case 'pending_admin': return 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-300';
            case 'pending_customer': return 'bg-pink-100 text-pink-600 dark:bg-pink-900/30 dark:text-pink-300';
            case 'repair': return 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-300';
            case 'qc': return 'bg-teal-100 text-teal-600 dark:bg-teal-900/30 dark:text-teal-300';
            case 'ready': return 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-300';
            case 'closed': return 'bg-slate-100 text-slate-600 dark:bg-slate-900/30 dark:text-slate-300';
            default: return 'bg-slate-100 text-slate-600';
        }
    };

    return (
        <div className="flex-1 overflow-y-auto bg-slate-100 dark:bg-gray-900 flex flex-col min-w-0 md:min-w-[300px]">
            {/* Header */}
            <div className="p-4 bg-white dark:bg-gray-800 border-b border-slate-200 dark:border-zinc-800 shadow-sm sticky top-0 z-10">
                <h3 className="font-bold text-slate-800 dark:text-white text-lg">{t('service.active_tickets')} ({tickets.length})</h3>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {visibleTickets.length === 0 ? (
                    <div className="text-center py-10 text-gray-400">
                        <svg className="w-16 h-16 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                        {t('service.no_active')}
                    </div>
                ) : (
                    visibleTickets.map(ticket => (
                        <div
                            key={ticket.id}
                            onClick={() => onSelect(ticket)}
                            className={`bg-white dark:bg-gray-800 rounded-lg p-3 border-l-4 shadow-sm cursor-pointer hover:shadow-md transition-all ${selectedId === ticket.id ? 'border-[var(--color-primary)] ring-2 ring-[var(--color-primary)] ring-opacity-50' : 'border-transparent hover:border-slate-300 dark:hover:border-gray-600'}`}
                        >
                            <div className="flex justify-between items-start mb-2">
                                <span className="font-mono text-xs text-slate-500 bg-slate-100 dark:bg-gray-700 px-2 py-0.5 rounded">{ticket.ticketNumber}</span>
                                <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${getStatusColor(ticket.status)}`}>
                                    {t(`service.status.${ticket.status}`)}
                                </span>
                            </div>

                            <h4 className="font-bold text-slate-800 dark:text-white truncate">{ticket.customerName}</h4>
                            <p className="text-sm text-slate-600 dark:text-gray-300 truncate">
                                {ticket.devices && ticket.devices.length > 0 
                                    ? `${ticket.devices[0].type} - ${ticket.devices[0].brand} ${ticket.devices[0].model}${ticket.devices.length > 1 ? ` (+${ticket.devices.length - 1} more)` : ''}`
                                    : 'No Device'}
                            </p>

                            <div className="flex justify-between items-center mt-3 pt-2 border-t border-gray-100 dark:border-zinc-800 text-xs">
                                <span className={`font-bold ${ticket.urgency === 'emergency' ? 'text-red-600 animate-pulse' : ticket.urgency === 'high' ? 'text-orange-500' : 'text-gray-400'}`}>
                                    {t(`service.urgency.${ticket.urgency}`).toUpperCase()}
                                </span>
                                <span className="text-gray-400">{new Date(ticket.dateIn).toLocaleDateString()}</span>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default ActiveTicketsList;
