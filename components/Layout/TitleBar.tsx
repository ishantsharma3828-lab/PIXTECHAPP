
import React, { useState, useEffect, useContext } from 'react';
import { SettingsContext } from '../../contexts/SettingsContext';

const TitleBar: React.FC = () => {
    const { settings } = useContext(SettingsContext);
    const [isMaximized, setIsMaximized] = useState(false);

    useEffect(() => {
        const checkMaximized = async () => {
            if ((window as any).electron) {
                const maximized = await (window as any).electron.invoke('get-window-maximized');
                setIsMaximized(maximized);
            }
        };

        checkMaximized();

        // Listen for window resize/maximize events if possible, or just poll occasionally
        const interval = setInterval(checkMaximized, 1000);
        return () => clearInterval(interval);
    }, []);

    const handleMinimize = () => {
        if ((window as any).electron) (window as any).electron.invoke('window-minimize');
    };

    const handleMaximize = async () => {
        if ((window as any).electron) {
            await (window as any).electron.invoke('window-maximize');
            const maximized = await (window as any).electron.invoke('get-window-maximized');
            setIsMaximized(maximized);
        }
    };

    const handleClose = () => {
        if ((window as any).electron) (window as any).electron.invoke('window-close');
    };

    // Hide TitleBar on Web App (User Request)
    if (!(window as any).electron) return null;

    return (
        <div className="h-10 bg-white/95 dark:bg-black/95 backdrop-blur-md flex items-center justify-between select-none z-[100] border-b border-black/5 dark:border-white/5" style={{ WebkitAppRegion: 'drag' } as any}>
            {/* Left: App Logo & Title */}
            <div className="flex items-center px-4 gap-3 h-full" style={{ WebkitAppRegion: 'no-drag' } as any}>
                <div className="w-6 h-6 rounded-md bg-white flex items-center justify-center shadow-lg overflow-hidden">
                    <img src="icon.png" alt="Logo" className="w-full h-full object-contain" />
                </div>
                <span className="text-[10px] font-black text-gray-200 uppercase tracking-[0.2em]">{settings.companyName || 'POS PRO'} <span className="text-slate-500 opacity-50">v2.0.0</span></span>
            </div>

            {/* Right: Window Controls - Only show in Electron */}
            {(window as any).electron && (
                <div className="flex h-full" style={{ WebkitAppRegion: 'no-drag' } as any}>
                    <button
                        onClick={handleMinimize}
                        className="window-control w-12 h-full flex items-center justify-center hover:bg-black/10 dark:hover:bg-white/10 text-slate-500 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors group"
                    >
                        <div className="w-3 h-0.5 bg-current rounded-full group-hover:scale-x-125 transition-transform" />
                    </button>
                    <button
                        onClick={handleMaximize}
                        className="window-control w-12 h-full flex items-center justify-center hover:bg-black/10 dark:hover:bg-white/10 text-slate-500 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors group"
                    >
                        {isMaximized ? (
                            <div className="w-3 h-3 border-2 border-current rounded-sm relative opacity-70 group-hover:opacity-100 transition-opacity">
                                <div className="absolute -top-1 -right-1 w-2 h-2 border-t-2 border-r-2 border-current" />
                            </div>
                        ) : (
                            <div className="w-3 h-3 border-2 border-current rounded-sm group-hover:scale-110 transition-transform" />
                        )}
                    </button>
                    <button
                        onClick={handleClose}
                        className="window-control w-12 h-full flex items-center justify-center hover:bg-[#e81123] text-slate-500 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors group"
                    >
                        <svg className="w-4 h-4 group-hover:rotate-90 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            )}
        </div>
    );
};

export default TitleBar;
