/**
 * services/contactService.ts
 * Titan Stack — Contact Service (WatermelonDB)
 *
 * Ported from RxDB to WatermelonDB query API.
 * Public API is identical — zero changes required in consuming components.
 */

import { Q } from '@nozbe/watermelondb';
import { database, customersCollection } from '../db';
import { v4 as uuidv4 } from 'uuid';
import { Contact } from '../constants/contactTypes';
import { getCurrentUser } from './authService';

export type { Contact, ContactRole } from '../constants/contactTypes';

// ─── Map WatermelonDB Customer → UI Contact ────────────────────────────────────
const mapDocToContact = (doc: any): Contact => ({
  id:            doc.id,
  name:          doc.name         || '',
  email:         doc.email        || '',
  phone:         doc.phone        || '',
  address:       doc.address      || '',
  city:          doc.city         || '',
  companyName:   doc.companyName  || '',
  type:          'individual',
  roles:         ['customer'],
  createdAt:     doc.updatedAt ? new Date(doc.updatedAt).toISOString() : new Date().toISOString(),
  currentBalance: doc.currentBalance ?? 0,
  creditLimit:   doc.creditLimit  ?? 0,
  legalForm:     '',
  rcNumber:      '',
  nifNumber:     '',
  nisNumber:     '',
  artNumber:     '',
  taxId:         '',
  paymentTerms:  'Cash',
  currency:      'DZD',
  pictureUrl:    '',
  tags:          doc.tags         || [],
  notes:         doc.notes        || '',
  status:        doc.status       || 'active',
  lastActivity:  doc.updatedAt ? new Date(doc.updatedAt).toISOString() : new Date().toISOString(),
});

// ─── Public API ────────────────────────────────────────────────────────────────

export const getContacts = async (): Promise<Contact[]> => {
  const docs = await customersCollection.query(
    Q.where('status', Q.notEq('deleted'))
  ).fetch();
  return docs.map(mapDocToContact);
};

export const saveContact = async (contact: Contact): Promise<Contact> => {
  const user    = getCurrentUser();
  const orgId   = user?.organizationId || 'local';
  const nowMs   = Date.now();

  // Try to find existing record
  let existing: any = null;
  try {
    existing = await customersCollection.find(contact.id);
  } catch {
    // Not found — will create
  }

  await database.write(async () => {
    if (existing) {
      await existing.update((r: any) => {
        r.name           = contact.name;
        r.email          = contact.email || '';
        r.phone          = contact.phone || '';
        r.address        = contact.address || '';
        r.city           = contact.city || '';
        r.companyName    = contact.companyName || '';
        r.currentBalance = contact.currentBalance ?? 0;
        r.creditLimit    = contact.creditLimit ?? 0;
        r.notes          = contact.notes || '';
        r.status         = contact.status || 'active';
        r.tagsJson       = JSON.stringify(contact.tags || []);
        r.updatedAt      = nowMs;
      });
    } else {
      await customersCollection.create((r: any) => {
        r._raw.id        = contact.id;
        r.organizationId = orgId;
        r.name           = contact.name;
        r.email          = contact.email || '';
        r.phone          = contact.phone || '';
        r.address        = contact.address || '';
        r.city           = contact.city || '';
        r.companyName    = contact.companyName || '';
        r.loyaltyPoints  = 0;
        r.totalSpent     = 0;
        r.currentBalance = contact.currentBalance ?? 0;
        r.creditLimit    = contact.creditLimit ?? 0;
        r.tier           = 'Bronze';
        r.notes          = contact.notes || '';
        r.status         = contact.status || 'active';
        r.tagsJson       = JSON.stringify(contact.tags || []);
        r.updatedAt      = nowMs;
      });
    }
  });

  return contact;
};

export const createContact = async (data: Partial<Contact>): Promise<Contact> => {
  const user  = getCurrentUser();
  const orgId = user?.organizationId || 'local';
  const id    = uuidv4();
  const nowMs = Date.now();

  await database.write(async () => {
    await customersCollection.create((r: any) => {
      r._raw.id        = id;
      r.organizationId = orgId;
      r.name           = data.name || 'Unknown';
      r.email          = data.email || '';
      r.phone          = data.phone || '';
      r.address        = data.address || '';
      r.city           = data.city || '';
      r.companyName    = data.companyName || '';
      r.loyaltyPoints  = 0;
      r.totalSpent     = 0;
      r.currentBalance = 0;
      r.creditLimit    = data.creditLimit || 0;
      r.tier           = 'Bronze';
      r.notes          = data.notes || '';
      r.status         = 'active';
      r.tagsJson       = JSON.stringify(data.tags || []);
      r.updatedAt      = nowMs;
    });
  });

  return {
    id,
    name:          data.name || 'Unknown',
    email:         data.email || '',
    phone:         data.phone || '',
    address:       data.address || '',
    city:          data.city || '',
    companyName:   data.companyName || '',
    type:          data.type || 'individual',
    roles:         data.roles || ['customer'],
    createdAt:     new Date(nowMs).toISOString(),
    currentBalance: 0,
    creditLimit:   data.creditLimit || 0,
    legalForm: '', rcNumber: '', nifNumber: '', nisNumber: '', artNumber: '', taxId: '',
    paymentTerms:  data.paymentTerms || 'Cash',
    currency:      'DZD',
    pictureUrl:    data.pictureUrl || '',
    tags:          data.tags || [],
    notes:         data.notes || '',
    status:        'active',
    lastActivity:  new Date(nowMs).toISOString(),
  } as Contact;
};

export const updateContact = (contact: Contact): Promise<Contact> => saveContact(contact);

export const deleteContact = async (id: string): Promise<void> => {
  let doc: any = null;
  try { doc = await customersCollection.find(id); } catch { return; }
  await database.write(async () => {
    await doc.destroyPermanently();
  });
};
