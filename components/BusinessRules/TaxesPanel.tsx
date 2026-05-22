
import React, { useState, useContext } from 'react';
import { SettingsContext } from '../../contexts/SettingsContext';
import * as businessRulesService from '../../services/businessRulesService';
import { TaxConfig } from '../../constants/businessRuleTypes';

const TaxesPanel: React.FC = () => {
    const { t } = useContext(SettingsContext);
    const [config, setConfig] = useState<TaxConfig>(businessRulesService.getBusinessRules().tax);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type, checked } = e.target;
        setConfig(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : (type === 'number' ? Number(value) : value)
        }));
    };

    const handleSave = () => {
        businessRulesService.updateTaxConfig(config);
        alert(t('settings.saved_success'));
    };

    return (
        <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-slate-200 dark:border-zinc-800 h-full flex flex-col max-w-2xl">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h3 className="text-xl font-bold text-slate-800 dark:text-white">Tax Configuration</h3>
                    <p className="text-sm text-slate-500">Manage tax rates and calculation rules.</p>
                </div>
                <label className="flex items-center cursor-pointer">
                    <div className="relative">
                        <input type="checkbox" name="enabled" checked={config.enabled} onChange={handleChange} className="sr-only" />
                        <div className={`block w-14 h-8 rounded-full transition-colors ${config.enabled ? 'bg-green-500' : 'bg-slate-300 dark:bg-gray-600'}`}></div>
                        <div className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${config.enabled ? 'transform translate-x-6' : ''}`}></div>
                    </div>
                    <span className="ml-3 font-medium text-slate-700 dark:text-gray-300">{config.enabled ? 'Enabled' : 'Disabled'}</span>
                </label>
            </div>

            <div className={`space-y-6 ${!config.enabled ? 'opacity-50 pointer-events-none' : ''}`}>
                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">
                        Tax Name
                    </label>
                    <input 
                        type="text" 
                        name="taxName" 
                        value={config.taxName} 
                        onChange={handleChange}
                        className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        placeholder="VAT, Sales Tax, GST..."
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">
                        Tax Registration Number
                    </label>
                    <input 
                        type="text" 
                        name="taxNumber" 
                        value={config.taxNumber} 
                        onChange={handleChange}
                        className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        placeholder="Optional"
                    />
                </div>

                <div className="grid grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">
                            Default Tax Rate (%)
                        </label>
                        <input 
                            type="number" 
                            name="defaultTaxRate" 
                            value={config.defaultTaxRate} 
                            onChange={handleChange}
                            className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            min="0" step="0.01"
                        />
                    </div>
                    
                    <div className="flex items-center">
                        <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer w-full hover:bg-slate-50 dark:hover:bg-gray-700 dark:border-gray-600">
                            <input 
                                type="checkbox" 
                                name="isTaxIncluded" 
                                checked={config.isTaxIncluded} 
                                onChange={handleChange}
                                className="h-5 w-5 text-[var(--color-primary)]"
                            />
                            <div>
                                <span className="block text-sm font-bold text-slate-800 dark:text-white">Prices Include Tax</span>
                                <span className="block text-xs text-slate-500">Tax is calculated backward from total</span>
                            </div>
                        </label>
                    </div>
                </div>

                <div className="p-4 bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800 rounded-lg text-sm text-yellow-800 dark:text-yellow-200">
                    <strong>Preview:</strong> For a product priced at 100 with {config.defaultTaxRate}% tax:
                    <ul className="list-disc list-inside mt-1 ml-2">
                        {config.isTaxIncluded ? (
                            <li>Total Price: 100.00 (Base: {(100 / (1 + config.defaultTaxRate/100)).toFixed(2)} + Tax: {(100 - (100 / (1 + config.defaultTaxRate/100))).toFixed(2)})</li>
                        ) : (
                            <li>Total Price: {(100 * (1 + config.defaultTaxRate/100)).toFixed(2)} (Base: 100.00 + Tax: {(100 * config.defaultTaxRate/100).toFixed(2)})</li>
                        )}
                    </ul>
                </div>
            </div>

            <div className="mt-8">
                <button 
                    onClick={handleSave} 
                    className="px-6 py-2 bg-[var(--color-primary)] text-white font-bold rounded-lg shadow hover:opacity-90"
                >
                    {t('common.save')} Configuration
                </button>
            </div>
        </div>
    );
};

export default TaxesPanel;
