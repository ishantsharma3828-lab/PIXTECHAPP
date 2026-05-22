
import React, { useState, useContext } from 'react';
import { Product, ProductField } from '../../constants/inventoryFields';
import { SettingsContext } from '../../contexts/SettingsContext';
import * as inventoryService from '../../services/inventoryService';
import * as imageService from '../../services/imageService';
import * as aiService from '../../services/aiService';
import { getCurrentUser } from '../../services/authService';
import { usePermissions } from '../../hooks/usePermissions';
import ProductImagesUploader from './ProductImagesUploader';
import { fetchZRCategories, createZRExpressProduct } from '../../services/shippingService';

const getFriendlyErrorMessage = (error: unknown): string => {
    if (error instanceof Error) {
        const msg = error.message;
        if (msg.includes('API key not valid')) return 'Invalid API Key. Please check your settings.';
        if (msg.includes('403')) return 'Access Denied. API Key might be expired.';
        if (msg.includes('429')) return 'Quota Exceeded. Try again later.';

        // Try to parse JSON error from Google
        try {
            // Extract JSON part if mixed with text
            const match = msg.match(/\{.*\}/);
            if (match) {
                const json = JSON.parse(match[0]);
                if (json.error && json.error.message) return json.error.message;
            }
        } catch (e) { /* ignore parse error */ }

        return msg;
    }
    return "Unknown error occurred";
};



interface ProductModalProps {
    productToEdit?: Product | null;
    onClose: () => void;
    onSave: (product: Product) => void;
}

