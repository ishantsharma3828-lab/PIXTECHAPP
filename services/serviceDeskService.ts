
import { ServiceTicket, ServiceStatus, ServiceItem, DiagnosisPart } from '../constants/serviceTypes';
import * as activityLog from './activityLogService';
import { addNotification } from './notificationService';
import { getCurrentUser } from './authService';

const TICKETS_KEY = 'pos_service_tickets';

// ─── Helpers ───────────────────────────────────────────────────────────────────

const generateTicketNumber = (): string => {
    const count = getServiceTickets().length;
    return `SR-${(1000 + count + 1).toString()}`;
};

const getCurrentUserSafe = () => {
    const u = getCurrentUser();
    return { id: u?.id || 'unknown', username: u?.username || 'system' };
};

// ─── Data Access ───────────────────────────────────────────────────────────────

export const getServiceTickets = (): ServiceTicket[] => {
    try {
        const stored = localStorage.getItem(TICKETS_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch (e) {
        console.error('Failed to load tickets', e);
        return [];
    }
};

export const saveTicket = (ticket: ServiceTicket): ServiceTicket => {
    const tickets = getServiceTickets();
    const index = tickets.findIndex(t => t.id === ticket.id);
    if (index >= 0) {
        tickets[index] = ticket;
    } else {
        tickets.unshift(ticket);
    }
    localStorage.setItem(TICKETS_KEY, JSON.stringify(tickets));
    return ticket;
};

export const createTicket = (data: Omit<ServiceTicket, 'id' | 'ticketNumber' | 'status' | 'dateIn' | 'items' | 'technicianNotes' | 'diagnosis' | 'diagnosisData' | 'repairNotes' | 'qc' | 'totalEstimate' | 'deposit'>): ServiceTicket => {
    const { id: userId, username } = getCurrentUserSafe();
    const newTicket: ServiceTicket = {
        ...data,
        id: `ticket_${Date.now()}`,
        ticketNumber: generateTicketNumber(),
        status: 'intake',
        dateIn: new Date().toISOString(),
        items: [],
        technicianNotes: '',
        diagnosis: '',
        diagnosisData: {
            techNotes: '',
            parts: [],
            laborCost: 0,
            estimatedHours: 0,
            approved: false,
        },
        repairNotes: '',
        qc: { checks: {}, notes: '' },
        totalEstimate: 0,
        deposit: 0,
    };
    const saved = saveTicket(newTicket);

    const mainDevice = saved.devices.length > 0 ? saved.devices[0].type : 'Device';
    const deviceSummary = saved.devices.length > 1 ? `${mainDevice} + ${saved.devices.length - 1} more` : mainDevice;

    // Log + notify
    activityLog.logTicketCreated(userId, username, saved.ticketNumber, deviceSummary);
    addNotification({
        title: 'New Repair Ticket',
        message: `${saved.ticketNumber} — ${deviceSummary} for ${saved.customerName}`,
        type: 'info',
        link: '/pos/service-desk',
    });

    return saved;
};

// ─── Workflow Transitions ──────────────────────────────────────────────────────

/**
 * Technician submits diagnosis — moves to pending_admin.
 * The diagnosisData is saved and locked. Repairman sees this price forever.
 */
export const submitDiagnosis = (ticket: ServiceTicket, diagnosisData: ServiceTicket['diagnosisData']): ServiceTicket => {
    const { id: userId, username } = getCurrentUserSafe();
    const updated: ServiceTicket = {
        ...ticket,
        diagnosisData: { ...diagnosisData, approved: false },
        status: 'pending_admin',
    };
    const saved = saveTicket(updated);
    activityLog.logTicketStatusChange(userId, username, saved.ticketNumber, 'pending_admin');
    const mainDevice = saved.devices.length > 0 ? saved.devices[0].type : 'Device';
    addNotification({
        title: 'Diagnosis Ready for Review',
        message: `${saved.ticketNumber} — ${mainDevice} awaits admin approval`,
        type: 'warning',
        link: '/pos/service-desk',
        audience: 'admin',
    });
    return saved;
};

/**
 * Admin approves the diagnosis, optionally adjusting price.
 * Moves to pending_customer. Tech's price is preserved.
 */
export const adminApprove = (
    ticket: ServiceTicket,
    adjustedParts: DiagnosisPart[],
    adjustedLaborCost: number,
    adminNotes: string,
    reviewerUsername: string,
    reviewerUserId: string
): ServiceTicket => {
    const updated: ServiceTicket = {
        ...ticket,
        status: 'pending_customer',
        adminReview: {
            adjustedParts,
            adjustedLaborCost,
            adminNotes,
            reviewedBy: reviewerUsername,
            reviewedAt: new Date().toISOString(),
        },
    };
    const saved = saveTicket(updated);
    activityLog.logTicketStatusChange(reviewerUserId, reviewerUsername, saved.ticketNumber, 'pending_customer');
    addNotification({
        title: 'Customer Approval Pending',
        message: `${saved.ticketNumber} — Awaiting customer confirmation`,
        type: 'info',
        link: '/pos/service-desk',
    });
    return saved;
};

/**
 * Admin rejects the diagnosis — sends ticket back to technician.
 */
export const adminReject = (
    ticket: ServiceTicket,
    adminNotes: string,
    reviewerUsername: string,
    reviewerUserId: string
): ServiceTicket => {
    const updated: ServiceTicket = {
        ...ticket,
        status: 'diagnosis',
        adminReview: {
            adjustedParts: [],
            adjustedLaborCost: 0,
            adminNotes,
            reviewedBy: reviewerUsername,
            reviewedAt: new Date().toISOString(),
        },
    };
    const saved = saveTicket(updated);
    activityLog.logTicketStatusChange(reviewerUserId, reviewerUsername, saved.ticketNumber, 'diagnosis');
    return saved;
};

/**
 * Customer approves the quote — repair begins.
 */
export const customerApprove = (ticket: ServiceTicket, staffUsername: string, staffUserId: string): ServiceTicket => {
    const updated: ServiceTicket = {
        ...ticket,
        status: 'repair',
        customerConfirmation: {
            decision: 'approved',
            decidedAt: new Date().toISOString(),
            decidedBy: staffUsername,
        },
    };
    const saved = saveTicket(updated);
    activityLog.logTicketStatusChange(staffUserId, staffUsername, saved.ticketNumber, 'repair');
    return saved;
};

/**
 * Customer declines — ticket is closed.
 */
export const customerDecline = (ticket: ServiceTicket, reason: string, staffUsername: string, staffUserId: string): ServiceTicket => {
    const updated: ServiceTicket = {
        ...ticket,
        status: 'closed',
        dateOut: new Date().toISOString(),
        customerConfirmation: {
            decision: 'declined',
            declineReason: reason,
            decidedAt: new Date().toISOString(),
            decidedBy: staffUsername,
        },
    };
    const saved = saveTicket(updated);
    activityLog.logTicketStatusChange(staffUserId, staffUsername, saved.ticketNumber, 'closed');
    addNotification({
        title: 'Ticket Closed — Declined',
        message: `${saved.ticketNumber} declined by customer: ${reason}`,
        type: 'warning',
        link: '/pos/service-desk',
    });
    return saved;
};

// ─── Generic Ticket Save (for QC checks, repair notes, etc.) ──────────────────

export const advanceTicket = (ticket: ServiceTicket, newStatus: ServiceStatus): ServiceTicket => {
    const { id: userId, username } = getCurrentUserSafe();
    const updates: Partial<ServiceTicket> = { status: newStatus };
    if (newStatus === 'closed') {
        updates.dateOut = new Date().toISOString();
    }
    const updated = { ...ticket, ...updates };
    const saved = saveTicket(updated);
    activityLog.logTicketStatusChange(userId, username, saved.ticketNumber, newStatus);
    if (newStatus === 'ready') {
        addNotification({
            title: 'Device Ready for Pickup',
            message: `${saved.ticketNumber} — ${saved.customerName}'s device(s) ready`,
            type: 'success',
            link: '/pos/service-desk',
        });
    }
    if (newStatus === 'closed') {
        addNotification({
            title: 'Ticket Closed',
            message: `${saved.ticketNumber} has been completed and closed`,
            type: 'success',
            link: '/pos/service-desk',
        });
    }
    return saved;
};

// ─── Calculations ─────────────────────────────────────────────────────────────

export const calculateTechTotal = (ticket: ServiceTicket): number => {
    const parts = (ticket.diagnosisData?.parts || []).reduce((s, p) => s + p.price * p.qty, 0);
    return parts + (ticket.diagnosisData?.laborCost || 0);
};

export const calculateAdminTotal = (ticket: ServiceTicket): number => {
    if (!ticket.adminReview) return calculateTechTotal(ticket);
    const parts = (ticket.adminReview.adjustedParts || []).reduce((s, p) => s + p.price * p.qty, 0);
    return parts + (ticket.adminReview.adjustedLaborCost || 0);
};

/**
 * Returns the price the customer should see (admin-adjusted if exists, otherwise tech's).
 */
export const calculateCustomerTotal = (ticket: ServiceTicket): number => {
    return calculateAdminTotal(ticket);
};
