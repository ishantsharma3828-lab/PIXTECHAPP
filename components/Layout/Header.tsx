
import React, { useState, useContext, useEffect, useRef } from 'react';
import { UIContext } from '../../contexts/UIContext';
import * as authService from '../../services/authService';
import * as notificationService from '../../services/notificationService';
import { SettingsContext } from '../../contexts/SettingsContext';
import { Link, useNavigate } from 'react-router-dom';

interface HeaderProps {
    onLogout: () => void;
}

const Header: React.FC<HeaderProps> = ({ onLogout }) => {
    const [isDropdownOpen, setDropdownOpen] = useState(false);
    const [isNotifOpen, setNotifOpen] = useState(false);
    const [notifications, setNotifications] = useState<notificationService.AppNotification[]>([]);

    const { toggleSidebarVisibility, isSidebarVisible } = useContext(UIContext);
    const { settings, t } = useContext(SettingsContext);
    const user = authService.getCurrentUser();
    const navigate = useNavigate();
    const notifRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Load initial notifications
        setNotifications(notificationService.getNotifications());

        // Optional: Poll for new notifications every minute
        const interval = setInterval(() => {
            setNotifications(notificationService.getNotifications());
        }, 60000);

        // Click outside listener
        const handleClickOutside = (event: MouseEvent) => {
            if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
                setNotifOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);

        return () => {
            clearInterval(interval);
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const handleLogout = () => {
        authService.logout();
        onLogout();
    };

    const toggleNotifications = () => {
        setNotifOpen(!isNotifOpen);
        // Refresh data when opening
        if (!isNotifOpen) {
            setNotifications(notificationService.getNotifications());
        }
    };

    const markAllRead = () => {
        const updated = notificationService.markAllAsRead();
        setNotifications(updated);
    };

    const handleNotificationClick = (notif: notificationService.AppNotification) => {
        const updated = notificationService.markAsRead(notif.id);
        setNotifications(updated);
        setNotifOpen(false);
        if (notif.link) {
            navigate(notif.link);
        }
    };

    const unreadCount = notifications.filter(n => !n.read).length;

    const getIconForType = (type: string) => {
        switch (type) {
            case 'warning': return <svg className="w-5 h-5 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>;
            case 'success': return <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
            case 'error': return <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
            default: return <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
        }
    };

    const getTimeAgo = (dateStr: string) => {
        const seconds = Math.floor((new Date().getTime() - new Date(dateStr).getTime()) / 1000);
        let interval = seconds / 31536000;
        if (interval > 1) return Math.floor(interval) + "y ago";
        interval = seconds / 2592000;
        if (interval > 1) return Math.floor(interval) + "mo ago";
        interval = seconds / 86400;
        if (interval > 1) return Math.floor(interval) + "d ago";
        interval = seconds / 3600;
        if (interval > 1) return Math.floor(interval) + "h ago";
        interval = seconds / 60;
        if (interval > 1) return Math.floor(interval) + "m ago";
        return "Just now";
    };

    return (
        <header className="bg-white dark:bg-zinc-950 border-b border-slate-200 dark:border-zinc-800 h-16 flex-shrink-0 flex items-center justify-between px-4 sm:px-6 z-50 transition-colors duration-300 sticky top-0 pt-[env(safe-area-inset-top,0px)]">
            <div className="flex items-center gap-2 sm:gap-3">
                {/* Desktop Hide/Show Dock Button */}
                <button
                    onClick={toggleSidebarVisibility}
                    className="hidden md:flex items-center gap-1.5 text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-slate-900 dark:text-zinc-100 transition-colors focus:outline-none p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-[#1A1A1A] group"
                    title={isSidebarVisible ? "Hide Dock" : "Show Dock"}
                >
                    {isSidebarVisible ? (
                        <svg className="h-4 w-4 transform transition-transform group-hover:-translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                        </svg>
                    ) : (
                        <svg className="h-4 w-4 transform transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                        </svg>
                    )}
                    <span className="font-semibold text-xs uppercase tracking-wider">
                        {isSidebarVisible ? "Hide Dock" : "Show Dock"}
                    </span>
                </button>

                <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-zinc-100 tracking-tight truncate max-w-[120px] sm:max-w-xs">{settings.companyName}</h1>
            </div>

            {/* Right Actions */}
            <div className="flex items-center space-x-3 sm:space-x-4">
                {/* Search */}
                <div className="relative hidden md:block">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center">
                        <svg className="h-4 w-4 text-slate-500 dark:text-zinc-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                    </span>
                    <input className="w-64 pl-9 pr-4 py-1.5 border rounded-md bg-slate-50 dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 border-slate-300 dark:border-zinc-700 focus:outline-none focus:border-blue-500 dark:focus:border-[#3B82F6] transition-all text-sm font-mono placeholder:text-slate-500 dark:text-gray-400 dark:placeholder:text-zinc-500" type="text" placeholder={t('header.search_placeholder')} />
                </div>

                {/* User Dropdown */}
                <div className="relative">
                    <button onClick={() => setDropdownOpen(!isDropdownOpen)} className="flex items-center space-x-1 sm:space-x-2 focus:outline-none hover:bg-slate-100 dark:hover:bg-[#1A1A1A] p-1 rounded-md transition-colors">
                        {user?.fullName ? (
                            <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-md bg-[#3B82F6] flex items-center justify-center text-white font-bold text-xs sm:text-sm border border-slate-200 dark:border-zinc-800 shadow-sm">
                                {user.fullName.charAt(0).toUpperCase()}
                            </div>
                        ) : (
                            <img className="h-7 w-7 sm:h-8 sm:w-8 rounded-md object-cover border border-slate-200 dark:border-zinc-800 shadow-sm" src={`https://i.pravatar.cc/100?u=${user?.username}`} alt="User avatar" />
                        )}
                        <span className="hidden md:inline text-xs font-medium text-slate-900 dark:text-zinc-100 capitalize">{user?.username}</span>
                        <svg className="w-3 h-3 text-slate-500 dark:text-zinc-400 hidden sm:block" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                    </button>

                    {isDropdownOpen && (
                        <>
                            <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)}></div>
                            <div className="absolute right-0 mt-2 w-48 bg-slate-50 dark:bg-zinc-900 rounded-xl shadow-xl py-1 z-50 border border-slate-200 dark:border-zinc-800 animate-fade-in-down origin-top-right">

                                <Link to="/pos/user-profile" className="block px-4 py-2 text-sm text-slate-900 dark:text-zinc-100 hover:bg-zinc-800 flex items-center gap-2" onClick={() => setDropdownOpen(false)}>
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                                    {t('header.profile') || 'My Profile'}
                                </Link>

                                <button
                                    onClick={async () => {
                                        setDropdownOpen(false);
                                        await authService.refreshUserProfile();
                                        window.location.reload();
                                    }}
                                    className="w-full text-left block px-4 py-2 text-sm text-slate-900 dark:text-zinc-100 hover:bg-zinc-800 flex items-center gap-2"
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                                    Refresh Profile
                                </button>

                                {user?.role === 'admin' && (
                                    <Link to="/pos/settings" className="block px-4 py-2 text-sm text-slate-900 dark:text-zinc-100 hover:bg-zinc-800 flex items-center gap-2" onClick={() => setDropdownOpen(false)}>
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                                        {t('nav.settings')}
                                    </Link>
                                )}

                                <div className="border-t border-slate-200 dark:border-zinc-800 my-1"></div>
                                <button
                                    onClick={handleLogout}
                                    className="w-full text-left block px-4 py-2 text-sm text-red-400 hover:bg-red-900/20 flex items-center gap-2"
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
                                    {t('header.logout')}
                                </button>
                            </div>
                        </>
                    )}
                </div>

                {/* Notifications - Dropdown */}
                <div className="relative" ref={notifRef}>
                    <button
                        onClick={toggleNotifications}
                        className="p-1.5 rounded-full text-slate-500 dark:text-zinc-400 hover:bg-slate-50 dark:bg-zinc-900 focus:outline-none transition-colors relative"
                        title="Notifications"
                    >
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path></svg>
                        {unreadCount > 0 && (
                            <>
                                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full animate-ping"></span>
                                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-slate-900"></span>
                            </>
                        )}
                    </button>

                    {isNotifOpen && (
                        <div className="absolute right-0 mt-2 w-[280px] sm:w-80 bg-slate-50 dark:bg-zinc-900 rounded-xl shadow-xl z-50 border border-slate-200 dark:border-zinc-800 animate-fade-in-down overflow-hidden">
                            <div className="p-3 border-b border-slate-200 dark:border-zinc-800 flex justify-between items-center bg-white dark:bg-zinc-950">
                                <h3 className="font-bold text-slate-800 dark:text-slate-200">Notifications</h3>
                                {unreadCount > 0 && (
                                    <button onClick={markAllRead} className="text-xs text-blue-400 hover:underline font-medium">
                                        Mark all read
                                    </button>
                                )}
                            </div>
                            <div className="max-h-80 overflow-y-auto">
                                {notifications.length === 0 ? (
                                    <div className="p-6 text-center text-slate-500 dark:text-zinc-400 text-sm">
                                        No new notifications.
                                    </div>
                                ) : (
                                    <ul className="divide-y divide-slate-700">
                                        {notifications.map(notif => (
                                            <li
                                                key={notif.id}
                                                onClick={() => handleNotificationClick(notif)}
                                                className={`p-3 hover:bg-zinc-800 cursor-pointer transition-colors flex gap-3 ${!notif.read ? 'bg-blue-900/20' : ''}`}
                                            >
                                                <div className="mt-1 flex-shrink-0">
                                                    {getIconForType(notif.type)}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className={`text-sm ${!notif.read ? 'font-bold text-slate-50' : 'font-medium text-slate-900 dark:text-zinc-100'}`}>
                                                        {notif.title}
                                                    </p>
                                                    <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5 truncate">
                                                        {notif.message}
                                                    </p>
                                                    <p className="text-[10px] text-slate-500 mt-1">
                                                        {getTimeAgo(notif.timestamp)}
                                                    </p>
                                                </div>
                                                {!notif.read && (
                                                    <div className="flex-shrink-0 self-center">
                                                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                                    </div>
                                                )}
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                            <div className="p-2 border-t border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-center">
                                <button
                                    onClick={() => {
                                        setNotifOpen(false);
                                        navigate('/pos/user-profile', { state: { activeTab: 'notifications' } });
                                    }}
                                    className="text-xs font-bold text-slate-500 dark:text-zinc-400 hover:text-slate-50"
                                >
                                    View Settings
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            <style>{`
        @keyframes fade-in-down {
            from { opacity: 0; transform: translateY(-10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-down {
            animation: fade-in-down 0.2s ease-out forwards;
        }
      `}</style>
        </header>
    );
};

export default Header;