const ProductModal: React.FC<ProductModalProps> = ({ productToEdit, onClose, onSave }) => {
    const { settings, t } = useContext(SettingsContext);
    const { canEditProduct, visiblePrices, isManager, showStock } = usePermissions();
    // Cashiers and non-editors get a read-only view
    const isReadOnly = !canEditProduct;

    const getInitialState = () => {
        if (productToEdit) return productToEdit;

        const defaultState: Partial<Product> = {
            id: `temp_${Date.now()}`, // Temporary ID for new product
            name: '',
            sku: '',
            brand: '',
            category: '',
            costPrice: 0,
            price1: 0,
            price2: 0,
            price3: 0,
            price4: 0,
            quantity: 0,
            minStock: 0,
            description: '',
            warranty: { enabled: false, days: 0 },
            customFields: {},
            images: [],
        };
        return defaultState as Product;
    };

    const [product, setProduct] = useState<Product>(getInitialState());
    const [isSaving, setIsSaving] = useState(false);
    const [aiLoading, setAiLoading] = useState<string | null>(null); // 'autofill' | 'description' | null
    const [currentImageIndex, setCurrentImageIndex] = useState(0);

    // ZR Express State
    const [zrCategories, setZrCategories] = useState<any[]>([]);
    const [isSyncing, setIsSyncing] = useState(false);
    const [showZrSync, setShowZrSync] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<string>('');
    const [selectedSubCategory, setSelectedSubCategory] = useState<string>('');

    const handleImageChange = (images: { id: string, url: string }[]) => {
        setProduct(p => ({ ...p, images }));
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        const isCheckbox = (e.target as HTMLInputElement).type === 'checkbox';
        const checked = (e.target as HTMLInputElement).checked;

        if (name.startsWith('customFields.')) {
            const key = name.split('.')[1];
            setProduct(p => ({
                ...p,
                customFields: {
                    ...p.customFields,
                    [key]: type === 'number' ? Number(value) : (isCheckbox ? checked : value),
                }
            }));
        } else if (name.startsWith('warranty.')) {
            const key = name.split('.')[1];
            setProduct(p => ({
                ...p,
                warranty: {
                    ...p.warranty,
                    [key]: isCheckbox ? checked : Number(value),
                }
            }));
        } else {
            setProduct(p => ({
                ...p,
                [name]: type === 'number' ? Number(value) : (isCheckbox ? checked : value),
            }));
        }
    };

    const handleAiAutoFill = async () => {
        if (!product.name) return alert("Please enter a Product Name first.");
        setAiLoading('autofill');
        try {
            const details = await aiService.analyzeProductDetails(product.name);
            setProduct(prev => ({
                ...prev,
                brand: details.brand || prev.brand,
                category: details.category || prev.category,
                sku: details.sku || prev.sku
            }));
        } catch (e) {
            console.error(e);
            alert(`AI Error: ${getFriendlyErrorMessage(e)}`);
        } finally {
            setAiLoading(null);
        }
    };

    const handleAiDescription = async () => {
        if (!product.name) return alert("Please enter a Product Name first.");
        setAiLoading('description');
        try {
            const desc = await aiService.generateTechnicalDescription(product.name);
            if (desc) {
                setProduct(prev => ({ ...prev, description: desc }));
            }
        } catch (e) {
            console.error(e);
            alert(`AI Error: ${getFriendlyErrorMessage(e)}`);
        } finally {
            setAiLoading(null);
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            let savedProduct;
            if (product.id && !product.id.startsWith('temp_')) { // Existing product
                savedProduct = await inventoryService.updateProduct(product.id, product);
            } else {
                const tempId = product.id;
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                const { id, ...newProductData } = product;

                // First save product to get permanent ID
                const newlyCreatedProduct = await inventoryService.addProduct(newProductData);

                // Now migrate images from temp ID to permanent ID
                const migratedImages = await imageService.migrateImages(tempId, newlyCreatedProduct.id);

                // Update the newly created product with correct image references
                savedProduct = await inventoryService.updateProduct(newlyCreatedProduct.id, { images: migratedImages });
            }
            onSave(savedProduct);
        } catch (error) {
            console.error("Failed to save product", error);
            // In a real app, show an error toast
        } finally {
            setIsSaving(false);
        }
    }

    const renderField = (field: ProductField) => {
        const keyStr = field.key as string;
        // Hide cost price and restricted price tiers based on visiblePrices array
        if (keyStr === 'costPrice' && !visiblePrices.includes('cost_price')) return null;
        if (['price2', 'price3', 'price4'].includes(keyStr) && !visiblePrices.includes(keyStr as any)) return null;
        
        // Hide stock/quantity fields if showStock is false
        if (['quantity', 'minStock'].includes(keyStr) && !showStock) return null;

        const commonInputClasses = "w-full bg-slate-100 dark:bg-zinc-950/50 border border-slate-300 dark:border-zinc-800 rounded-lg px-1.5 py-1 sm:px-3 sm:py-2 text-[10px] sm:text-xs text-slate-800 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all placeholder-gray-400 dark:placeholder-gray-500";

        // Manually translate field labels for core fields
        const fieldLabel = field.isCore ? t(`inventory.col.${field.key}`) : field.label;
        // Fallback if translation key is returned (meaning missing)
        const displayLabel = fieldLabel.includes('inventory.col.') ? field.label : fieldLabel;

        if (field.type === 'warranty') {
            return (
                <div key="warranty-field" className="col-span-1 md:col-span-2 mb-1.5">
                    <label className="block text-[9px] sm:text-[10px] font-semibold text-slate-500 dark:text-gray-400 uppercase tracking-wider mb-1 ml-1">{displayLabel}</label>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 bg-slate-100 dark:bg-zinc-950/30 p-2 rounded-xl border border-slate-300 dark:border-zinc-800">
                        <label className="flex items-center gap-2 text-[11px] sm:text-xs text-slate-700 dark:text-gray-300 font-medium cursor-pointer">
                            <input
                                type="checkbox"
                                name="warranty.enabled"
                                checked={product.warranty.enabled}
                                onChange={handleChange}
                                className="h-3.5 w-3.5 rounded border-slate-300 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-blue-500 focus:ring-blue-500/50 focus:ring-offset-0"
                            />
                            Enabled
                        </label>
                        {product.warranty.enabled && (
                            <div className="flex items-center gap-2 text-[11px] sm:text-xs text-slate-500 dark:text-gray-400 w-full sm:w-auto mt-1 sm:mt-0">
                                <input
                                    type="number"
                                    name="warranty.days"
                                    value={product.warranty.days}
                                    onChange={handleChange}
                                    className={`${commonInputClasses} w-full sm:w-20 py-1`}
                                    placeholder="e.g., 365"
                                />
                                <span>days</span>
                            </div>
                        )}
                    </div>
                </div>
            )
        }

        const fieldKey = field.isCore ? field.key as keyof Product : `customFields.${field.key}`;
        const fieldValue = field.isCore ? product[field.key as keyof Product] : product.customFields?.[field.key];

        // AI Buttons injection
        let headerAction = null;
        if (field.key === 'name') {
            headerAction = (
                <button
                    onClick={handleAiAutoFill}
                    disabled={!!aiLoading}
                    className="text-[9px] font-bold text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 flex items-center gap-1 disabled:opacity-50 transition-colors bg-purple-100 dark:bg-purple-500/10 px-1.5 py-0.5 rounded-md uppercase tracking-wider"
                >
                    {aiLoading === 'autofill' ? (
                        <>
                            <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                            Analyzing
                        </>
                    ) : (
                        <>✨ Auto-Fill</>
                    )}
                </button>
            );
        }
        if (field.key === 'description') {
            headerAction = (
                <button
                    onClick={handleAiDescription}
                    disabled={!!aiLoading}
                    className="text-[9px] font-bold text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 flex items-center gap-1 disabled:opacity-50 transition-colors bg-purple-100 dark:bg-purple-500/10 px-1.5 py-0.5 rounded-md uppercase tracking-wider"
                >
                    {aiLoading === 'description' ? (
                        <>
                            <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                            Writing
                        </>
                    ) : (
                        <>✨ AI Write</>
                    )}
                </button>
            );
        }

        return (
            <div key={field.key} className={`${field.type === 'longtext' ? 'col-span-1 md:col-span-2' : 'col-span-1'} mb-1.5`}>
                <div className="flex justify-between items-center mb-0.5">
                    <label htmlFor={field.key} className="block text-[9px] sm:text-[10px] font-semibold text-slate-500 dark:text-gray-400 uppercase tracking-wider ml-1">{displayLabel}</label>
                    {headerAction}
                </div>
                {field.type === 'longtext' ? (
                    <textarea
                        id={field.key}
                        name={fieldKey}
                        value={(fieldValue as string) || ''}
                        onChange={handleChange}
                        rows={2}
                        disabled={isReadOnly}
                        className={`${commonInputClasses} resize-none disabled:opacity-50 disabled:cursor-not-allowed`}
                        placeholder={field.placeholder || "Enter details..."}
                    />
                ) : field.type === 'boolean' ? (
                    <label className="flex items-center gap-2 mt-1 text-[11px] sm:text-xs text-slate-700 dark:text-gray-300 font-medium cursor-pointer bg-slate-100 dark:bg-zinc-950/30 p-2 rounded-xl border border-slate-300 dark:border-zinc-800">
                        <input
                            id={field.key}
                            name={fieldKey}
                            type="checkbox"
                            checked={!!fieldValue}
                            onChange={handleChange}
                            disabled={isReadOnly}
                            className="h-3.5 w-3.5 rounded border-slate-300 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-blue-500 focus:ring-blue-500/50 focus:ring-offset-0 disabled:opacity-50"
                        />
                        <span>Enabled</span>
                    </label>
                ) : (
                    <input
                        id={field.key}
                        name={fieldKey}
                        type={field.type === 'number' ? 'number' : 'text'}
                        value={(fieldValue as any) || ''}
                        onChange={handleChange}
                        disabled={isReadOnly}
                        className={`${commonInputClasses} disabled:opacity-50 disabled:cursor-not-allowed`}
                        placeholder={field.placeholder}
                    />
                )}
            </div>
        )
    };

    if (isReadOnly) {
        return (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/80 dark:bg-zinc-950/80 backdrop-blur-sm p-2 sm:p-4">
            <div className="bg-white dark:bg-zinc-950 w-[60vw] sm:w-[60vw] max-w-4xl rounded-2xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[60vh] border border-slate-200 dark:border-zinc-800 animate-fade-in-up">
                <div className="flex justify-between items-center px-4 py-3 sm:px-5 sm:py-3 border-b border-slate-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md">
                    <h2 className="text-base font-bold text-slate-800 dark:text-white tracking-tight truncate pr-4">{product.name || 'Product Details'}</h2>
                    <button onClick={onClose} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-500 dark:text-gray-400 hover:text-slate-700 dark:hover:text-gray-200 shrink-0 bg-slate-50 dark:bg-zinc-950/50">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                <div className="overflow-y-auto p-4 sm:p-5 custom-scrollbar flex-grow bg-slate-50/50 dark:bg-zinc-950/20">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
                        {/* Images */}
                        <div className="space-y-3">
                            <div className="aspect-square rounded-xl overflow-hidden bg-slate-100 dark:bg-zinc-950/50 border border-slate-200 dark:border-zinc-800 relative group shadow-inner">
                                {product.images && product.images.length > 0 ? (
                                    <img src={product.images[currentImageIndex]?.url} alt={product.name} className="w-full h-full object-contain p-4" />
                                ) : (
                                    <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 dark:text-slate-600">
                                        <svg className="w-16 h-16 mb-4 opacity-50 dark:opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                        <span className="text-sm font-semibold uppercase tracking-wider opacity-60 dark:opacity-40">No Image Available</span>
                                    </div>
                                )}
                            </div>
                            {product.images && product.images.length > 1 && (
                                <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                                    {product.images.map((img, idx) => (
                                        <button
                                            key={img.id}
                                            onClick={() => setCurrentImageIndex(idx)}
                                            className={`w-16 h-16 rounded-xl border-2 overflow-hidden flex-shrink-0 transition-all duration-300 ${currentImageIndex === idx ? 'border-blue-500 scale-105 shadow-md shadow-blue-500/20' : 'border-slate-200 dark:border-zinc-800 opacity-60 dark:opacity-40 hover:opacity-100'}`}
                                        >
                                            <img src={img.url} className="w-full h-full object-cover" />
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Details */}
                        <div className="space-y-4">
                            <div>
                                <h3 className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-white mb-1.5 tracking-tight leading-tight">{product.name}</h3>
                                <div className="flex flex-wrap items-center gap-1.5 text-[10px] sm:text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-gray-400 mb-3">
                                    <span className="bg-slate-100 dark:bg-zinc-900 text-slate-600 dark:text-gray-300 px-2 py-0.5 rounded border border-slate-200 dark:border-zinc-800">{product.category || 'Uncategorized'}</span>
                                    <span className="w-1 h-1 bg-slate-300 dark:bg-gray-600 rounded-full"></span>
                                    <span className="text-blue-500 dark:text-blue-400">SKU: {product.sku || 'N/A'}</span>
                                    {product.brand && (
                                        <>
                                            <span className="w-1 h-1 bg-slate-300 dark:bg-gray-600 rounded-full"></span>
                                            <span className="text-slate-500 dark:text-gray-400">{product.brand}</span>
                                        </>
                                    )}
                                </div>
                                <div className="text-2xl sm:text-3xl font-bold text-blue-600 dark:text-blue-500 tracking-tight">
                                    <span className="text-lg sm:text-xl mr-1 opacity-50">{settings.currencySymbol}</span>
                                    {(product.price1 || 0).toLocaleString()}
                                </div>

                                <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-2">
                                    {showStock && (
                                        <div className="bg-slate-50 dark:bg-zinc-950/50 p-2.5 rounded-lg border border-slate-200 dark:border-zinc-800 flex flex-col justify-center">
                                            <span className="block text-[10px] text-slate-500 uppercase font-semibold tracking-wider mb-0.5">{t('inventory.col.quantity')}</span>
                                            <span className={`text-xs sm:text-sm font-bold ${(product.quantity || 0) > (product.minStock || 0) ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                                {product.quantity || 0} in stock
                                            </span>
                                        </div>
                                    )}
                                    {visiblePrices.includes('price2') && (
                                        <div className="bg-slate-50 dark:bg-zinc-950/50 p-2.5 rounded-lg border border-slate-200 dark:border-zinc-800 flex flex-col justify-center">
                                            <span className="block text-[10px] text-slate-500 uppercase font-semibold tracking-wider mb-0.5">{t('inventory.col.price2')}</span>
                                            <span className="text-xs sm:text-sm font-bold text-slate-700 dark:text-gray-200">{settings.currencySymbol}{(product.price2 || 0).toLocaleString()}</span>
                                        </div>
                                    )}
                                    {visiblePrices.includes('price3') && (
                                        <div className="bg-slate-50 dark:bg-zinc-950/50 p-2.5 rounded-lg border border-slate-200 dark:border-zinc-800 flex flex-col justify-center">
                                            <span className="block text-[10px] text-slate-500 uppercase font-semibold tracking-wider mb-0.5">{t('inventory.col.price3')}</span>
                                            <span className="text-xs sm:text-sm font-bold text-slate-700 dark:text-gray-200">{settings.currencySymbol}{(product.price3 || 0).toLocaleString()}</span>
                                        </div>
                                    )}
                                    {visiblePrices.includes('price4') && (
                                        <div className="bg-slate-50 dark:bg-zinc-950/50 p-2.5 rounded-lg border border-slate-200 dark:border-zinc-800 flex flex-col justify-center">
                                            <span className="block text-[10px] text-slate-500 uppercase font-semibold tracking-wider mb-0.5">{t('inventory.col.price4')}</span>
                                            <span className="text-xs sm:text-sm font-bold text-slate-700 dark:text-gray-200">{settings.currencySymbol}{(product.price4 || 0).toLocaleString()}</span>
                                        </div>
                                    )}
                                    {visiblePrices.includes('cost_price') && (
                                        <div className="bg-slate-50 dark:bg-zinc-950/50 p-2.5 rounded-lg border border-slate-200 dark:border-zinc-800 flex flex-col justify-center">
                                            <span className="block text-[10px] text-slate-500 uppercase font-semibold tracking-wider mb-0.5">{t('inventory.col.costPrice')}</span>
                                            <span className="text-xs sm:text-sm font-bold text-slate-700 dark:text-gray-200">{settings.currencySymbol}{(product.costPrice || 0).toLocaleString()}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="pt-3 sm:pt-4 border-t border-slate-200 dark:border-zinc-800">
                                <h4 className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Description</h4>
                                <p className="text-slate-600 dark:text-gray-300 leading-relaxed whitespace-pre-wrap text-xs sm:text-sm">
                                    {product.description || 'No description available.'}
                                </p>
                            </div>

                            {/* Specifications (Custom Fields) */}
                            {product.customFields && Object.keys(product.customFields).length > 0 && (
                                <div className="pt-3 sm:pt-4 border-t border-slate-200 dark:border-zinc-800">
                                    <h4 className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Specifications</h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        {Object.entries(product.customFields).map(([key, value]) => (
                                            <div key={key} className="bg-slate-50 dark:bg-zinc-950/50 p-2.5 rounded-lg border border-slate-200 dark:border-zinc-800 group hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
                                                <span className="block text-[10px] text-slate-500 uppercase font-semibold tracking-wider mb-0.5 group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors">{key}</span>
                                                <span className="text-slate-700 dark:text-gray-200 font-medium text-xs sm:text-sm">{String(value)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                
                <div className="p-3 sm:p-4 border-t border-slate-200 dark:border-zinc-800 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-md">
                    <button 
                        onClick={onClose} 
                        className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-900 dark:hover:bg-slate-700 text-slate-700 dark:text-white rounded-xl font-bold text-sm transition-all active:scale-95 border border-slate-200 dark:border-zinc-800 shadow-sm"
                    >
                        Close Details
                    </button>
                </div>
            </div>
        </div>
    );
}

return (
    <div className="fixed inset-0 bg-gray-900/80 dark:bg-zinc-950/80 backdrop-blur-sm z-[100] flex items-center justify-center p-0 md:p-4">
        <div className="bg-white dark:bg-[#1a2235] w-full h-[100dvh] md:w-[60vw] md:h-auto md:max-h-[85vh] max-w-4xl flex flex-col rounded-none md:rounded-2xl border-0 md:border border-slate-200 dark:border-zinc-800/50 overflow-hidden shadow-2xl animate-fade-in-up md:mt-0">
            <header className="px-4 py-3 sm:px-5 sm:py-3 border-b border-slate-200 dark:border-zinc-800/50 flex justify-between items-center flex-shrink-0 bg-white/90 dark:bg-[#1a2235]/90 backdrop-blur-md">
                <h2 className="text-sm sm:text-base font-bold text-slate-800 dark:text-white tracking-tight">
                    {productToEdit ? t('inventory.edit_product') : t('inventory.add_product')}
                </h2>
                <button onClick={onClose} className="p-1.5 rounded-full bg-slate-100 dark:bg-zinc-900/50 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors">
                    <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
            </header>
            
            <main className="flex-grow overflow-y-auto p-2 sm:p-5 grid grid-cols-1 lg:grid-cols-3 gap-2 sm:gap-6 custom-scrollbar bg-slate-50/50 dark:bg-zinc-950/20">
                <div className="lg:col-span-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-3 gap-y-1.5">
                        {settings.productFields.filter(f => !f.isVirtual).map(renderField)}
                    </div>
                </div>
                
                <div className="lg:col-span-1 space-y-5">
                    <div className="space-y-2.5">
                        <h3 className="text-[10px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">{t('inventory.images')}</h3>

                        {product.images && product.images.length > 0 && (
                            <div className="relative aspect-square rounded-xl overflow-hidden bg-slate-100 dark:bg-zinc-900/30 border border-slate-200 dark:border-zinc-800/50 shadow-inner group">
                                <img src={product.images[currentImageIndex].url} alt={`Product image ${currentImageIndex + 1}`} className="w-full h-full object-contain p-4" />
                                {product.images.length > 1 && (
                                    <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-between px-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => setCurrentImageIndex(i => (i - 1 + product.images.length) % product.images.length)} className="bg-black/50 text-white p-2 rounded-full backdrop-blur-sm hover:bg-blue-600 transition-colors">
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
                                        </button>
                                        <button onClick={() => setCurrentImageIndex(i => (i + 1) % product.images.length)} className="bg-black/50 text-white p-2 rounded-full backdrop-blur-sm hover:bg-blue-600 transition-colors">
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {!isReadOnly && (
                            <ProductImagesUploader
                                productId={product.id}
                                initialImages={product.images || []}
                                onChange={handleImageChange}
                            />
                        )}
                    </div>

                    {/* ZR Express Integration Section */}
                    <div className="pt-5 border-t border-slate-200 dark:border-zinc-800/50">
                        <h3 className="text-[10px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2.5 ml-1">Integrations</h3>

                        <div className="bg-slate-50 dark:bg-zinc-900/30 border border-slate-200 dark:border-zinc-800/50 rounded-xl p-3 sm:p-4 shadow-sm">
                            <div className="flex items-center gap-2.5 mb-3">
                                <div className="w-7 h-7 rounded-lg bg-purple-100 dark:bg-purple-500/10 flex items-center justify-center text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-500/20">
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                </div>
                                <div>
                                    <h4 className="font-bold text-slate-800 dark:text-slate-200 text-xs sm:text-sm tracking-tight">ZR Express</h4>
                                    <p className="text-[10px] sm:text-xs text-slate-500">Shipping Service</p>
                                </div>
                            </div>

                            {product.zrExpressProductId ? (
                                <div className="space-y-3">
                                    <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 text-xs font-bold uppercase tracking-wider bg-emerald-100 dark:bg-emerald-400/10 px-2.5 py-1 rounded-md border border-emerald-200 dark:border-emerald-400/20 w-fit">
                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                                        Synced
                                    </div>
                                    <div className="p-3 bg-white dark:bg-zinc-950 rounded-lg border border-slate-200 dark:border-zinc-800/50">
                                        <p className="text-xs text-slate-500 font-mono break-all">{product.zrExpressProductId}</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">Sync this product to enable automatic delivery orders.</p>

                                    {!showZrSync ? (
                                        <button
                                            onClick={async () => {
                                                setShowZrSync(true);
                                                setIsSyncing(true);
                                                const cats = await fetchZRCategories();
                                                setZrCategories(cats);
                                                setIsSyncing(false);
                                            }}
                                            className="w-full py-2.5 bg-purple-600 hover:bg-purple-500 text-white text-sm font-bold rounded-xl transition-all active:scale-95 shadow-sm shadow-purple-900/20"
                                        >
                                            Sync to ZR Express
                                        </button>
                                    ) : (
                                        <div className="space-y-3 animate-fade-in-down">
                                            {isSyncing ? (
                                                <div className="flex flex-col items-center justify-center py-4 gap-2">
                                                    <svg className="animate-spin h-5 w-5 text-purple-500" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Loading Categories</span>
                                                </div>
                                            ) : (
                                                <>
                                                    <div className="space-y-1.5">
                                                        <label className="text-xs uppercase font-bold text-slate-500 tracking-wider ml-1">Category</label>
                                                        <select
                                                            className="w-full text-sm bg-white dark:bg-zinc-950 border border-slate-300 dark:border-zinc-800 rounded-xl p-2.5 text-slate-800 dark:text-gray-200 focus:ring-1 focus:ring-purple-500 outline-none transition-all"
                                                            value={selectedCategory}
                                                            onChange={(e) => {
                                                                setSelectedCategory(e.target.value);
                                                                setSelectedSubCategory('');
                                                            }}
                                                        >
                                                            <option value="">Select Category</option>
                                                            {zrCategories.map((c: any) => (
                                                                <option key={c.id} value={c.id}>{c.name}</option>
                                                            ))}
                                                        </select>
                                                    </div>

                                                    {selectedCategory && (
                                                        <div className="space-y-1.5">
                                                            <label className="text-xs uppercase font-bold text-slate-500 tracking-wider ml-1">Sub-Category</label>
                                                            <select
                                                                className="w-full text-sm bg-white dark:bg-zinc-950 border border-slate-300 dark:border-zinc-800 rounded-xl p-2.5 text-slate-800 dark:text-gray-200 focus:ring-1 focus:ring-purple-500 outline-none transition-all"
                                                                value={selectedSubCategory}
                                                                onChange={(e) => setSelectedSubCategory(e.target.value)}
                                                            >
                                                                <option value="">Select Sub-Category</option>
                                                                {zrCategories.find((c: any) => c.id === selectedCategory)?.subCategories?.map((sc: any) => (
                                                                    <option key={sc.id} value={sc.id}>{sc.name}</option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                    )}

                                                    <div className="flex gap-2 pt-2">
                                                        <button
                                                            onClick={() => setShowZrSync(false)}
                                                            className="flex-1 py-2.5 bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-gray-300 text-sm font-bold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                                                        >
                                                            Cancel
                                                        </button>
                                                        <button
                                                            onClick={async () => {
                                                                if (!selectedCategory || !selectedSubCategory) return;
                                                                setIsSyncing(true);
                                                                const mappedProduct = {
                                                                    ...product,
                                                                    zrCategoryId: selectedCategory,
                                                                    zrSubCategoryId: selectedSubCategory
                                                                };
                                                                const zrId = await createZRExpressProduct(mappedProduct);
                                                                if (zrId) {
                                                                    setProduct(p => ({
                                                                        ...p,
                                                                        zrExpressProductId: zrId,
                                                                        zrCategoryId: selectedCategory,
                                                                        zrSubCategoryId: selectedSubCategory
                                                                    }));
                                                                    alert("Synced Successfully! Click Save to persist.");
                                                                    setShowZrSync(false);
                                                                } else {
                                                                    alert("Sync Failed. Check console.");
                                                                }
                                                                setIsSyncing(false);
                                                            }}
                                                            disabled={!selectedCategory || !selectedSubCategory}
                                                            className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-200 disabled:dark:bg-zinc-900 disabled:text-gray-400 disabled:dark:text-slate-600 text-white text-sm font-bold rounded-xl transition-all shadow-sm shadow-emerald-900/20"
                                                        >
                                                            {isSyncing ? '...' : 'Confirm'}
                                                        </button>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>
            
            <footer className="px-3 py-2.5 sm:px-5 sm:py-3 border-t border-slate-200 dark:border-zinc-800 flex justify-end gap-2.5 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-md flex-shrink-0">
                <button 
                    onClick={onClose} 
                    className="px-4 py-2 bg-slate-100 dark:bg-zinc-900 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-gray-200 rounded-lg font-bold text-xs sm:text-sm transition-colors border border-slate-200 dark:border-zinc-800"
                >
                    {isReadOnly ? t('common.close') : t('common.cancel')}
                </button>
                {!isReadOnly && (
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg disabled:opacity-50 font-bold text-xs sm:text-sm transition-all shadow-sm shadow-blue-900/20 active:scale-95"
                    >
                        {isSaving ? 'Saving...' : t('common.save')}
                    </button>
                )}
            </footer>
        </div >
        <style>{`
            .custom-scrollbar::-webkit-scrollbar {
              width: 4px;
            }
            .custom-scrollbar::-webkit-scrollbar-track {
              background: transparent;
            }
            .custom-scrollbar::-webkit-scrollbar-thumb {
              background: #cbd5e1; /* slate-300 */
              border-radius: 10px;
            }
            .custom-scrollbar::-webkit-scrollbar-thumb:hover {
              background: #94a3b8; /* slate-400 */
            }
            .dark .custom-scrollbar::-webkit-scrollbar-thumb {
              background: #334155; /* slate-700 */
            }
            .dark .custom-scrollbar::-webkit-scrollbar-thumb:hover {
              background: #475569; /* slate-600 */
            }
            @keyframes fade-in-up {
              from { opacity: 0; transform: translateY(10px); }
              to { opacity: 1; transform: translateY(0); }
            }
            .animate-fade-in-up {
              animation: fade-in-up 0.2s ease-out forwards;
            }
          `}</style>
    </div >
);
};

export default ProductModal;
