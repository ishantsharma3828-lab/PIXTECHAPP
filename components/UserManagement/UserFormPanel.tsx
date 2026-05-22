
import React, { useState, useContext } from 'react';
import { AppUser, UserRole } from '../../constants/userTypes';
import * as userManagementService from '../../services/userManagementService';
import { SettingsContext } from '../../contexts/SettingsContext';
import { usePermissions } from '../../hooks/usePermissions';

interface UserFormPanelProps {
    onSave: () => void;
}

const UserFormPanel: React.FC<UserFormPanelProps> = ({ onSave }) => {
    const { t } = useContext(SettingsContext);
    const [formData, setFormData] = useState<Partial<AppUser>>({
        fullName: '',
        username: '',
        role: 'cashier',
        branch: 'Main Store',
        email: '',
        phone: '',
        status: 'active',
        requirePasswordChange: true,
        twoFactorEnabled: false
    });
    
    const { canManageUsers } = usePermissions();

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        const checked = (e.target as HTMLInputElement).checked;

        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!canManageUsers) return alert("You do not have permission to manage users.");
        if (!formData.username || !formData.fullName) return alert("Required fields missing.");
        if (password !== confirmPassword) return alert("Passwords do not match.");

        try {
            await userManagementService.createUser({ ...formData, password });
            alert("User created successfully!");
            onSave(); // Refresh list

            // Reset
            setFormData({
                fullName: '',
                username: '',
                role: 'cashier',
                branch: 'Main Store',
                email: '',
                phone: '',
                status: 'active',
                requirePasswordChange: true,
                twoFactorEnabled: false
            });
            setPassword('');
            setConfirmPassword('');

        } catch (error: any) {
            alert("Error creating user: " + error.message);
        }
    };

    return (
        <div className="flex flex-col h-full bg-white dark:bg-gray-800 border-r border-slate-200 dark:border-zinc-800 shadow-xl z-20 w-full max-w-sm">
            <div className="p-5 border-b border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-gray-900">
                <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                    <svg className="w-6 h-6 text-[var(--color-primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>
                    {t('users.add_new')}
                </h2>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">

                {/* Identity */}
                <div className="space-y-3">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t('users.full_name')}</label>
                        <input name="fullName" value={formData.fullName} onChange={handleChange} className="form-input w-full" placeholder="John Doe" required />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t('users.username')}</label>
                        <input name="username" value={formData.username} onChange={handleChange} className="form-input w-full" placeholder="jdoe" required />
                    </div>
                </div>

                {/* Password */}
                <div className="p-3 bg-slate-50 dark:bg-gray-700/30 rounded-lg border border-slate-200 dark:border-gray-600 space-y-3">
                    <label className="block text-xs font-bold text-slate-500 uppercase">{t('users.credentials')}</label>
                    <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="form-input w-full" placeholder={t('users.password')} />
                    <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="form-input w-full" placeholder={t('users.confirm_password')} />
                </div>

                {/* Role & Access */}
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t('users.role')}</label>
                        <select name="role" value={formData.role} onChange={handleChange} className="form-select w-full">
                            <option value="admin">{t('users.role.admin')}</option>
                            <option value="manager">{t('users.role.manager')}</option>
                            <option value="cashier">{t('users.role.cashier')}</option>
                            <option value="technician">{t('users.role.technician')}</option>
                            <option value="inventory_manager">{t('users.role.inventory_manager')}</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t('users.branch')}</label>
                        <input name="branch" value={formData.branch} onChange={handleChange} className="form-input w-full" />
                    </div>
                </div>

                {/* Contact */}
                <div className="space-y-3">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t('users.email')}</label>
                        <input type="email" name="email" value={formData.email} onChange={handleChange} className="form-input w-full" placeholder="john@company.com" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t('users.phone')}</label>
                        <input name="phone" value={formData.phone} onChange={handleChange} className="form-input w-full" placeholder="555-0123" />
                    </div>
                </div>

                {/* Security Toggles */}
                <div className="space-y-2 pt-2">
                    <label className="flex items-center gap-3 p-2 border rounded cursor-pointer hover:bg-slate-50 dark:hover:bg-gray-700">
                        <input type="checkbox" name="requirePasswordChange" checked={formData.requirePasswordChange} onChange={handleChange} className="h-4 w-4 rounded text-[var(--color-primary)]" />
                        <span className="text-sm text-slate-700 dark:text-gray-300">{t('users.force_pw_change')}</span>
                    </label>
                    <label className="flex items-center gap-3 p-2 border rounded cursor-pointer hover:bg-slate-50 dark:hover:bg-gray-700">
                        <input type="checkbox" name="twoFactorEnabled" checked={formData.twoFactorEnabled} onChange={handleChange} className="h-4 w-4 rounded text-[var(--color-primary)]" />
                        <span className="text-sm text-slate-700 dark:text-gray-300">{t('users.require_2fa')}</span>
                    </label>
                </div>

                <div className="pt-2">
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t('users.status')}</label>
                    <select name="status" value={formData.status} onChange={handleChange} className="form-select w-full">
                        <option value="active">{t('expenses.status_active')}</option>
                        <option value="suspended">{t('users.status')} Suspended</option>
                        <option value="terminated">{t('users.status')} Terminated</option>
                    </select>
                </div>

                <button type="submit" disabled={!canManageUsers} className={`w-full py-3 text-white font-bold rounded-lg shadow-lg flex items-center justify-center gap-2 mt-4 ${canManageUsers ? 'bg-[var(--color-primary)] hover:brightness-110' : 'bg-gray-400 cursor-not-allowed'}`}>
                    {t('users.create_btn')}
                </button>
            </form>

            <style>{`
                .form-input, .form-select {
                    background-color: #f9fafb;
                    border: 1px solid #d1d5db;
                    border-radius: 0.375rem;
                    padding: 0.6rem;
                    font-size: 0.875rem;
                }
                .dark .form-input, .dark .form-select {
                    background-color: #374151;
                    border-color: #4b5563;
                    color: white;
                }
            `}</style>
        </div>
    );
};

export default UserFormPanel;
