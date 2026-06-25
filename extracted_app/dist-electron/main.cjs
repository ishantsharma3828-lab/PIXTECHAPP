"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const url_1 = require("url");
const dirname = __dirname;
const SETTINGS_PATH = path_1.default.join(electron_1.app.getPath('userData'), 'electron-settings.json');
const STARTUP_LOG_PATH = path_1.default.join(electron_1.app.getPath('userData'), 'pixtech-electron-startup.log');
function logStartup(message, error) {
    try {
        const detail = error instanceof Error ? `${error.stack || error.message}` : (error ? String(error) : '');
        fs_1.default.appendFileSync(STARTUP_LOG_PATH, `[${new Date().toISOString()}] ${message}${detail ? `\n${detail}` : ''}\n`);
    }
    catch { }
}
process.on('uncaughtException', (error) => logStartup('uncaughtException', error));
process.on('unhandledRejection', (error) => logStartup('unhandledRejection', error));
logStartup('main loaded');
// Global references to prevent garbage collection
let mainWindow = null;
let splashWindow = null;
function getSettings() {
    try {
        if (fs_1.default.existsSync(SETTINGS_PATH)) {
            return JSON.parse(fs_1.default.readFileSync(SETTINGS_PATH, 'utf-8'));
        }
    }
    catch (e) {
        console.error('Failed to read settings', e);
    }
    return { kioskMode: false, autoLaunch: false };
}
function saveSettings(settings) {
    try {
        fs_1.default.writeFileSync(SETTINGS_PATH, JSON.stringify(settings));
    }
    catch (e) {
        console.error('Failed to save settings', e);
    }
}
// Prevent multiple instances. Local production testing can opt out because this
// machine may already have other Electron shells running under the same binary.
const allowMultiInstance = process.env.PIXTECH_ALLOW_MULTI_INSTANCE === 'true';
const singleInstanceLock = allowMultiInstance || electron_1.app.requestSingleInstanceLock();
if (!singleInstanceLock) {
    logStartup('single instance lock failed; quitting');
    electron_1.app.quit();
    process.exit(0);
}
else if (!allowMultiInstance) {
    electron_1.app.on('second-instance', (event, commandLine) => {
        // Someone tried to run a second instance, we should focus our window.
        if (mainWindow) {
            if (mainWindow.isMinimized())
                mainWindow.restore();
            mainWindow.focus();
            // Handle Deep Link on Windows
            const deepLinkUrl = commandLine.find((arg) => arg.startsWith('modularpos://'));
            if (deepLinkUrl) {
                mainWindow.webContents.send('deep-link-url', deepLinkUrl);
            }
        }
    });
}
function createSplash() {
    const iconPath = path_1.default.join(dirname, '../public/icon.ico');
    const rendererUrl = process.env.ELECTRON_RENDERER_URL || process.env.VITE_DEV_SERVER_URL;
    splashWindow = new electron_1.BrowserWindow({
        width: 640,
        height: 360, // 16:9 Aspect Ratio (Fix centering)
        frame: false,
        alwaysOnTop: true,
        transparent: false,
        backgroundColor: '#ffffff', // Requested white background for video
        icon: iconPath,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            autoplayPolicy: 'no-user-gesture-required'
        }
    });
    const splashPath = rendererUrl
        ? path_1.default.join(dirname, '../public/splash.html')
        : path_1.default.join(dirname, '../dist/splash.html');
    splashWindow.loadFile(splashPath);
    // Safety timeout: Close splash after 8 seconds if video hangs
    setTimeout(() => {
        if (splashWindow && !splashWindow.isDestroyed()) {
            finishSplash();
        }
    }, 8000);
}
function finishSplash() {
    if (!mainWindow) {
        createMainWindow();
    }
    if (mainWindow) {
        mainWindow.show();
        mainWindow.focus();
    }
    if (splashWindow && !splashWindow.isDestroyed()) {
        splashWindow.close();
    }
    splashWindow = null;
}
function createMainWindow() {
    const settings = getSettings();
    const iconPath = path_1.default.join(dirname, '../public/icon.ico');
    const rendererUrl = process.env.ELECTRON_RENDERER_URL || process.env.VITE_DEV_SERVER_URL;
    const appEntryPath = path_1.default.join(dirname, '../dist/index.html');
    const appEntryUrl = (0, url_1.pathToFileURL)(appEntryPath).href;
    mainWindow = new electron_1.BrowserWindow({
        width: 1200,
        height: 800,
        backgroundColor: '#000000', // Start with black background
        icon: iconPath,
        kiosk: settings.kioskMode,
        fullscreen: settings.kioskMode,
        alwaysOnTop: settings.kioskMode,
        autoHideMenuBar: true,
        frame: false, // Make window frameless
        titleBarStyle: 'hidden',
        show: false, // HIDE INITIALLY (Wait for splash)
        webPreferences: {
            preload: path_1.default.join(dirname, 'preload.cjs'),
            contextIsolation: true,
            nodeIntegration: false,
            autoplayPolicy: 'no-user-gesture-required' // Allow video autoplay
        },
    });
    // Auto-launch handling
    electron_1.app.setLoginItemSettings({
        openAtLogin: settings.autoLaunch,
        path: electron_1.app.getPath('exe'),
    });
    mainWindow.webContents.on('will-navigate', (event, targetUrl) => {
        if (rendererUrl)
            return;
        if (targetUrl.startsWith(appEntryUrl))
            return;
        logStartup(`blocked renderer navigation: ${targetUrl}`);
        event.preventDefault();
        mainWindow?.loadFile(appEntryPath);
    });
    if (rendererUrl) {
        mainWindow.loadURL(rendererUrl);
        if (process.env.ELECTRON_OPEN_DEVTOOLS === 'true')
            mainWindow.webContents.openDevTools();
    }
    else {
        mainWindow.loadFile(appEntryPath);
    }
}
electron_1.app.whenReady().then(() => {
    logStartup('app ready');
    // Deep Linking
    if (process.defaultApp) {
        if (process.argv.length >= 2) {
            electron_1.app.setAsDefaultProtocolClient('modularpos', process.execPath, [path_1.default.resolve(process.argv[1])]);
        }
    }
    else {
        electron_1.app.setAsDefaultProtocolClient('modularpos');
    }
    // Start with Splash Screen
    createSplash();
    // Pre-load main window in background
    createMainWindow();
    logStartup('windows requested');
    // IPC Handlers
    electron_1.ipcMain.handle('get-electron-settings', () => getSettings());
    // Window Management Handlers
    electron_1.ipcMain.handle('window-minimize', () => {
        const win = electron_1.BrowserWindow.getFocusedWindow();
        if (win)
            win.minimize();
    });
    electron_1.ipcMain.handle('window-maximize', () => {
        const win = electron_1.BrowserWindow.getFocusedWindow();
        if (win) {
            if (win.isMaximized())
                win.unmaximize();
            else
                win.maximize();
        }
    });
    electron_1.ipcMain.handle('window-close', () => {
        const win = electron_1.BrowserWindow.getFocusedWindow();
        if (win)
            win.close();
    });
    electron_1.ipcMain.handle('get-window-maximized', () => {
        const win = electron_1.BrowserWindow.getFocusedWindow();
        return win ? win.isMaximized() : false;
    });
    electron_1.ipcMain.handle('update-electron-settings', (_, settings) => {
        saveSettings(settings);
        // Avoid affecting splash window if valid
        const win = electron_1.BrowserWindow.getAllWindows().find(w => w !== splashWindow);
        if (win) {
            win.setKiosk(settings.kioskMode);
            win.setAlwaysOnTop(settings.kioskMode);
        }
    });
    // Listen for video end from Splash
    electron_1.ipcMain.on('splash-finished', () => {
        finishSplash();
    });
    electron_1.app.on('activate', () => {
        if (electron_1.BrowserWindow.getAllWindows().length === 0) {
            createSplash();
        }
    });
});
electron_1.app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        electron_1.app.quit();
    }
});
