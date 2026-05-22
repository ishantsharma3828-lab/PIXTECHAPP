
import React, { useContext } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { NAV_ITEMS } from '../../constants';
import * as authService from '../../services/authService';
import { UIContext } from '../../contexts/UIContext';
import { SettingsContext } from '../../contexts/SettingsContext';

const Sidebar: React.FC = () => {
    const user = authService.getCurrentUser();
    const { isSidebarVisible } = useContext(UIContext);
    const { settings, t } = useContext(SettingsContext);

    if (!user) return null;

    const filteredNavItems = NAV_ITEMS.filter(
        (item) => !item.roles || item.roles.includes(user.role as any)
    );

    // Smoothly hide/show the dock instead of unmounting
    const dockClass = isSidebarVisible
        ? "translate-y-0 opacity-100"
        : "translate-y-32 opacity-0 pointer-events-none";

    return (
        <>
            {/* Desktop Glass Dock Layout */}
            <div className={`hidden md:flex fixed bottom-4 left-1/2 -translate-x-1/2 z-[60] items-center justify-center transition-all duration-500 ease-in-out ${dockClass}`}>
                <div className="bg-white dark:bg-zinc-950/90 backdrop-blur-xl border border-slate-200 dark:border-zinc-800 rounded-full px-3 py-1.5 flex gap-2 shadow-2xl items-center transform transition-all hover:scale-[1.01]">
                    {filteredNavItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            className={({ isActive }) =>
                                `p-2 rounded-full transition-all duration-200 group relative flex items-center justify-center
                              ${isActive
                                    ? 'bg-[#EDEDED] text-white dark:text-[#050505] shadow-lg scale-110'
                                    : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-slate-900 dark:text-zinc-100 hover:bg-slate-100 dark:hover:bg-[#1A1A1A]'
                                }`
                            }
                            title={t(item.name)}
                        >
                            <span className="w-5 h-5 flex items-center justify-center">{item.icon}</span>
                            <span className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-100 dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap border border-slate-200 dark:border-zinc-800">
                                {t(item.name)}
                            </span>
                        </NavLink>
                    ))}
                    <div className="w-px h-6 bg-zinc-800 mx-1"></div>
                    <Link to="/pos/user-profile" className="flex items-center gap-2 pl-1 hover:opacity-80 transition-opacity" title="My Profile">
                        {user.fullName ? (
                            <div className="w-7 h-7 rounded-full bg-[#3B82F6] flex items-center justify-center text-white text-[10px] font-bold border border-slate-200 dark:border-zinc-800">
                                {user.fullName.charAt(0).toUpperCase()}
                            </div>
                        ) : (
                            <img
                                className="w-7 h-7 rounded-full border border-slate-200 dark:border-zinc-800"
                                src={`https://i.pravatar.cc/100?u=${user.username}`}
                                alt="User"
                            />
                        )}
                    </Link>
                </div>
            </div>

        {/* Mobile Bottom Navigation (Visible only on small screens) */}
        <div className={`md:hidden fixed bottom-0 left-0 right-0 z-[100] items-center justify-center transition-all duration-500 ease-in-out ${dockClass}`}>
            <div className="bg-white dark:bg-zinc-950/90 backdrop-blur-xl border-t border-slate-200 dark:border-zinc-800 px-3 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))] flex gap-1 sm:gap-2 shadow-[0_-10px_20px_-10px_rgba(0,0,0,0.1)] items-center justify-around overflow-x-auto w-full scrollbar-hide">
                    {filteredNavItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            className={({ isActive }) =>
                                `p-2 sm:p-3 rounded-xl transition-all duration-200 group relative flex flex-col items-center justify-center shrink-0 w-12 sm:w-14
                              ${isActive
                                    ? 'text-blue-600 dark:text-blue-400'
                                    : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100 hover:bg-slate-100 dark:hover:bg-zinc-800'
                                }`
                            }
                            title={t(item.name)}
                        >
                            <span className="w-5 h-5 flex items-center justify-center mb-0.5">{item.icon}</span>
                            <span className="text-[9px] text-center w-full truncate leading-tight">
                                {t(item.name)}
                            </span>
                        </NavLink>
                    ))}
                </div>
            </div>
        </>
    );
};

export default Sidebar;