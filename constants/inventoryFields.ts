export interface Product {
  id: string;
  name: string;
  sku: string;
  brand: string;
  category: string;
  costPrice: number;
  price1: number; // Standard selling price
  price2: number;
  price3: number; // Build Price 1
  price4: number; // Build Price 2
  quantity: number;
  minStock: number;
  description: string;
  warranty: {
    enabled: boolean;
    days: number;
  };
  customFields?: Record<string, any>;
  images?: { id: string; url: string; }[];

  // ZR Express Integration
  zrExpressProductId?: string;
  zrCategoryId?: string;
  zrSubCategoryId?: string;

  isBundle?: boolean;
  bundleItems?: string[]; // Array of product IDs
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
  isDeleted?: boolean;
  deletedAt?: string;
  deletedBy?: string;
  approvalStatus?: 'approved' | 'pending' | 'rejected';
}

export interface ProductField {
  key: keyof Product | string; // Use keyof for core fields, string for custom
  label: string;
  type: 'text' | 'number' | 'longtext' | 'boolean' | 'warranty' | 'status' | 'badge' | 'image' | 'currency' | 'actions' | 'select' | 'date';
  isCore?: boolean; // Core fields cannot be deleted
  isVisible?: boolean; // Toggles visibility in forms/UI
  placeholder?: string;
  isVirtual?: boolean; // Indicates a field that is calculated, not stored
  options?: string[]; // For select type
}