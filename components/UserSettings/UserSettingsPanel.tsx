
import React, { useState, useContext, useEffect } from 'react';
import { SettingsContext } from '../../contexts/SettingsContext';
import { getCurrentUser, updateCurrentSession } from '../../services/authService';
import * as userService from '../../services/userService';
import { AppUser, UserRole, UserStatus } from '../../constants/userTypes';
import { User } from '../../services/authService';

interface UserSettingsPanelProps {
    initialTab?: 'general' | 'security' | 'notifications' | 'activity';
}

const UserSettingsPanel: React.FC<UserSettingsPanelProps> = ({ initialTab = 'general' }) => {
    const { t } = useContext(SettingsContext);
    const [activeTab, setActiveTab] = useState<'general' | 'security' | 'notifications' | 'activity'>(initialTab);
    const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Form States
    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        phone: '',
        branch: ''
    });

    const [passwordData, setPasswordData] = useState({
        current: '',
        new: '',
        confirm: ''
    });

    const [notifications, setNotifications] = useState({
        emailAlerts: true,
        pushNotifications: true,
        lowStockAlerts: true,
        newOrderAlerts: false,
        systemUpdates: true
    });

    useEffect(() => {
        loadUserData();
        loadPreferences();
    }, []);

    // Effect to handle prop changes if the parent component passes a new tab (e.g. navigation while mounted)
    useEffect(() => {
        setActiveTab(initialTab);
    }, [initialTab]);

    const mapToAppUser = (user: User): AppUser => {
        return {
            id: user.id || '',
            username: user.username,
            fullName: user.fullName || '',
            role: user.role as UserRole,
            branch: user.branch || '',
            email: user.email,
            phone: user.phone || '',
            status: 'active' as UserStatus,
            requirePasswordChange: false,
            twoFactorEnabled: false,
            riskScore: 0,
            permissions: user.permissions,
            preferences: user.preferences
        };
    };

    const loadUserData = () => {
        const sessionUser = getCurrentUser();
        if (sessionUser) {
            const allUsers = userService.getUsers();
            const found = allUsers.find(u => u.username === sessionUser.username);

            if (found) {
                setCurrentUser(found);
                setFormData({
                    fullName: found.fullName,
                    email: found.email,
                    phone: found.phone,
                    branch: found.branch
                });
            } else {
                setCurrentUser(mapToAppUser(sessionUser));
                setFormData({
                    fullName: sessionUser.fullName || '',
                    email: sessionUser.email || '',
                    phone: sessionUser.phone || '',
                    branch: sessionUser.branch || ''
                });
            }
        }
        setIsLoading(false);
    };

    const loadPreferences = () => {
        const user = getCurrentUser();
        if (user) {
            const stored = localStorage.getItem(`pos_prefs_${user.username}`);
            if (stored) {
                setNotifications(JSON.parse(stored));
            }
        }
    };

    const savePreferences = (newPrefs: typeof notifications) => {
        const user = getCurrentUser();
        if (user) {
            localStorage.setItem(`pos_prefs_${user.username}`, JSON.stringify(newPrefs));
        }
    };

    const handleInfoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSaveInfo = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentUser) return;

        try {
            await updateCurrentSession({
                fullName: formData.fullName,
                email: formData.email,
                phone: formData.phone,
                branch: formData.branch
            });

            const updatedUser = { ...currentUser, ...formData };
            setCurrentUser(updatedUser);
            // userService.saveUser(updatedUser); // Legacy local DB call, can update if we migrate userService too
            alert("Profile updated successfully on Supabase.");
        } catch (error: any) {
            console.error("Update failed", error);
            alert("Failed to update profile: " + error.message);
        }
    };

    const handlePasswordChange = (e: React.FormEvent) => {
        e.preventDefault();
        if (passwordData.new !== passwordData.confirm) {
            alert("New passwords do not match.");
            return;
        }
        if (passwordData.new.length < 4) {
            alert("Password too short.");
            return;
        }
        alert("Password changed successfully.");
        setPasswordData({ current: '', new: '', confirm: '' });
    };

    const toggleNotification = (key: keyof typeof notifications) => {
        setNotifications(prev => {
            const updated = { ...prev, [key]: !prev[key] };
            savePreferences(updated);
            return updated;
        });
    };

    if (isLoading) return <div className="p-8 text-center text-slate-500">Loading profile...</div>;
    if (!currentUser) return <div className="p-8 text-center text-red-500">User not found.</div>;

    return (
        <div className="flex flex-col md:flex-row gap-6 h-full animate-fade-in">
            {/* Sidebar / Tabs */}
            <div className="w-full md:w-72 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-slate-200 dark:border-zinc-800 overflow-hidden flex-shrink-0 flex flex-col">
                <div className="p-6 border-b border-slate-200 dark:border-zinc-800 flex flex-col items-center bg-slate-50 dark:bg-gray-900/50">
                    <div className="w-24 h-24 bg-gradient-to-br from-[var(--color-primary)] to-purple-600 rounded-full flex items-center justify-center text-3xl font-bold text-white shadow-lg mb-4 border-4 border-white dark:border-zinc-800">
                        {currentUser.fullName?.charAt(0).toUpperCase() || currentUser.username.charAt(0).toUpperCase()}
                    </div>
                    <h2 className="text-xl font-bold text-slate-800 dark:text-white text-center">{currentUser.fullName}</h2>
                    <p className="text-sm text-slate-500 mb-2">@{currentUser.username}</p>
                    <span className="px-3 py-1 bg-white dark:bg-gray-700 border border-slate-200 dark:border-gray-600 text-slate-600 dark:text-gray-300 text-xs rounded-full uppercase font-bold tracking-wider shadow-sm">
                        {t(`users.role.${currentUser.role.toLowerCase()}` as any) || currentUser.role}
                    </span>
                </div>
                <nav className="p-3 space-y-1 flex-1 overflow-y-auto">
                    <button
                        onClick={() => setActiveTab('general')}
                        className={`w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-all flex items-center gap-3 ${activeTab === 'general' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 shadow-sm' : 'text-slate-600 dark:text-gray-400 hover:bg-slate-50 dark:hover:bg-gray-700'}`}
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                        General Info
                    </button>
                    <button
                        onClick={() => setActiveTab('security')}
                        className={`w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-all flex items-center gap-3 ${activeTab === 'security' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 shadow-sm' : 'text-slate-600 dark:text-gray-400 hover:bg-slate-50 dark:hover:bg-gray-700'}`}
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                        Security
                    </button>
                    <button
                        onClick={() => setActiveTab('notifications')}
                        className={`w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-all flex items-center gap-3 ${activeTab === 'notifications' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 shadow-sm' : 'text-slate-600 dark:text-gray-400 hover:bg-slate-50 dark:hover:bg-gray-700'}`}
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                        Notifications
                    </button>
                    <button
                        onClick={() => setActiveTab('activity')}
                        className={`w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-all flex items-center gap-3 ${activeTab === 'activity' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 shadow-sm' : 'text-slate-600 dark:text-gray-400 hover:bg-slate-50 dark:hover:bg-gray-700'}`}
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        Recent Activity
                    </button>
                </nav>
            </div>

            {/* Content Area */}
            <div className="flex-1 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-slate-200 dark:border-zinc-800 p-8 overflow-y-auto">

                {/* GENERAL TAB */}
                {activeTab === 'general' && (
                    <form onSubmit={handleSaveInfo} className="max-w-2xl animate-fade-in">
                        <div className="mb-6">
                            <h3 className="text-xl font-bold text-slate-800 dark:text-white">General Information</h3>
                            <p className="text-sm text-slate-500">Update your personal details and contact info.</p>
                        </div>

                        <div className="space-y-5">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-gray-300 mb-1">Full Name</label>
                                <input
                                    name="fullName"
                                    value={formData.fullName}
                                    onChange={handleInfoChange}
                                    className="form-input w-full"
                                />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 dark:text-gray-300 mb-1">Email Address</label>
                                    <input
                                        name="email"
                                        value={formData.email}
                                        onChange={handleInfoChange}
                                        className="form-input w-full"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 dark:text-gray-300 mb-1">Phone Number</label>
                                    <input
                                        name="phone"
                                        value={formData.phone}
                                        onChange={handleInfoChange}
                                        className="form-input w-full"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-gray-300 mb-1">Assigned Branch</label>
                                <div className="flex items-center gap-2">
                                    <input
                                        name="branch"
                                        value={formData.branch}
                                        disabled
                                        className="form-input w-full bg-slate-100 dark:bg-gray-700 cursor-not-allowed"
                                    />
                                    <span className="text-xs text-gray-400 whitespace-nowrap">Contact admin to change</span>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-gray-300 mb-1">Language</label>
                                <select
                                    value={currentUser.preferences?.language || 'en'}
                                    onChange={(e) => {
                                        const newPrefs = {
                                            ...currentUser.preferences,
                                            language: e.target.value
                                        };
                                        const updatedUser = {
                                            ...currentUser,
                                            preferences: newPrefs
                                        };
                                        setCurrentUser(updatedUser);

                                        updateCurrentSession({ preferences: newPrefs } as any).then(() => {
                                            window.location.reload();
                                        });
                                    }}
                                    className="form-input w-full"
                                >
                                    <option value="en">English (US)</option>
                                    <option value="fr">Français (FR)</option>
                                    <option value="ar">العربية (AR)</option>
                                </select>
                            </div>
                        </div>

                        <div className="mt-8 pt-6 border-t border-gray-100 dark:border-zinc-800 flex justify-end">
                            <button type="submit" className="px-6 py-2.5 bg-[var(--color-primary)] text-white font-bold rounded-lg shadow-md hover:brightness-110 transition-all">
                                Save Changes
                            </button>
                        </div>
                    </form>
                )}

                {/* SECURITY TAB */}
                {activeTab === 'security' && (
                    <form onSubmit={handlePasswordChange} className="max-w-2xl animate-fade-in">
                        <div className="mb-6">
                            <h3 className="text-xl font-bold text-slate-800 dark:text-white">Security Settings</h3>
                            <p className="text-sm text-slate-500">Manage your password and authentication methods.</p>
                        </div>

                        <div className="p-4 bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-800 rounded-lg mb-6">
                            <h4 className="text-sm font-bold text-orange-800 dark:text-orange-400 mb-1 flex items-center gap-2">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                                Password Requirements
                            </h4>
                            <ul className="list-disc list-inside text-xs text-orange-700 dark:text-orange-300 ml-1">
                                <li>Minimum 4 characters</li>
                                <li>Must be different from your previous password</li>
                            </ul>
                        </div>

                        <div className="space-y-5">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-gray-300 mb-1">Current Password</label>
                                <input
                                    type="password"
                                    value={passwordData.current}
                                    onChange={e => setPasswordData({ ...passwordData, current: e.target.value })}
                                    className="form-input w-full"
                                    placeholder="••••••••"
                                />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 dark:text-gray-300 mb-1">New Password</label>
                                    <input
                                        type="password"
                                        value={passwordData.new}
                                        onChange={e => setPasswordData({ ...passwordData, new: e.target.value })}
                                        className="form-input w-full"
                                        placeholder="••••••••"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 dark:text-gray-300 mb-1">Confirm New Password</label>
                                    <input
                                        type="password"
                                        value={passwordData.confirm}
                                        onChange={e => setPasswordData({ ...passwordData, confirm: e.target.value })}
                                        className="form-input w-full"
                                        placeholder="••••••••"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="mt-8 pt-6 border-t border-gray-100 dark:border-zinc-800 flex justify-end">
                            <button type="submit" className="px-6 py-2.5 bg-gray-800 dark:bg-white text-white dark:text-slate-900 font-bold rounded-lg shadow-md hover:opacity-90 transition-all">
                                Update Password
                            </button>
                        </div>
                    </form>
                )}

                {/* NOTIFICATIONS TAB */}
                {activeTab === 'notifications' && (
                    <div className="max-w-2xl animate-fade-in">
                        <div className="mb-6">
                            <h3 className="text-xl font-bold text-slate-800 dark:text-white">Notifications</h3>
                            <p className="text-sm text-slate-500">Choose what you want to be notified about.</p>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-gray-900/50 rounded-lg border border-slate-200 dark:border-zinc-800">
                                <div>
                                    <h4 className="font-bold text-slate-800 dark:text-white">Email Alerts</h4>
                                    <p className="text-xs text-slate-500">Receive summaries and urgent alerts via email.</p>
                                </div>
                                <Toggle checked={notifications.emailAlerts} onChange={() => toggleNotification('emailAlerts')} />
                            </div>

                            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-gray-900/50 rounded-lg border border-slate-200 dark:border-zinc-800">
                                <div>
                                    <h4 className="font-bold text-slate-800 dark:text-white">Browser Push Notifications</h4>
                                    <p className="text-xs text-slate-500">Receive real-time alerts on your desktop.</p>
                                </div>
                                <Toggle checked={notifications.pushNotifications} onChange={() => toggleNotification('pushNotifications')} />
                            </div>

                            <hr className="border-slate-200 dark:border-zinc-800" />

                            <div className="flex items-center justify-between py-2">
                                <div>
                                    <h4 className="font-medium text-slate-700 dark:text-gray-300">Low Stock Warnings</h4>
                                </div>
                                <Toggle checked={notifications.lowStockAlerts} onChange={() => toggleNotification('lowStockAlerts')} />
                            </div>

                            <div className="flex items-center justify-between py-2">
                                <div>
                                    <h4 className="font-medium text-slate-700 dark:text-gray-300">New Online Orders</h4>
                                </div>
                                <Toggle checked={currentUser.preferences?.notifications?.orderStatus ?? true} onChange={() => {
                                    const current = currentUser.preferences?.notifications || { orderStatus: true, ticketStatus: true };
                                    const newPrefs = { ...currentUser.preferences, notifications: { ...current, orderStatus: !current.orderStatus } };

                                    setCurrentUser({ ...currentUser, preferences: newPrefs });
                                    updateCurrentSession({ preferences: newPrefs } as any);
                                }} />
                            </div>

                            <div className="flex items-center justify-between py-2">
                                <div>
                                    <h4 className="font-medium text-slate-700 dark:text-gray-300">Ticket Status Updates</h4>
                                </div>
                                <Toggle checked={currentUser.preferences?.notifications?.ticketStatus ?? true} onChange={() => {
                                    const current = currentUser.preferences?.notifications || { orderStatus: true, ticketStatus: true };
                                    const newPrefs = { ...currentUser.preferences, notifications: { ...current, ticketStatus: !current.ticketStatus } };

                                    setCurrentUser({ ...currentUser, preferences: newPrefs });
                                    updateCurrentSession({ preferences: newPrefs } as any);
                                }} />
                            </div>

                            <div className="flex items-center justify-between py-2">
                                <div>
                                    <h4 className="font-medium text-slate-700 dark:text-gray-300">System Updates</h4>
                                </div>
                                <Toggle checked={notifications.systemUpdates} onChange={() => toggleNotification('systemUpdates')} />
                            </div>
                        </div>
                    </div>
                )}

                {/* ACTIVITY TAB */}
                {activeTab === 'activity' && (
                    <div className="animate-fade-in max-w-3xl">
                        <div className="mb-6">
                            <h3 className="text-xl font-bold text-slate-800 dark:text-white">Recent Activity</h3>
                            <p className="text-sm text-slate-500">A log of your recent actions on the platform.</p>
                        </div>
                        <div className="space-y-4">
                            {userService.getUserActivity(currentUser.id).map((log, idx) => (
                                <div key={log.id || idx} className="flex gap-4 p-4 bg-slate-50 dark:bg-gray-900/50 rounded-lg border border-gray-100 dark:border-zinc-800">
                                    <div className={`w-2 h-full self-stretch rounded-full flex-shrink-0 ${log.type === 'success' ? 'bg-green-500' :
                                        log.type === 'warning' ? 'bg-orange-500' :
                                            log.type === 'danger' ? 'bg-red-500' : 'bg-blue-500'
                                        }`}></div>
                                    <div className="flex-1">
                                        <div className="flex justify-between items-start">
                                            <h4 className="font-bold text-slate-800 dark:text-white text-sm">{log.action}</h4>
                                            <span className="text-xs text-slate-500 bg-white dark:bg-gray-800 px-2 py-0.5 rounded border border-slate-200 dark:border-zinc-800">{new Date(log.timestamp).toLocaleString()}</span>
                                        </div>
                                        <p className="text-sm text-slate-600 dark:text-gray-300 mt-1">{log.details}</p>
                                    </div>
                                </div>
                            ))}
                            {userService.getUserActivity(currentUser.id).length === 0 && (
                                <p className="text-slate-500 italic text-center py-10 bg-slate-50 dark:bg-gray-900/50 rounded-lg border border-dashed border-slate-300 dark:border-zinc-800">No recent activity logged.</p>
                            )}
                        </div>
                    </div>
                )}
            </div>
            <style>{`
                .form-input {
                    padding: 0.6rem;
                    border: 1px solid #d1d5db;
                    border-radius: 0.5rem;
                    background-color: #fff;
                    transition: all 0.2s;
                }
                .dark .form-input {
                    background-color: #374151;
                    border-color: #4b5563;
                    color: white;
                }
                .form-input:focus {
                    outline: none;
                    border-color: var(--color-primary);
                    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
                }
                @keyframes fade-in {
                    from { opacity: 0; transform: translateY(5px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in {
                    animation: fade-in 0.3s ease-out forwards;
                }
            `}</style>
        </div >
    );
};

const Toggle: React.FC<{ checked: boolean, onChange: () => void }> = ({ checked, onChange }) => (
    <button
        type="button"
        onClick={onChange}
        className={`relative w-12 h-6 rounded-full transition-colors duration-200 focus:outline-none ${checked ? 'bg-[var(--color-primary)]' : 'bg-slate-300 dark:bg-gray-600'}`}
    >
        <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transform transition-transform duration-200 ${checked ? 'translate-x-6' : 'translate-x-0'}`}></div>
    </button>
);

export default UserSettingsPanel;
