
import React, { useState, useContext } from 'react';
import { AppUser } from '../../constants/userTypes';
import { SettingsContext } from '../../contexts/SettingsContext';
import { usePermissions } from '../../hooks/usePermissions';

interface UserListPanelProps {
    users: AppUser[];
    selectedId: string | null;
    onSelect: (user: AppUser) => void;
    onDelete?: (userId: string) => void;
}

const UserListPanel: React.FC<UserListPanelProps> = ({ users, selectedId, onSelect, onDelete }) => {
    const { t } = useContext(SettingsContext);
    const { canManageUsers } = usePermissions();
    const [search, setSearch] = useState('');
    const [filterRole, setFilterRole] = useState('all');

    const filteredUsers = users.filter(u => {
        const matchesSearch = u.fullName.toLowerCase().includes(search.toLowerCase()) || u.username.toLowerCase().includes(search.toLowerCase());
        const matchesRole = filterRole === 'all' || u.role === filterRole;
        return matchesSearch && matchesRole;
    });

    const getStatusColor = (status: string) => {
        if (status === 'active') return 'bg-green-500';
        if (status === 'suspended') return 'bg-orange-500';
        return 'bg-red-500';
    };

    const getRiskBadge = (score: number) => {
        if (score < 20) return <span className="text-green-600 bg-green-100 px-2 py-0.5 rounded text-[10px] font-bold">LOW ({score})</span>;
        if (score < 50) return <span className="text-orange-600 bg-orange-100 px-2 py-0.5 rounded text-[10px] font-bold">MED ({score})</span>;
        return <span className="text-red-600 bg-red-100 px-2 py-0.5 rounded text-[10px] font-bold animate-pulse">HIGH ({score})</span>;
    };

    return (
        <div className="flex-1 bg-slate-100 dark:bg-gray-900 flex flex-col min-w-[400px]">
            {/* Header */}
            <div className="p-4 bg-white dark:bg-gray-800 border-b border-slate-200 dark:border-zinc-800 shadow-sm sticky top-0 z-10 space-y-3">
                <div className="flex justify-between items-center">
                    <h3 className="font-bold text-slate-800 dark:text-white text-lg">{t('users.directory')}</h3>
                    <select
                        value={filterRole}
                        onChange={(e) => setFilterRole(e.target.value)}
                        className="text-sm border rounded bg-slate-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white px-2 py-1"
                    >
                        <option value="all">{t('common.all')}</option>
                        <option value="admin">{t('users.role.admin')}</option>
                        <option value="manager">{t('users.role.manager')}</option>
                        <option value="cashier">{t('users.role.cashier')}</option>
                        <option value="technician">{t('users.role.technician')}</option>
                    </select>
                </div>
                <div className="relative">
                    <input
                        type="text"
                        placeholder={t('header.search_placeholder')}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-gray-700 border border-slate-200 dark:border-gray-600 rounded-md text-sm focus:ring-2 focus:ring-[var(--color-primary)] outline-none"
                    />
                    <svg className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                </div>
            </div>

            {/* Table */}
            <div className="flex-1 overflow-auto">
                <table className="min-w-full text-sm">
                    <thead className="bg-slate-50 dark:bg-gray-700 sticky top-0">
                        <tr className="text-left text-xs font-semibold text-slate-500 uppercase">
                            <th className="px-4 py-3">{t('users.col.user')}</th>
                            <th className="px-4 py-3">{t('users.col.role_branch')}</th>
                            <th className="px-4 py-3">{t('users.col.last_login')}</th>
                            <th className="px-4 py-3">{t('users.col.risk_score')}</th>
                            <th className="px-4 py-3">{t('users.col.status')}</th>
                            <th className="px-4 py-3 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800">
                        {filteredUsers.map(user => (
                            <tr
                                key={user.id}
                                onClick={() => onSelect(user)}
                                className={`cursor-pointer hover:bg-slate-50 dark:hover:bg-gray-700 transition-colors ${selectedId === user.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
                            >
                                <td className="px-4 py-3">
                                    <div className="font-bold text-slate-900 dark:text-white">{user.fullName}</div>
                                    <div className="text-xs text-slate-500">@{user.username}</div>
                                </td>
                                <td className="px-4 py-3">
                                    <div className="capitalize text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded inline-block mb-1">
                                        {user.roles && user.roles.length > 0 
                                            ? user.roles.map(r => {
                                                const tr = t(`users.role.${r}`);
                                                return (tr && tr !== `users.role.${r}`) ? tr : r.replace('Users.Role.', '').replace('_', ' ');
                                              }).join(' & ') 
                                            : t(`users.role.${user.role}`)}
                                    </div>
                                    <div className="text-xs text-slate-500">{user.branch}</div>
                                </td>
                                <td className="px-4 py-3 text-slate-600 dark:text-gray-300">
                                    {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}
                                </td>
                                <td className="px-4 py-3">
                                    {getRiskBadge(user.riskScore)}
                                </td>
                                <td className="px-4 py-3">
                                    <div className="flex items-center gap-2">
                                        <span className={`w-2 h-2 rounded-full ${getStatusColor(user.status)}`}></span>
                                        <span className="capitalize">{user.status}</span>
                                    </div>
                                </td>
                                <td className="px-4 py-3 text-right">
                                    {onDelete && canManageUsers && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (confirm('Are you sure you want to delete this user?')) onDelete(user.id);
                                            }}
                                            className="text-red-500 hover:text-red-700 p-1 hover:bg-red-50 rounded"
                                            title="Delete User"
                                        >
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default UserListPanel;
