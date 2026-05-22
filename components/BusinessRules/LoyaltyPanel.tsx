
import React, { useState, useContext, useEffect } from 'react';
import { SettingsContext } from '../../contexts/SettingsContext';
import * as businessRulesService from '../../services/businessRulesService';
import { LoyaltyConfig } from '../../constants/businessRuleTypes';

const LoyaltyPanel: React.FC = () => {
    const { settings, t } = useContext(SettingsContext);
    const [config, setConfig] = useState<LoyaltyConfig>(businessRulesService.getBusinessRules().loyalty);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type, checked } = e.target;
        setConfig(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : Number(value)
        }));
    };

    const handleSave = () => {
        businessRulesService.updateLoyaltyConfig(config);
        alert(t('settings.saved_success'));
    };

    return (
        <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-slate-200 dark:border-zinc-800 h-full flex flex-col">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h3 className="text-xl font-bold text-slate-800 dark:text-white">Loyalty & Rewards</h3>
                    <p className="text-sm text-slate-500">Configure customer points and redemption rules.</p>
                </div>
                <label className="flex items-center cursor-pointer">
                    <div className="relative">
                        <input type="checkbox" name="enabled" checked={config.enabled} onChange={handleChange} className="sr-only" />
                        <div className={`block w-14 h-8 rounded-full transition-colors ${config.enabled ? 'bg-green-500' : 'bg-slate-300 dark:bg-gray-600'}`}></div>
                        <div className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${config.enabled ? 'transform translate-x-6' : ''}`}></div>
                    </div>
                    <span className="ml-3 font-medium text-slate-700 dark:text-gray-300">{config.enabled ? 'Active' : 'Disabled'}</span>
                </label>
            </div>

            <div className={`space-y-6 flex-1 ${!config.enabled ? 'opacity-50 pointer-events-none' : ''}`}>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Earning Rules */}
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/10 rounded-lg border border-blue-100 dark:border-blue-800">
                        <h4 className="text-sm font-bold text-blue-800 dark:text-blue-300 uppercase mb-4">Earning Rules</h4>

                        <div className="mb-4">
                            <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">
                                Points per {settings.currencySymbol}1.00 spent
                            </label>
                            <input
                                type="number"
                                name="pointsPerCurrency"
                                value={config.pointsPerCurrency}
                                onChange={handleChange}
                                className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                min="0.1" step="0.1"
                            />
                            <p className="text-xs text-slate-500 mt-1">Example: Spend $100 &rarr; Earn {100 * config.pointsPerCurrency} points.</p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">
                                Signup Bonus Points
                            </label>
                            <input
                                type="number"
                                name="signupBonus"
                                value={config.signupBonus}
                                onChange={handleChange}
                                className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                min="0"
                            />
                        </div>
                    </div>

                    {/* Redemption Rules */}
                    <div className="p-4 bg-green-50 dark:bg-green-900/10 rounded-lg border border-green-100 dark:border-green-800">
                        <h4 className="text-sm font-bold text-green-800 dark:text-green-300 uppercase mb-4">Redemption Rules</h4>

                        <div className="mb-4">
                            <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">
                                Cash Value per Point ({settings.currencySymbol})
                            </label>
                            <input
                                type="number"
                                name="redemptionRate"
                                value={config.redemptionRate}
                                onChange={handleChange}
                                className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                min="0.001" step="0.001"
                            />
                            <p className="text-xs text-slate-500 mt-1">100 Points = {settings.currencySymbol}{(100 * config.redemptionRate).toFixed(2)}</p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">
                                Min Points to Redeem
                            </label>
                            <input
                                type="number"
                                name="minRedemptionPoints"
                                value={config.minRedemptionPoints}
                                onChange={handleChange}
                                className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                min="0"
                            />
                        </div>
                    </div>
                </div>
            </div>

            <div className="mt-6 flex justify-end">
                <button
                    onClick={handleSave}
                    className="px-6 py-2 bg-[var(--color-primary)] text-white font-bold rounded-lg shadow hover:opacity-90"
                >
                    {t('common.save')} Rules
                </button>
            </div>
        </div>
    );
};

export default LoyaltyPanel;
