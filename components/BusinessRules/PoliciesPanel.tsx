
import React, { useState, useContext } from 'react';
import { SettingsContext } from '../../contexts/SettingsContext';
import * as businessRulesService from '../../services/businessRulesService';
import { PolicyConfig } from '../../constants/businessRuleTypes';

const PoliciesPanel: React.FC = () => {
    const { t, settings } = useContext(SettingsContext);
    const [config, setConfig] = useState<PolicyConfig>(businessRulesService.getBusinessRules().policy);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        setConfig(prev => ({
            ...prev,
            [name]: type === 'number' ? Number(value) : value
        }));
    };

    const handleSave = () => {
        businessRulesService.updatePolicyConfig(config);
        alert(t('settings.saved_success'));
    };

    return (
        <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-slate-200 dark:border-zinc-800 h-full flex flex-col max-w-3xl">
            <div className="mb-6">
                <h3 className="text-xl font-bold text-slate-800 dark:text-white">Store Policies</h3>
                <p className="text-sm text-slate-500">Define default rules for returns, warranties, and receipts.</p>
            </div>

            <div className="space-y-6 flex-1 overflow-y-auto pr-2">
                
                {/* Financial Limits */}
                <div className="p-4 border border-slate-200 dark:border-zinc-800 rounded-lg">
                    <h4 className="text-sm font-bold text-slate-600 dark:text-gray-300 uppercase mb-3">Financial Limits</h4>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">
                                Default Customer Credit Limit ({settings.currencySymbol})
                            </label>
                            <input 
                                type="number" 
                                name="maxDebtLimit" 
                                value={config.maxDebtLimit} 
                                onChange={handleChange}
                                className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            />
                            <p className="text-xs text-slate-500 mt-1">Maximum allowed debt for new customers before supervisor approval is needed.</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">
                                Default PC Assembly Fee ({settings.currencySymbol})
                            </label>
                            <input 
                                type="number" 
                                name="defaultAssemblyFee" 
                                value={config.defaultAssemblyFee || 0} 
                                onChange={handleChange}
                                className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            />
                            <p className="text-xs text-slate-500 mt-1">Auto-applied fee when building a PC in the configurator.</p>
                        </div>
                    </div>
                </div>

                {/* Returns & Warranty */}
                <div className="p-4 border border-slate-200 dark:border-zinc-800 rounded-lg">
                    <h4 className="text-sm font-bold text-slate-600 dark:text-gray-300 uppercase mb-3">Returns & Warranty</h4>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">
                                Default Warranty (Days)
                            </label>
                            <input 
                                type="number" 
                                name="defaultWarrantyDays" 
                                value={config.defaultWarrantyDays} 
                                onChange={handleChange}
                                className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">
                                Return Window (Days)
                            </label>
                            <input 
                                type="number" 
                                name="returnWindowDays" 
                                value={config.returnWindowDays} 
                                onChange={handleChange}
                                className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">
                            RMA / Return Policy Text
                        </label>
                        <textarea 
                            name="rmaPolicy" 
                            value={config.rmaPolicy} 
                            onChange={handleChange}
                            className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white h-20"
                        />
                    </div>
                </div>

                {/* Docs */}
                <div className="p-4 border border-slate-200 dark:border-zinc-800 rounded-lg">
                    <h4 className="text-sm font-bold text-slate-600 dark:text-gray-300 uppercase mb-3">Documents & Receipts</h4>
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">
                            Receipt Footer Message
                        </label>
                        <input 
                            type="text"
                            name="receiptFooterText" 
                            value={config.receiptFooterText} 
                            onChange={handleChange}
                            className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">
                            Invoice Terms & Conditions
                        </label>
                        <textarea 
                            name="invoiceTerms" 
                            value={config.invoiceTerms} 
                            onChange={handleChange}
                            className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white h-20"
                        />
                    </div>
                </div>
            </div>

            <div className="mt-6 flex justify-end">
                <button 
                    onClick={handleSave} 
                    className="px-6 py-2 bg-[var(--color-primary)] text-white font-bold rounded-lg shadow hover:opacity-90"
                >
                    {t('common.save')} Policies
                </button>
            </div>
        </div>
    );
};

export default PoliciesPanel;
