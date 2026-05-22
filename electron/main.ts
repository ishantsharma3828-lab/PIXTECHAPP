import { app, BrowserWindow, ipcMain } from 'electron'
import path from 'path'
import fs from 'fs'

const dirname = __dirname
const SETTINGS_PATH = path.join(app.getPath('userData'), 'electron-settings.json')

// Global references to prevent garbage collection
let mainWindow: BrowserWindow | null = null
let splashWindow: BrowserWindow | null = null

function getSettings() {
  try {
    if (fs.existsSync(SETTINGS_PATH)) {
      return JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf-8'))
    }
  } catch (e) {
    console.error('Failed to read settings', e)
  }
  return { kioskMode: false, autoLaunch: false }
}

function saveSettings(settings: any) {
  try {
    fs.writeFileSync(SETTINGS_PATH, JSON.stringify(settings))
  } catch (e) {
    console.error('Failed to save settings', e)
  }
}

// Prevent multiple instances
const singleInstanceLock = app.requestSingleInstanceLock()

if (!singleInstanceLock) {
  app.quit()
  process.exit(0)
} else {
  app.on('second-instance', (event, commandLine) => {
    // Someone tried to run a second instance, we should focus our window.
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()

      // Handle Deep Link on Windows
      const deepLinkUrl = commandLine.find((arg) => arg.startsWith('modularpos://'));
      if (deepLinkUrl) {
        mainWindow.webContents.send('deep-link-url', deepLinkUrl);
      }
    }
  })
}

function createSplash() {
  splashWindow = new BrowserWindow({
    width: 640,
    height: 360, // 16:9 Aspect Ratio (Fix centering)
    frame: false,
    alwaysOnTop: true,
    transparent: false,
    backgroundColor: '#ffffff', // Requested white background for video
    icon: path.join(dirname, '../build/icon.ico'),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      autoplayPolicy: 'no-user-gesture-required'
    }
  });

  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
  const splashPath = isDev
    ? path.join(dirname, '../public/splash.html')
    : path.join(dirname, '../dist/splash.html');

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
  const settings = getSettings()

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    backgroundColor: '#000000', // Start with black background
    icon: path.join(dirname, '../build/icon.ico'),
    kiosk: settings.kioskMode,
    fullscreen: settings.kioskMode,
    alwaysOnTop: settings.kioskMode,
    autoHideMenuBar: true,
    frame: false, // Make window frameless
    titleBarStyle: 'hidden',
    show: false, // HIDE INITIALLY (Wait for splash)
    webPreferences: {
      preload: path.join(dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      autoplayPolicy: 'no-user-gesture-required' // Allow video autoplay
    },
  })

  // Auto-launch handling
  app.setLoginItemSettings({
    openAtLogin: settings.autoLaunch,
    path: app.getPath('exe'),
  })

  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
  const devUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:3000';

  if (isDev) {
    mainWindow.loadURL(devUrl)
    if (isDev) mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(dirname, '../dist/index.html'))
  }
}

app.whenReady().then(() => {
  // Deep Linking
  if (process.defaultApp) {
    if (process.argv.length >= 2) {
      app.setAsDefaultProtocolClient('modularpos', process.execPath, [path.resolve(process.argv[1])])
    }
  } else {
    app.setAsDefaultProtocolClient('modularpos')
  }

  // Start with Splash Screen
  createSplash();
  // Pre-load main window in background
  createMainWindow();

  // IPC Handlers
  ipcMain.handle('get-electron-settings', () => getSettings())

  // Window Management Handlers
  ipcMain.handle('window-minimize', () => {
    const win = BrowserWindow.getFocusedWindow()
    if (win) win.minimize()
  })

  ipcMain.handle('window-maximize', () => {
    const win = BrowserWindow.getFocusedWindow()
    if (win) {
      if (win.isMaximized()) win.unmaximize()
      else win.maximize()
    }
  })

  ipcMain.handle('window-close', () => {
    const win = BrowserWindow.getFocusedWindow()
    if (win) win.close()
  })

  ipcMain.handle('get-window-maximized', () => {
    const win = BrowserWindow.getFocusedWindow()
    return win ? win.isMaximized() : false
  })

  ipcMain.handle('update-electron-settings', (_, settings) => {
    saveSettings(settings)
    // Avoid affecting splash window if valid
    const win = BrowserWindow.getAllWindows().find(w => w !== splashWindow);
    if (win) {
      win.setKiosk(settings.kioskMode)
      win.setAlwaysOnTop(settings.kioskMode)
    }
  })

  // Listen for video end from Splash
  ipcMain.on('splash-finished', () => {
    finishSplash();
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createSplash()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
