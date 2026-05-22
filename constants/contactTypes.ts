
export type ContactRole = 'customer' | 'supplier' | 'technician' | 'employee' | 'partner' | 'lead';
export type ContactStatus = 'active' | 'blocked' | 'archived';
export type ContactType = 'individual' | 'company';

export interface Contact {
    id: string;
    type: ContactType;
    name: string;
    roles: ContactRole[];
    pictureUrl?: string;

    // Contact Info
    phone: string;
    email?: string;
    address?: string;
    city?: string;

    // Business Info
    companyName?: string;
    legalForm?: string; // SARL, EURL...
    taxId?: string; // Tax/VAT Number
    rcNumber?: string; // Registre Commerce
    nifNumber?: string; // NIF
    nisNumber?: string; // NIS
    artNumber?: string; // Article Imposition

    // ZR Express Details
    zrWilayaId?: string;
    zrCommuneId?: string;
    zrDeliveryPreference?: string;
    zrTimeSlot?: string;
    zrInstruction?: string;

    // Financials
    currency: string;
    creditLimit: number;
    paymentTerms: string;
    currentBalance: number;

    // Metadata
    tags: string[];
    notes: string;
    status: ContactStatus;

    createdAt: string;
    lastActivity?: string;
}
