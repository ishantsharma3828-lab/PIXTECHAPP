
import { Product } from '../constants/inventoryFields';
import { DraftOrder } from '../constants/billingTypes';
import { saveDraft } from './billingService';

export interface BuildPart extends Product {
    uniqueId: string; // To allow multiple of same item (e.g., storage)
    categoryType: PartCategory;
}

export type PartCategory = 'CPU' | 'Motherboard' | 'RAM' | 'GPU' | 'Storage' | 'PSU' | 'Case' | 'Cooling' | 'OS' | 'Monitor' | 'Peripherals' | 'Services';

export interface PCBuild {
    id: string;
    name: string;
    customerName?: string;
    parts: BuildPart[];
    assemblyFee: number;
    notes: string;
    priceTier: 'price1' | 'price2' | 'price3' | 'price4';
    savedAt: string;
}

export const CATEGORIES: { id: PartCategory; label: string; icon: string }[] = [
    { id: 'CPU', label: 'Processor (CPU)', icon: 'microchip' },
    { id: 'Motherboard', label: 'Motherboard', icon: 'chess-board' },
    { id: 'Cooling', label: 'Cooling', icon: 'fan' },
    { id: 'RAM', label: 'Memory (RAM)', icon: 'memory' },
    { id: 'GPU', label: 'Graphics Card', icon: 'video' },
    { id: 'Storage', label: 'Storage', icon: 'hdd' },
    { id: 'PSU', label: 'Power Supply', icon: 'plug' },
    { id: 'Case', label: 'Case / Chassis', icon: 'box' },
    { id: 'OS', label: 'Operating System', icon: 'compact-disc' },
    { id: 'Services', label: 'Services', icon: 'tools' },
];

const BUILDS_KEY = 'pos_pc_builds';

// --- COMPATIBILITY ENGINE ---

interface CompatibilityResult {
    compatible: boolean;
    issues: string[];
}

const normalize = (str?: string) => (str || '').toLowerCase().replace(/[^a-z0-9]/g, '');

export const checkCompatibility = (parts: BuildPart[]): CompatibilityResult => {
    const issues: string[] = [];
    const cpu = parts.find(p => p.categoryType === 'CPU');
    const mobo = parts.find(p => p.categoryType === 'Motherboard');
    const ram = parts.find(p => p.categoryType === 'RAM');
    const psu = parts.find(p => p.categoryType === 'PSU');

    // 1. Check Socket (CPU <-> Mobo)
    if (cpu && mobo) {
        const cpuSocket = cpu.customFields?.socket;
        const moboSocket = mobo.customFields?.socket;

        if (cpuSocket && moboSocket) {
            if (normalize(cpuSocket) !== normalize(moboSocket)) {
                issues.push(`Socket Mismatch: CPU (${cpuSocket}) vs Mobo (${moboSocket})`);
            }
        } else {
            // Warn if data missing but don't fail hard unless strict mode
            // issues.push("Warning: Socket info missing for CPU or Motherboard");
        }
    }

    // 2. Check Memory Type (Mobo <-> RAM)
    if (mobo && ram) {
        const moboMem = mobo.customFields?.memory_type || mobo.customFields?.memoryType; // Check both keys just in case
        const ramMem = ram.customFields?.memory_type || ram.customFields?.memoryType;

        if (moboMem && ramMem) {
            // Check if one contains the other (e.g. "DDR4" inside "DDR4 3200MHz")
            if (!normalize(moboMem).includes(normalize(ramMem)) && !normalize(ramMem).includes(normalize(moboMem))) {
                issues.push(`Memory Mismatch: Mobo supports ${moboMem}, RAM is ${ramMem}`);
            }
        }
    }

    // 3. Wattage Check (Total vs PSU)
    const totalWatts = calculateTotalWattage(parts);
    if (psu) {
        const psuWatts = Number(psu.customFields?.wattage || 0);
        if (psuWatts > 0) {
            if (psuWatts < totalWatts) {
                issues.push(`INSUFFICIENT POWER: Estimated ${totalWatts}W exceeds PSU capacity ${psuWatts}W`);
            } else if (psuWatts < totalWatts * 1.2) {
                issues.push(`Power Warning: Load ${totalWatts}W is close to PSU limit ${psuWatts}W (Recommend >${Math.ceil(totalWatts * 1.2)}W)`);
            }
        }
    } else if (totalWatts > 0) {
        issues.push(`Missing Power Supply for estimated ${totalWatts}W load.`);
    }

    return { compatible: issues.length === 0, issues };
};

