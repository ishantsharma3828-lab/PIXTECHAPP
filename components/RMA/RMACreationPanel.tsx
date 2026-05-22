
import React, { useState, useEffect, useContext } from 'react';
import { RMA, RMAType, RMAReason, RMACondition } from '../../constants/rmaTypes';
import * as rmaService from '../../services/rmaService';
import { SettingsContext } from '../../contexts/SettingsContext';
import { usePermissions } from '../../hooks/usePermissions';

interface RMACreationPanelProps {
    onCreate: (newRmaId?: string) => void;
}

const RMACreationPanel: React.FC<RMACreationPanelProps> = ({ onCreate }) => {
    const { t } = useContext(SettingsContext);
    const { canViewSupplierWarranty } = usePermissions();
    const [rmaType, setRmaType] = useState<RMAType>('customer_return');
    const [docId, setDocId] = useState('');
    const [foundDoc, setFoundDoc] = useState<any>(null);

    const [formData, setFormData] = useState({
        productId: '',
        productName: '',
        serialNumber: '',
        quantity: 1,
        reason: 'defective' as RMAReason,
        condition: 'opened' as RMACondition,
        policyStatus: 'in_policy' as 'in_policy' | 'out_of_policy',
        customerNotes: ''
    });

    const handleSearchDoc = async () => {
        const doc = await rmaService.findSourceDocument(docId, rmaType);
        if (doc) {
            setFoundDoc(doc);
            // Reset product selection
            setFormData(prev => ({ ...prev, productId: '', productName: '' }));
        } else {
            alert("Document not found. Please check the ID.");
            setFoundDoc(null);
        }
    };

    const handleProductSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const pid = e.target.value;
        const item = foundDoc?.items.find((i: any) => (i.id || i.productId) === pid);
        if (item) {
            setFormData(prev => ({
                ...prev,
                productId: pid,
                productName: item.name
            }));
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!foundDoc) return alert("Please link a valid document.");
        if (!formData.productId) return alert("Please select a product.");

        const newRMA = rmaService.createRMA({
            type: rmaType,
            linkedDocumentId: rmaType === 'customer_return' ? foundDoc.id : foundDoc.poNumber,
            contactId: rmaType === 'customer_return' ? foundDoc.customerId : foundDoc.supplierId,
            contactName: rmaType === 'customer_return' ? (foundDoc.customerName || 'Walk-in') : foundDoc.supplierName,
            ...formData
        });

        alert("RMA Created Successfully.");
        onCreate(newRMA.id);

        // Reset
        setDocId('');
        setFoundDoc(null);
        setFormData({
            productId: '',
            productName: '',
            serialNumber: '',
            quantity: 1,
            reason: 'defective',
            condition: 'opened',
            policyStatus: 'in_policy',
            customerNotes: ''
        });
    };

    return (
        <div className="flex flex-col h-full bg-white dark:bg-zinc-900 border-r border-slate-200 dark:border-zinc-800 shadow-xl z-20 w-full md:max-w-sm">
            <div className="p-5 border-b border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-gray-900">
                <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                    <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                    {t('rma.create_title')}
                </h2>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-5">
                {/* Type Selector */}
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">{t('rma.type')}</label>
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={() => { setRmaType('customer_return'); setFoundDoc(null); setDocId(''); }}
                            className={`flex-1 py-2 text-xs font-bold rounded border transition-colors ${rmaType === 'customer_return' ? 'bg-blue-100 border-blue-200 text-blue-800' : 'bg-slate-50 border-slate-200 text-slate-600'}`}
                        >
                            {t('rma.type.customer')}
                        </button>
                        {canViewSupplierWarranty && (
                            <button
                                type="button"
                                onClick={() => { setRmaType('supplier_warranty'); setFoundDoc(null); setDocId(''); }}
                                className={`flex-1 py-2 text-xs font-bold rounded border transition-colors ${rmaType === 'supplier_warranty' ? 'bg-orange-100 border-orange-200 text-orange-800' : 'bg-slate-50 border-slate-200 text-slate-600'}`}
                            >
                                {t('rma.type.supplier')}
                            </button>
                        )}
                    </div>
                </div>

                {/* Document Link */}
                <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-500 uppercase">
                        {rmaType === 'customer_return' ? t('rma.linked_invoice') : t('rma.linked_po')}
                    </label>
                    <div className="flex gap-2">
                        <input
                            value={docId}
                            onChange={(e) => setDocId(e.target.value)}
                            className="form-input flex-1"
                            placeholder={rmaType === 'customer_return' ? 'INV-...' : 'PO-...'}
                        />
                        <button onClick={handleSearchDoc} className="px-3 bg-slate-200 dark:bg-gray-700 rounded hover:bg-slate-300 dark:hover:bg-gray-600">🔍</button>
                    </div>
                    {foundDoc && (
                        <div className="text-xs p-2 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded border border-green-200 dark:border-green-800">
                            {t('common.view')}: {rmaType === 'customer_return' ? (foundDoc.customerName || 'Walk-in') : foundDoc.supplierName}
                            <br />
                            {t('expenses.date')}: {new Date(foundDoc.date || foundDoc.dateCreated).toLocaleDateString()}
                        </div>
                    )}
                </div>

                {foundDoc && (
                    <div className="space-y-4 animate-fade-in">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t('rma.product')}</label>
                            <select
                                value={formData.productId}
                                onChange={handleProductSelect}
                                className="form-select w-full"
                            >
                                <option value="">Select Item...</option>
                                {foundDoc.items.map((item: any) => (
                                    <option key={item.id || item.productId} value={item.id || item.productId}>
                                        {item.name} (Qty: {item.quantity || item.receivedQty})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t('rma.serial')}</label>
                            <input
                                value={formData.serialNumber}
                                onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
                                className="form-input w-full font-mono text-sm"
                                placeholder="Scan or type..."
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t('rma.reason')}</label>
                                <select
                                    value={formData.reason}
                                    onChange={(e) => setFormData({ ...formData, reason: e.target.value as any })}
                                    className="form-select w-full"
                                >
                                    <option value="defective">{t('rma.reason.defective')}</option>
                                    <option value="doa">{t('rma.reason.doa')}</option>
                                    <option value="wrong_item">{t('rma.reason.wrong_item')}</option>
                                    <option value="buyers_remorse">{t('rma.reason.buyers_remorse')}</option>
                                    <option value="warranty_claim">{t('rma.reason.warranty_claim')}</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t('rma.condition')}</label>
                                <select
                                    value={formData.condition}
                                    onChange={(e) => setFormData({ ...formData, condition: e.target.value as any })}
                                    className="form-select w-full"
                                >
                                    <option value="opened">{t('rma.condition.opened')}</option>
                                    <option value="new">{t('rma.condition.new')}</option>
                                    <option value="damaged">{t('rma.condition.damaged')}</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">{t('rma.policy')}</label>
                            <div className="flex gap-4">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        checked={formData.policyStatus === 'in_policy'}
                                        onChange={() => setFormData({ ...formData, policyStatus: 'in_policy' })}
                                        className="text-green-600 focus:ring-green-500"
                                    />
                                    <span className="text-sm">{t('rma.policy.in')} ✅</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        checked={formData.policyStatus === 'out_of_policy'}
                                        onChange={() => setFormData({ ...formData, policyStatus: 'out_of_policy' })}
                                        className="text-red-600 focus:ring-red-500"
                                    />
                                    <span className="text-sm">{t('rma.policy.out')} ❌</span>
                                </label>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t('rma.notes')}</label>
                            <textarea
                                value={formData.customerNotes}
                                onChange={(e) => setFormData({ ...formData, customerNotes: e.target.value })}
                                className="form-input w-full h-20 resize-none"
                                placeholder="..."
                            />
                        </div>

                        <button
                            onClick={handleSubmit}
                            className="w-full py-3 bg-[var(--color-primary)] text-white font-bold rounded-lg shadow-lg hover:brightness-110 flex items-center justify-center gap-2"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            {t('rma.submit')}
                        </button>
                    </div>
                )}
            </div>

            <style>{`
                .form-input, .form-select {
                    background-color: #f9fafb;
                    border: 1px solid #d1d5db;
                    border-radius: 0.375rem;
                    padding: 0.5rem;
                    font-size: 0.875rem;
                }
                .dark .form-input, .dark .form-select {
                    background-color: #374151;
                    border-color: #4b5563;
                    color: white;
                }
                @keyframes fade-in {
                    from { opacity: 0; transform: translateY(5px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in {
                    animation: fade-in 0.3s ease-out forwards;
                }
            `}</style>
        </div>
    );
};

export default RMACreationPanel;
