
import React, { useState, useContext } from 'react';
import { SettingsContext } from '../contexts/SettingsContext';
import LoyaltyPanel from '../components/BusinessRules/LoyaltyPanel';
import CouponsPanel from '../components/BusinessRules/CouponsPanel';
import TaxesPanel from '../components/BusinessRules/TaxesPanel';
import PoliciesPanel from '../components/BusinessRules/PoliciesPanel';

type Tab = 'loyalty' | 'coupons' | 'taxes' | 'policies';

const BusinessRules: React.FC = () => {
    const { t } = useContext(SettingsContext);
    const [activeTab, setActiveTab] = useState<Tab>('loyalty');

    const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
        { 
            id: 'loyalty', 
            label: 'Loyalty Points', 
            icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" /></svg> 
        },
        { 
            id: 'coupons', 
            label: 'Coupons', 
            icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" /></svg> 
        },
        { 
            id: 'taxes', 
            label: 'Taxes & Fees', 
            icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg> 
        },
        { 
            id: 'policies', 
            label: 'Store Policies', 
            icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg> 
        }
    ];

    return (
        <div className="flex h-full -m-4 sm:-m-6 md:-m-8">
            {/* Sidebar Tabs */}
            <div className="w-64 bg-white dark:bg-gray-800 border-r border-slate-200 dark:border-gray-700 flex flex-col">
                <div className="p-6 border-b border-slate-200 dark:border-gray-700">
                    <h2 className="text-xl font-bold text-slate-800 dark:text-white">Business Rules</h2>
                    <p className="text-sm text-slate-500 dark:text-gray-400 mt-1">Configure automated logic</p>
                </div>
                <nav className="flex-1 p-4 space-y-2">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-sm font-medium ${
                                activeTab === tab.id
                                ? 'bg-[var(--color-primary)] text-white shadow-md'
                                : 'text-slate-600 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-gray-700'
                            }`}
                        >
                            {tab.icon}
                            {tab.label}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 p-8 overflow-y-auto bg-slate-50 dark:bg-gray-900/50">
                {activeTab === 'loyalty' && <LoyaltyPanel />}
                {activeTab === 'coupons' && <CouponsPanel />}
                {activeTab === 'taxes' && <TaxesPanel />}
                {activeTab === 'policies' && <PoliciesPanel />}
            </div>
        </div>
    );
};

export default BusinessRules;
