
import { BusinessRules, Coupon } from '../constants/businessRuleTypes';

const RULES_KEY = 'pos_business_rules';

const DEFAULT_RULES: BusinessRules = {
    loyalty: {
        enabled: true,
        pointsPerCurrency: 1, // 1 point per $1
        redemptionRate: 0.01, // 1 point = $0.01
        minRedemptionPoints: 100,
        signupBonus: 50
    },
    tax: {
        enabled: true,
        defaultTaxRate: 8, // 8%
        isTaxIncluded: false,
        taxName: 'VAT',
        taxNumber: ''
    },
    policy: {
        defaultWarrantyDays: 365,
        returnWindowDays: 14,
        maxDebtLimit: 1000,
        defaultAssemblyFee: 0,
        receiptFooterText: 'Thank you for your business!',
        invoiceTerms: 'Payment due upon receipt.',
        rmaPolicy: 'Items must be returned in original packaging.'
    },
    coupons: [
        { id: 'cpn_1', code: 'WELCOME10', type: 'fixed', value: 10, description: 'Welcome Discount', isActive: true, usageCount: 0, minOrder: 50, color: 'bg-green-100 text-green-800 border-green-200' },
        { id: 'cpn_2', code: 'SUMMER20', type: 'percentage', value: 20, description: 'Summer Sale', isActive: true, usageCount: 0, minOrder: 0, color: 'bg-orange-100 text-orange-800 border-orange-200' },
        { id: 'cpn_3', code: 'VIP5', type: 'percentage', value: 5, description: 'VIP Member', isActive: true, usageCount: 0, minOrder: 100, color: 'bg-purple-100 text-purple-800 border-purple-200' }
    ]
};

export const getBusinessRules = (): BusinessRules => {
    try {
        const stored = localStorage.getItem(RULES_KEY);
        if (stored) {
            const parsed = JSON.parse(stored);
            // Deep merge with defaults to ensure new fields are present
            return {
                ...DEFAULT_RULES,
                ...parsed,
                loyalty: { ...DEFAULT_RULES.loyalty, ...(parsed.loyalty || {}) },
                tax: { ...DEFAULT_RULES.tax, ...(parsed.tax || {}) },
                policy: { ...DEFAULT_RULES.policy, ...(parsed.policy || {}) },
                coupons: parsed.coupons || DEFAULT_RULES.coupons
            };
        }
    } catch (e) {
        console.error("Failed to load business rules", e);
    }
    return DEFAULT_RULES;
};

export const saveBusinessRules = (rules: BusinessRules): void => {
    localStorage.setItem(RULES_KEY, JSON.stringify(rules));
};

export const updateLoyaltyConfig = (config: Partial<BusinessRules['loyalty']>): void => {
    const rules = getBusinessRules();
    rules.loyalty = { ...rules.loyalty, ...config };
    saveBusinessRules(rules);
};

export const updateTaxConfig = (config: Partial<BusinessRules['tax']>): void => {
    const rules = getBusinessRules();
    rules.tax = { ...rules.tax, ...config };
    saveBusinessRules(rules);
};

export const updatePolicyConfig = (config: Partial<BusinessRules['policy']>): void => {
    const rules = getBusinessRules();
    rules.policy = { ...rules.policy, ...config };
    saveBusinessRules(rules);
};

// --- Coupon Management ---

export const getCoupons = (): Coupon[] => {
    return getBusinessRules().coupons;
};

export const saveCoupon = (coupon: Coupon): void => {
    const rules = getBusinessRules();
    const index = rules.coupons.findIndex(c => c.id === coupon.id);
    if (index >= 0) {
        rules.coupons[index] = coupon;
    } else {
        rules.coupons.push(coupon);
    }
    saveBusinessRules(rules);
};

export const deleteCoupon = (id: string): void => {
    const rules = getBusinessRules();
    rules.coupons = rules.coupons.filter(c => c.id !== id);
    saveBusinessRules(rules);
};

export const createCoupon = (data: Partial<Coupon>): void => {
    const newCoupon: Coupon = {
        id: `cpn_${Date.now()}`,
        code: data.code || 'NEW',
        type: data.type || 'fixed',
        value: data.value || 0,
        description: data.description || '',
        isActive: true,
        usageCount: 0,
        color: 'bg-blue-100 text-blue-800 border-blue-200',
        ...data
    };
    saveCoupon(newCoupon);
};
