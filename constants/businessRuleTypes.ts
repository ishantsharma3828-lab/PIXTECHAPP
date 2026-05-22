
export interface LoyaltyConfig {
    enabled: boolean;
    pointsPerCurrency: number; // How many points earned per 1 unit of currency spent
    redemptionRate: number; // How much 1 point is worth in currency when redeeming
    minRedemptionPoints: number;
    signupBonus: number; // Points given on new customer creation
}

export interface TaxConfig {
    enabled: boolean;
    defaultTaxRate: number; // Percentage
    isTaxIncluded: boolean; // Are prices tax-inclusive?
    taxName: string; // e.g. "VAT", "Sales Tax"
    taxNumber: string; // Registration number
}

export interface PolicyConfig {
    defaultWarrantyDays: number;
    returnWindowDays: number;
    maxDebtLimit: number; // Default max debt for new customers
    defaultAssemblyFee: number; // Default fee applied in PC Builder
    receiptFooterText: string;
    invoiceTerms: string;
    rmaPolicy: string;
}

// Re-using Coupon interface from billingTypes, but ensuring consistency
export interface Coupon {
    id: string;
    code: string;
    type: 'percentage' | 'fixed';
    value: number;
    minOrder?: number;
    description: string;
    isActive: boolean;
    usageLimit?: number;
    usageCount: number;
    expiryDate?: string;
    color?: string;
}

export interface BusinessRules {
    loyalty: LoyaltyConfig;
    tax: TaxConfig;
    policy: PolicyConfig;
    coupons: Coupon[];
}