export const calculateTotalWattage = (parts: BuildPart[]): number => {
    // defaults if customFields.wattage is missing
    const defaults: Record<string, number> = {
        'CPU': 65,
        'GPU': 150,
        'Motherboard': 50,
        'RAM': 5,
        'Storage': 10,
        'Cooling': 5,
        'Case': 0,
        'PSU': 0
    };

    return parts.reduce((total, part) => {
        // Check "wattage" key
        let stated = Number(part.customFields?.wattage);
        if (isNaN(stated) || stated <= 0) {
            // Fallback logic for common high-power items if not explicitly set
            const name = part.name.toLowerCase();
            if (part.categoryType === 'GPU') {
                if (name.includes('4090')) stated = 450;
                else if (name.includes('4080')) stated = 320;
                else if (name.includes('4070')) stated = 200;
                else if (name.includes('3090')) stated = 350;
                else if (name.includes('3080')) stated = 320;
                else if (name.includes('3070')) stated = 220;
                else if (name.includes('3060')) stated = 170;
                else if (name.includes('rx 7900')) stated = 355;
            }
            if (part.categoryType === 'CPU') {
                if (name.includes('i9') || name.includes('ryzen 9')) stated = 125; // Base, roughly
                else if (name.includes('i7') || name.includes('ryzen 7')) stated = 105;
            }
        }

        // Use stated if found, else default
        const val = (stated && stated > 0) ? stated : (defaults[part.categoryType] || 0);

        // Don't add PSU capacity to load
        if (part.categoryType === 'PSU') return total;

        return total + val;
    }, 0);
};

// --- DATA MANAGEMENT ---

export const getSavedBuilds = (): PCBuild[] => {
    try {
        return JSON.parse(localStorage.getItem(BUILDS_KEY) || '[]');
    } catch {
        return [];
    }
};

export const saveBuildTemplate = (build: PCBuild): void => {
    const builds = getSavedBuilds();
    const existingIndex = builds.findIndex(b => b.id === build.id);
    if (existingIndex >= 0) {
        builds[existingIndex] = build;
    } else {
        builds.push(build);
    }
    localStorage.setItem(BUILDS_KEY, JSON.stringify(builds));
};

export const deleteBuildTemplate = (id: string): void => {
    const builds = getSavedBuilds();
    const filtered = builds.filter(b => b.id !== id);
    localStorage.setItem(BUILDS_KEY, JSON.stringify(filtered));
};

export const sendToBilling = (build: PCBuild, user: string): void => {
    // 1. Convert Parts to CartItems
    const items = build.parts.map(p => ({
        ...p,
        cartId: `build_${p.uniqueId}`,
        quantity: 1,
        discountType: 'fixed',
        discountValue: 0,
        unitPrice: p[build.priceTier || 'price1'] || 0,
        priceSelection: build.priceTier || 'price1',
        notes: 'PC Build Component'
    }));

    // 2. Add Assembly Fee if applicable
    if (build.assemblyFee > 0) {
        // We create a dummy product for the fee
        const feeItem: any = {
            id: 'assembly_fee',
            name: 'PC Assembly & Testing',
            sku: 'SVC-BUILD',
            brand: 'Service',
            category: 'Services',
            costPrice: 0,
            price1: build.assemblyFee,
            quantity: 1,
            minStock: 0,
            description: 'Professional assembly and stress testing',
            warranty: { enabled: true, days: 30 },
            cartId: `build_fee_${Date.now()}`,
            discountType: 'fixed',
            discountValue: 0,
            unitPrice: build.assemblyFee,
            priceSelection: 'price1',
            images: []
        };
        items.push(feeItem);
    }

    const subtotal = items.reduce((sum, i) => sum + i.unitPrice, 0);
    const total = subtotal; // Tax calculated by billing service later if needed, but here we just pass raw totals

    // 3. Save as Draft
    saveDraft({
        items: items as any[],
        customer: build.customerName ? { name: build.customerName } as any : null,
        subtotal: subtotal,
        total: total,
        pointsRedeemed: 0,
        note: `PC Build: ${build.name}\n${build.notes}`,
        cashierName: user
    });
};
