/**
 * db/schema.ts
 * WatermelonDB Schema — Titan Stack v1
 *
 * This schema mirrors the PostgreSQL target tables. All complex objects
 * (items, payments, images, etc.) are stored as JSON strings in `_json`
 * suffixed columns for portability between the LokiJS (web) and SQLite
 * (native) adapters. The application services are responsible for
 * JSON.parse / JSON.stringify at the boundary.
 */

import { appSchema, tableSchema } from '@nozbe/watermelondb';

export const schema = appSchema({
  version: 3,
  tables: [
    // ─── USERS (Staff Profiles) ────────────────────────────────────────────────
    tableSchema({
      name: 'users',
      columns: [
        { name: 'organization_id', type: 'string' },
        { name: 'username', type: 'string' },
        { name: 'full_name', type: 'string', isOptional: true },
        { name: 'email', type: 'string' },
        { name: 'phone', type: 'string', isOptional: true },
        { name: 'role', type: 'string' },
        { name: 'branch', type: 'string', isOptional: true },
        { name: 'permissions_json', type: 'string', isOptional: true },
        { name: 'pin_code_hash', type: 'string', isOptional: true },
        { name: 'updated_at', type: 'number' },
      ],
    }),

    // ─── PRODUCTS ──────────────────────────────────────────────────────────────
    tableSchema({
      name: 'products',
      columns: [
        { name: 'organization_id', type: 'string' },
        { name: 'name', type: 'string' },
        { name: 'sku', type: 'string', isOptional: true },
        { name: 'brand', type: 'string', isOptional: true },
        { name: 'category', type: 'string', isOptional: true },
        { name: 'cost_price', type: 'number' },
        { name: 'price1', type: 'number' },
        { name: 'price2', type: 'number', isOptional: true },
        { name: 'price3', type: 'number', isOptional: true },
        { name: 'price4', type: 'number', isOptional: true },
        { name: 'quantity', type: 'number' },
        { name: 'min_stock', type: 'number' },
        { name: 'description', type: 'string', isOptional: true },
        { name: 'custom_fields_json', type: 'string', isOptional: true },
        { name: 'images_json', type: 'string', isOptional: true },
        { name: 'warranty_json', type: 'string', isOptional: true },
        { name: 'approval_status', type: 'string', isOptional: true },
        { name: 'is_deleted', type: 'boolean' },
        { name: 'updated_at', type: 'number' },
      ],
    }),

    // ─── CUSTOMERS ─────────────────────────────────────────────────────────────
    tableSchema({
      name: 'customers',
      columns: [
        { name: 'organization_id', type: 'string' },
        { name: 'name', type: 'string' },
        { name: 'email', type: 'string', isOptional: true },
        { name: 'phone', type: 'string', isOptional: true },
        { name: 'address', type: 'string', isOptional: true },
        { name: 'city', type: 'string', isOptional: true },
        { name: 'company_name', type: 'string', isOptional: true },
        { name: 'loyalty_points', type: 'number' },
        { name: 'total_spent', type: 'number' },
        { name: 'current_balance', type: 'number' },
        { name: 'credit_limit', type: 'number', isOptional: true },
        { name: 'tier', type: 'string', isOptional: true },
        { name: 'tags_json', type: 'string', isOptional: true },
        { name: 'notes', type: 'string', isOptional: true },
        { name: 'status', type: 'string', isOptional: true },
        { name: 'updated_at', type: 'number' },
      ],
    }),

    // ─── SALES / ORDERS ────────────────────────────────────────────────────────
    tableSchema({
      name: 'sales',
      columns: [
        { name: 'organization_id', type: 'string' },
        { name: 'cashier_id', type: 'string', isOptional: true },
        { name: 'customer_id', type: 'string', isOptional: true },
        { name: 'friendly_id', type: 'string', isOptional: true },
        { name: 'subtotal', type: 'number' },
        { name: 'tax', type: 'number' },
        { name: 'discount', type: 'number' },
        { name: 'total', type: 'number' },
        { name: 'items_json', type: 'string' },
        { name: 'payments_json', type: 'string' },
        { name: 'status', type: 'string' },
        { name: 'delivery_details_json', type: 'string', isOptional: true },
        { name: 'debt_details_json', type: 'string', isOptional: true },
        { name: 'audit_log_json', type: 'string', isOptional: true },
        { name: 'is_deleted', type: 'boolean', isOptional: true },
        { name: 'synced_at', type: 'number', isOptional: true },
        { name: 'updated_at', type: 'number' },
      ],
    }),

    // ─── REPAIR TICKETS (Service Desk) ─────────────────────────────────────────
    tableSchema({
      name: 'repair_tickets',
      columns: [
        { name: 'organization_id', type: 'string' },
        { name: 'ticket_number', type: 'string' },
        { name: 'customer_id', type: 'string', isOptional: true },
        { name: 'customer_name', type: 'string', isOptional: true },
        { name: 'device_type', type: 'string', isOptional: true },
        { name: 'problem_description', type: 'string', isOptional: true },
        { name: 'status', type: 'string' },
        { name: 'technician_id', type: 'string', isOptional: true },
        { name: 'estimated_cost', type: 'number', isOptional: true },
        { name: 'final_cost', type: 'number', isOptional: true },
        { name: 'data_json', type: 'string', isOptional: true },
        { name: 'date_in', type: 'number' },
        { name: 'date_out', type: 'number', isOptional: true },
        { name: 'updated_at', type: 'number' },
      ],
    }),
  ],
});

