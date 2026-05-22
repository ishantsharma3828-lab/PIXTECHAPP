
import React, { useState, useContext, useEffect } from 'react';
import { SettingsContext } from '../../contexts/SettingsContext';
import * as businessRulesService from '../../services/businessRulesService';
import { Coupon } from '../../constants/businessRuleTypes';

const CouponsPanel: React.FC = () => {
    const { t, settings } = useContext(SettingsContext);
    const [coupons, setCoupons] = useState<Coupon[]>([]);
    const [isEditing, setIsEditing] = useState(false);
    const [editData, setEditData] = useState<Partial<Coupon>>({});

    useEffect(() => {
        loadCoupons();
    }, []);

    const loadCoupons = () => {
        setCoupons(businessRulesService.getCoupons());
    };

    const handleEdit = (coupon?: Coupon) => {
        if (coupon) {
            setEditData(coupon);
        } else {
            setEditData({
                code: '',
                type: 'fixed',
                value: 0,
                description: '',
                isActive: true,
                minOrder: 0
            });
        }
        setIsEditing(true);
    };

    const handleDelete = (id: string) => {
        if (confirm("Delete this coupon?")) {
            businessRulesService.deleteCoupon(id);
            loadCoupons();
        }
    };

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editData.code || editData.value === undefined) return;

        if (editData.id) {
            businessRulesService.saveCoupon(editData as Coupon);
        } else {
            businessRulesService.createCoupon(editData);
        }
        setIsEditing(false);
        loadCoupons();
    };

    const toggleStatus = (coupon: Coupon) => {
        businessRulesService.saveCoupon({ ...coupon, isActive: !coupon.isActive });
        loadCoupons();
    };

    return (
        <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-slate-200 dark:border-zinc-800 h-full flex flex-col">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h3 className="text-xl font-bold text-slate-800 dark:text-white">Coupons & Promos</h3>
                    <p className="text-sm text-slate-500">Manage discount codes for sales.</p>
                </div>
                <button 
                    onClick={() => handleEdit()} 
                    className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg font-bold flex items-center gap-2"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                    New Coupon
                </button>
            </div>

            <div className="flex-1 overflow-y-auto">
                <table className="w-full text-sm text-left">
                    <thead className="text-xs text-slate-500 uppercase bg-slate-50 dark:bg-gray-700">
                        <tr>
                            <th className="px-4 py-3">Code</th>
                            <th className="px-4 py-3">Discount</th>
                            <th className="px-4 py-3">Description</th>
                            <th className="px-4 py-3">Min Order</th>
                            <th className="px-4 py-3 text-center">Status</th>
                            <th className="px-4 py-3 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                        {coupons.map(coupon => (
                            <tr key={coupon.id} className="hover:bg-slate-50 dark:hover:bg-gray-700/50">
                                <td className="px-4 py-3 font-mono font-bold">{coupon.code}</td>
                                <td className="px-4 py-3">
                                    {coupon.type === 'percentage' ? `${coupon.value}%` : `${settings.currencySymbol}${coupon.value}`}
                                </td>
                                <td className="px-4 py-3 text-slate-600 dark:text-gray-300">{coupon.description}</td>
                                <td className="px-4 py-3">{settings.currencySymbol}{coupon.minOrder}</td>
                                <td className="px-4 py-3 text-center">
                                    <button 
                                        onClick={() => toggleStatus(coupon)}
                                        className={`px-2 py-1 rounded text-xs font-bold ${coupon.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-500'}`}
                                    >
                                        {coupon.isActive ? 'Active' : 'Inactive'}
                                    </button>
                                </td>
                                <td className="px-4 py-3 text-right">
                                    <button onClick={() => handleEdit(coupon)} className="text-blue-600 hover:underline mr-3">Edit</button>
                                    <button onClick={() => handleDelete(coupon.id)} className="text-red-500 hover:underline">Delete</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Modal */}
            {isEditing && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md p-6">
                        <h3 className="text-lg font-bold mb-4 dark:text-white">{editData.id ? 'Edit Coupon' : 'New Coupon'}</h3>
                        <form onSubmit={handleSave} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Code</label>
                                <input 
                                    value={editData.code} 
                                    onChange={e => setEditData({...editData, code: e.target.value.toUpperCase()})}
                                    className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white font-mono"
                                    required
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Type</label>
                                    <select 
                                        value={editData.type}
                                        onChange={e => setEditData({...editData, type: e.target.value as any})}
                                        className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                    >
                                        <option value="fixed">Fixed ({settings.currencySymbol})</option>
                                        <option value="percentage">Percent (%)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Value</label>
                                    <input 
                                        type="number"
                                        value={editData.value} 
                                        onChange={e => setEditData({...editData, value: Number(e.target.value)})}
                                        className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                        min="0"
                                        required
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Min Order Amount</label>
                                <input 
                                    type="number"
                                    value={editData.minOrder} 
                                    onChange={e => setEditData({...editData, minOrder: Number(e.target.value)})}
                                    className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                    min="0"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Description</label>
                                <input 
                                    value={editData.description} 
                                    onChange={e => setEditData({...editData, description: e.target.value})}
                                    className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                    placeholder="Summer Sale 2024"
                                />
                            </div>
                            <div className="flex justify-end gap-2 mt-4">
                                <button type="button" onClick={() => setIsEditing(false)} className="px-4 py-2 border rounded hover:bg-slate-100 dark:hover:bg-gray-700 dark:text-white dark:border-gray-600">Cancel</button>
                                <button type="submit" className="px-4 py-2 bg-[var(--color-primary)] text-white rounded font-bold">Save</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CouponsPanel;
