/**
 * db/models/RepairTicket.ts
 * WatermelonDB Model — Repair Ticket (Service Desk)
 *
 * The `data_json` column is a flexible JSONB-style blob mirroring the
 * PostgreSQL design. It stores unstructured diagnostic logs, technician notes,
 * device specs, and any free-form service data for this ticket.
 */

import { Model } from '@nozbe/watermelondb';
import { field, text } from '@nozbe/watermelondb/decorators';

export default class RepairTicket extends Model {
  static table = 'repair_tickets';

  @text('organization_id') organizationId!: string;
  @text('ticket_number') ticketNumber!: string;
  @text('customer_id') customerId!: string;
  @text('customer_name') customerName!: string;
  @text('device_type') deviceType!: string;
  @text('problem_description') problemDescription!: string;
  @text('status') status!: string;
  @text('technician_id') technicianId!: string;
  @field('estimated_cost') estimatedCost!: number;
  @field('final_cost') finalCost!: number;
  /** Flexible JSON blob for unstructured diagnostic data */
  @text('data_json') dataJson!: string;
  @field('date_in') dateIn!: number;
  @field('date_out') dateOut!: number;
  @field('updated_at') updatedAt!: number;

  /**
   * Returns the parsed diagnostic data blob.
   * Shape is flexible — the technician/service layer defines the structure.
   * Example: { diagnosticNotes: string[], partsUsed: [], deviceSpecs: {} }
   */
  get data(): Record<string, any> {
    try { return JSON.parse(this.dataJson || '{}'); } catch { return {}; }
  }
}
