
import React, { useState, useEffect, useContext } from 'react';
import { AppUser, UserActivity, UserPerformance } from '../../constants/userTypes';
import * as userService from '../../services/userService';
import { SettingsContext } from '../../contexts/SettingsContext';
import { usePermissions } from '../../hooks/usePermissions';

interface UserProfilePanelProps {
    user: AppUser | null;
    onClose: () => void;
    onUpdateUser: (updates: Partial<AppUser>) => void;
}

const UserProfilePanel: React.FC<UserProfilePanelProps> = ({ user, onClose, onUpdateUser }) => {
    const { t } = useContext(SettingsContext);
    const { canManageUsers } = usePermissions();
    const [activeTab, setActiveTab] = useState<'access' | 'timeline' | 'performance'>('access');
    const [activity, setActivity] = useState<UserActivity[]>([]);
    const [stats, setStats] = useState<UserPerformance | null>(null);

    useEffect(() => {
        if (user) {
            userService.getUserActivity(user.id).then(setActivity).catch(console.error);
            userService.getUserPerformance(user.id).then(setStats).catch(console.error);
        }
    }, [user]);

    if (!user) {
        return (
            <div className="w-[450px] bg-white dark:bg-gray-800 border-l border-slate-200 dark:border-zinc-800 flex items-center justify-center text-gray-400">
                <p>Select a user to manage</p>
            </div>
        );
    }

    const handlePermissionChange = (key: string, value: any) => {
        const updatedPermissions = { ...user.permissions, [key]: value };
        const updatedUser = { ...user, permissions: updatedPermissions };
        userService.saveUser(updatedUser);
        onUpdateUser(updatedUser);
    };

    const handleResetPassword = () => {
        if (confirm(`${t('users.reset_pw')} for ${user.username}?`)) {
            userService.resetUserPassword(user.id);
            alert("Password reset email sent (simulated).");
        }
    };

    const handleDeleteUser = () => {
        if (confirm(`Are you sure you want to delete ${user.fullName}? This action cannot be undone.`)) {
            userService.deleteUser(user.id);
            onClose();
            // We need to trigger a list refresh. The parent handles this via state.
            // But we need to make sure UserManagementPanel re-renders.
            window.dispatchEvent(new CustomEvent('users-updated'));
        }
    };

    const handleFieldUpdate = (field: keyof AppUser, value: string) => {
        onUpdateUser({ [field]: value });
    };

    return (
        <div className="w-[500px] bg-white dark:bg-gray-800 border-l border-slate-200 dark:border-zinc-800 flex flex-col h-full shadow-xl z-20">
            {/* Header */}
            <div className="p-6 border-b border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-gray-900 relative">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-slate-600">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>

                <div className="flex items-center gap-4 mb-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-2xl font-bold text-white shadow-lg">
                        {user.fullName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-slate-800 dark:text-white">{user.fullName}</h2>
                        <p className="text-sm text-slate-500">
                            @{user.username} • <span className="capitalize">
                                {user.roles && user.roles.length > 0 
                                    ? user.roles.map(r => {
                                        const tr = t(`users.role.${r}`);
                                        return (tr && tr !== `users.role.${r}`) ? tr : r.replace('Users.Role.', '').replace('_', ' ');
                                      }).join(' & ') 
                                    : t(`users.role.${user.role}`)}
                            </span>
                        </p>
                        <div className="mt-1 flex gap-2">
                            {user.twoFactorEnabled && <span className="text-[10px] bg-green-100 text-green-800 px-2 rounded-full border border-green-200">2FA ON</span>}
                            {user.requirePasswordChange && <span className="text-[10px] bg-yellow-100 text-yellow-800 px-2 rounded-full border border-yellow-200">PW CHANGE REQ</span>}
                        </div>
                    </div>
                </div>

                <div className="flex gap-2">
                    {canManageUsers && (
                        <>
                            <button onClick={handleResetPassword} className="flex-1 py-2 bg-white border border-slate-300 rounded text-xs font-bold hover:bg-slate-50 text-slate-700">
                                {t('users.reset_pw')}
                            </button>
                            <button onClick={handleDeleteUser} className="flex-1 py-2 bg-red-50 border border-red-200 text-red-700 rounded text-xs font-bold hover:bg-red-100">
                                Delete User
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-200 dark:border-zinc-800">
                {['access', 'timeline', 'performance'].map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab as any)}
                        className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === tab
                            ? 'border-[var(--color-primary)] text-[var(--color-primary)] bg-slate-50 dark:bg-gray-800'
                            : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50 dark:hover:bg-gray-700'
                            }`}
                    >
                        {t(`users.tab.${tab}`)}
                    </button>
                ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">

                {/* ACCESS TAB */}
                {activeTab === 'access' && (
                    <div className="space-y-6">
                        <div className="space-y-4">
                            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t('users.permissions')}</h3>
                            <PermissionToggle
                                label={t('users.perm.void_sales')}
                                checked={user.permissions.canVoidSales}
                                onChange={(v) => handlePermissionChange('canVoidSales', v)}
                                disabled={!canManageUsers}
                            />
                            <PermissionToggle
                                label={t('users.perm.refund')}
                                checked={user.permissions.canRefund}
                                onChange={(v) => handlePermissionChange('canRefund', v)}
                                disabled={!canManageUsers}
                            />
                            <PermissionToggle
                                label={t('users.perm.edit_stock')}
                                checked={user.permissions.canEditStock}
                                onChange={(v) => handlePermissionChange('canEditStock', v)}
                                disabled={!canManageUsers}
                            />
                            <PermissionToggle
                                label={t('users.perm.reports')}
                                checked={user.permissions.accessReports}
                                onChange={(v) => handlePermissionChange('accessReports', v)}
                                disabled={!canManageUsers}
                            />
                            <PermissionToggle
                                label={t('users.perm.settings')}
                                checked={user.permissions.accessSettings}
                                onChange={(v) => handlePermissionChange('accessSettings', v)}
                                disabled={!canManageUsers}
                            />
                        </div>

                        <div className="pt-4 border-t border-slate-200 dark:border-zinc-800">
                            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">{t('users.limits')}</h3>
                            <div>
                                <div className="flex justify-between mb-2">
                                    <label className="text-sm font-medium text-slate-700 dark:text-gray-300">{t('users.max_discount')}</label>
                                    <span className="font-bold text-[var(--color-primary)]">{user.permissions.maxDiscountPercent}%</span>
                                </div>
                                <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    step="5"
                                    value={user.permissions.maxDiscountPercent}
                                    onChange={(e) => handlePermissionChange('maxDiscountPercent', Number(e.target.value))}
                                    className={`w-full h-2 bg-slate-200 rounded-lg appearance-none ${canManageUsers ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}`}
                                    disabled={!canManageUsers}
                                />
                            </div>
                        </div>

                        <div className="pt-4 border-t border-slate-200 dark:border-zinc-800 space-y-4">
                            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t('users.edit_details')}</h3>
                            <div>
                                <label className="block text-xs font-bold text-gray-400 mb-1">FULL NAME</label>
                                <input
                                    type="text"
                                    value={user.fullName}
                                    onChange={(e) => handleFieldUpdate('fullName', e.target.value)}
                                    className="w-full p-2 text-sm border rounded bg-slate-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                    disabled={!canManageUsers}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-400 mb-1">USERNAME</label>
                                <input
                                    type="text"
                                    value={user.username}
                                    onChange={(e) => handleFieldUpdate('username', e.target.value)}
                                    className="w-full p-2 text-sm border rounded bg-slate-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                    disabled={!canManageUsers}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-400 mb-1">NEW PASSWORD</label>
                                <input
                                    type="password"
                                    placeholder={canManageUsers ? "Enter to change..." : "Hidden"}
                                    value={user.password || ''}
                                    onChange={(e) => handleFieldUpdate('password', e.target.value)}
                                    className="w-full p-2 text-sm border rounded bg-slate-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                    disabled={!canManageUsers}
                                />
                            </div>
                        </div>

                        <div className="pt-4 border-t border-slate-200 dark:border-zinc-800 space-y-4">
                            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t('users.preferences')}</h3>
                            <div>
                                <label className="block text-xs font-bold text-gray-400 mb-1">{t('settings.language')}</label>
                                <select
                                    value={user.preferences?.language || 'en'}
                                    onChange={(e) => {
                                        const newPrefs = { ...user.preferences, language: e.target.value };
                                        onUpdateUser({ preferences: newPrefs });
                                    }}
                                    className="w-full p-2 text-sm border rounded bg-slate-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                    disabled={!canManageUsers}
                                >
                                    <option value="en">English</option>
                                    <option value="fr">Français</option>
                                    <option value="ar">العربية</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-400 mb-2">{t('users.notifications')}</label>
                                <div className="space-y-2">
                                    <label className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            checked={user.preferences?.notifications?.orderStatus ?? true}
                                            onChange={(e) => {
                                                const current = user.preferences?.notifications || { orderStatus: true, ticketStatus: true };
                                                const newPrefs = { ...user.preferences, notifications: { ...current, orderStatus: e.target.checked } };
                                                onUpdateUser({ preferences: newPrefs });
                                            }}
                                            className="rounded border-slate-300 text-[var(--color-primary)]"
                                            disabled={!canManageUsers}
                                        />
                                        <span className={`text-sm text-slate-700 dark:text-gray-300 ${!canManageUsers && 'opacity-50'}`}>Order Updates</span>
                                    </label>
                                    <label className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            checked={user.preferences?.notifications?.ticketStatus ?? true}
                                            onChange={(e) => {
                                                const current = user.preferences?.notifications || { orderStatus: true, ticketStatus: true };
                                                const newPrefs = { ...user.preferences, notifications: { ...current, ticketStatus: e.target.checked } };
                                                onUpdateUser({ preferences: newPrefs });
                                            }}
                                            className="rounded border-slate-300 text-[var(--color-primary)]"
                                            disabled={!canManageUsers}
                                        />
                                        <span className={`text-sm text-slate-700 dark:text-gray-300 ${!canManageUsers && 'opacity-50'}`}>Ticket Updates</span>
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* TIMELINE TAB */}
                {activeTab === 'timeline' && (
                    <div className="relative border-l-2 border-slate-200 dark:border-zinc-800 ml-3 space-y-6">
                        {activity.map((log) => (
                            <div key={log.id} className="ml-6 relative">
                                <div className={`absolute -left-[31px] w-4 h-4 rounded-full border-2 border-white dark:border-zinc-800 ${log.type === 'danger' ? 'bg-red-500' :
                                    log.type === 'warning' ? 'bg-orange-500' :
                                        log.type === 'success' ? 'bg-green-500' : 'bg-blue-500'
                                    }`}></div>
                                <p className="text-xs text-slate-500">{new Date(log.timestamp).toLocaleString()}</p>
                                <p className="font-bold text-sm text-slate-800 dark:text-white">{log.action}</p>
                                <p className="text-sm text-slate-600 dark:text-gray-400 bg-slate-50 dark:bg-gray-900 p-2 rounded mt-1 border border-gray-100 dark:border-zinc-800">
                                    {log.details}
                                </p>
                            </div>
                        ))}
                    </div>
                )}

                {/* PERFORMANCE TAB */}
                {activeTab === 'performance' && stats && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <StatCard label={t('users.stats.sales_vol')} value={`$${stats.salesVolume.toLocaleString()}`} />
                            <StatCard label={t('users.stats.avg_basket')} value={`$${stats.avgBasketSize}`} />
                            <StatCard
                                label={t('users.stats.error_rate')}
                                value={`${stats.errorRate}%`}
                                color={stats.errorRate > 2 ? 'text-red-500' : 'text-green-500'}
                            />
                            <StatCard
                                label={t('users.stats.refund_ratio')}
                                value={`${stats.refundRatio}%`}
                                color={stats.refundRatio > 2 ? 'text-orange-500' : 'text-green-500'}
                            />
                        </div>

                        {stats.cashDiscrepancies !== 0 && (
                            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                                <h4 className="text-red-800 dark:text-red-400 font-bold mb-1">{t('users.stats.cash_alert')}</h4>
                                <p className="text-sm text-red-600 dark:text-red-300">
                                    Last shift discrepancy: <span className="font-mono font-bold">{stats.cashDiscrepancies > 0 ? '+' : ''}{stats.cashDiscrepancies.toFixed(2)}</span>
                                </p>
                            </div>
                        )}

                        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-sm text-blue-800 dark:text-blue-300">
                            <p className="font-bold mb-1">🤖 {t('users.stats.ai_analysis')}</p>
                            <p>This user performs 15% faster than the branch average but has a slightly higher void rate. Consider retraining on cart modification procedures.</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

const PermissionToggle: React.FC<{ label: string, checked: boolean, onChange: (v: boolean) => void, disabled?: boolean }> = ({ label, checked, onChange, disabled }) => (
    <label className={`flex items-center justify-between p-2 rounded transition-colors ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-slate-50 dark:hover:bg-gray-700'}`}>
        <span className="text-sm font-medium text-slate-700 dark:text-gray-300">{label}</span>
        <div className={`relative w-10 h-6 transition-colors duration-200 ease-in-out rounded-full ${checked ? 'bg-green-500' : 'bg-slate-300'}`}>
            <input type="checkbox" className="hidden" checked={checked} onChange={(e) => onChange(e.target.checked)} disabled={disabled} />
            <div className={`absolute left-1 top-1 w-4 h-4 bg-white rounded-full shadow transform transition-transform duration-200 ease-in-out ${checked ? 'translate-x-4' : 'translate-x-0'}`}></div>
        </div>
    </label>
);

const StatCard: React.FC<{ label: string, value: string, color?: string }> = ({ label, value, color }) => (
    <div className="bg-slate-50 dark:bg-gray-700/30 p-4 rounded-lg border border-slate-200 dark:border-zinc-800">
        <p className="text-xs text-slate-500 uppercase font-bold mb-1">{label}</p>
        <p className={`text-xl font-extrabold ${color || 'text-slate-800 dark:text-white'}`}>{value}</p>
    </div>
);

export default UserProfilePanel;
