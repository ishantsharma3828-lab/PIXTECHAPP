
import React, { useState, useEffect, useContext } from 'react';
import * as inventoryService from '../../services/inventoryService';
import { Product } from '../../constants/inventoryFields';
import { PCBuild, BuildPart, PartCategory, sendToBilling, saveBuildTemplate } from '../../services/pcBuilderService';
import { getCurrentUser } from '../../services/authService';
import * as businessRulesService from '../../services/businessRulesService';
import { SettingsContext } from '../../contexts/SettingsContext';
import ComponentSelector from './ComponentSelector';
import BuildWorkspace from './BuildWorkspace';
import BuildSummary from './BuildSummary';
import ProformaModal from './ProformaModal';
import { useToast } from '../../contexts/ToastContext';
import { useCart } from '../../contexts/CartContext';

interface PCConfiguratorPanelProps {
    isStorefront?: boolean;
}

const PCConfiguratorPanel: React.FC<PCConfiguratorPanelProps> = ({ isStorefront }) => {
    const { t } = useContext(SettingsContext);
    const user = getCurrentUser();
    const { addToast } = useToast();
    const { addToCart } = useCart();
    const [inventory, setInventory] = useState<Product[]>([]);
    const [build, setBuild] = useState<PCBuild>({
        id: `build_${Date.now()}`,
        name: 'New Custom PC',
        parts: [],
        assemblyFee: businessRulesService.getBusinessRules().policy.defaultAssemblyFee || 0,
        notes: '',
        priceTier: 'price1',
        savedAt: new Date().toISOString(),
        customerName: user?.role === 'customer' ? (user.fullName || user.username) : undefined
    });
    const [isProformaOpen, setIsProformaOpen] = useState(false);
    const [activeCategory, setActiveCategory] = useState<PartCategory>('CPU');
    const [isSelectorOpenMobile, setIsSelectorOpenMobile] = useState(false);

    useEffect(() => {
        inventoryService.getProducts().then(setInventory);
    }, []);

    // Derived Filters for Component Selector based on current selection
    // E.g. If Motherboard is selected, pass its socket to filter CPUs
    const currentFilters = (() => {
        const mobo = build.parts.find(p => p.categoryType === 'Motherboard');
        const cpu = build.parts.find(p => p.categoryType === 'CPU');

        return {
            socket: mobo?.customFields?.socket || cpu?.customFields?.socket,
            memory: mobo?.customFields?.memoryType
        };
    })();

    const handleAddPart = (part: Product, category: PartCategory) => {
        const newPart: BuildPart = {
            ...part,
            uniqueId: `${part.id}_${Date.now()}`,
            categoryType: category
        };

        setBuild(prev => {
            // Logic: Some categories allow multiple items (RAM, Storage), others replace (CPU, Mobo)
            const singles = ['CPU', 'Motherboard', 'Case', 'PSU', 'GPU']; // GPU could be SLI but simple for now
            let newParts = [...prev.parts];

            if (singles.includes(category)) {
                // Replace existing
                newParts = newParts.filter(p => p.categoryType !== category);
            }
            return { ...prev, parts: [...newParts, newPart] };
        });
    };

    const handleRemovePart = (uniqueId: string) => {
        setBuild(prev => ({
            ...prev,
            parts: prev.parts.filter(p => p.uniqueId !== uniqueId)
        }));
    };

    const handleUpdateBuild = (updates: Partial<PCBuild>) => {
        setBuild(prev => ({ ...prev, ...updates }));
    };

    const handleSendToBilling = () => {
        if (build.parts.length === 0) {
            addToast('Cannot send an empty build to billing', 'error');
            return;
        }

        if (isStorefront) {
            const totalPrice = build.parts.reduce((sum, p) => sum + p.price1, 0) + build.assemblyFee;
            const buildProduct: Product = {
                id: build.id,
                sku: `BUILD-${Date.now()}`,
                name: build.name || 'Custom PC Build',
                category: 'Custom Build',
                brand: 'Custom',
                price1: totalPrice,
                price2: totalPrice,
                price3: totalPrice,
                price4: totalPrice,
                costPrice: build.parts.reduce((sum, p) => sum + (p.costPrice || 0), 0),
                quantity: 1,
                minStock: 0,
                description: `Custom PC Build with ${build.parts.length} parts.`,
                warranty: { enabled: true, days: 365 },
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                customFields: {
                    isCustomBuild: true,
                    buildParts: build.parts.map(p => p.id)
                }
            };
            addToCart(buildProduct);
            addToast('Custom PC added to cart!', 'success');
        } else {
            sendToBilling(build, user?.username || 'Unknown');
            addToast('Build sent to Billing as Draft Order!', 'success');
        }
    };

    const handleSaveTemplate = () => {
        saveBuildTemplate(build);
        addToast(t('settings.saved_success') || 'Template saved successfully', 'success');
    };

    const handleClear = () => {
        setBuild({
            id: `build_${Date.now()}`,
            name: 'New Custom PC',
            parts: [],
            assemblyFee: businessRulesService.getBusinessRules().policy.defaultAssemblyFee || 0,
            notes: '',
            priceTier: 'price1',
            savedAt: new Date().toISOString()
        });
    };

    const handlePrint = () => {
        setIsProformaOpen(true);
    };

    return (
        <div className="flex flex-col h-full w-full relative">

            <div className={`flex flex-col lg:flex-row h-full ${isStorefront ? '' : '-mx-4 sm:-mx-6 md:-mx-8 lg:m-0'}`}>
                {/* Left: Selector (25%) */}
                <div className={`w-full lg:w-1/4 lg:min-w-[300px] h-full z-30 lg:z-10 shadow-md ${isSelectorOpenMobile ? 'fixed inset-0 pt-safe lg:pt-0 lg:relative bg-gray-900/50' : 'hidden lg:block'}`}>
                    <div className="w-full h-full lg:h-full bg-transparent lg:bg-white lg:dark:bg-gray-800 flex flex-col justify-end lg:justify-start">
                        {isSelectorOpenMobile && <div className="flex-1 lg:hidden" onClick={() => setIsSelectorOpenMobile(false)} />}
                        <div className="h-[85vh] lg:h-full bg-white dark:bg-gray-800 rounded-t-2xl lg:rounded-none overflow-hidden">
                            <ComponentSelector
                                inventory={inventory}
                                onAddPart={(p, c) => { handleAddPart(p, c); setIsSelectorOpenMobile(false); }}
                                filters={currentFilters}
                                activeCategory={activeCategory}
                                onCloseMobile={() => setIsSelectorOpenMobile(false)}
                            />
                        </div>
                    </div>
                </div>

                {/* Center: Workspace (50%) */}
                <div className="flex-1 min-h-0 z-0 overflow-hidden flex flex-col relative">
                    <BuildWorkspace
                        parts={build.parts}
                        onRemovePart={handleRemovePart}
                        onSelectCategory={(c) => { setActiveCategory(c); setIsSelectorOpenMobile(true); }}
                    />
                </div>

                {/* Right: Summary (25%) */}
                <div className="w-full lg:w-1/4 lg:min-w-[300px] shrink-0 z-20 sticky bottom-0 lg:relative">
                    <BuildSummary
                        build={build}
                        onUpdateBuild={handleUpdateBuild}
                        onSave={handleSaveTemplate}
                        onSendToBilling={handleSendToBilling}
                        onClear={handleClear}
                        onPrint={handlePrint}
                        isStorefront={isStorefront}
                    />
                </div>

                {isProformaOpen && (
                    <ProformaModal
                        build={build}
                        onClose={() => setIsProformaOpen(false)}
                    />
                )}
            </div>
        </div>
    );
};

export default PCConfiguratorPanel;
