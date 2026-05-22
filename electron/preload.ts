import { contextBridge, ipcRenderer } from 'electron'

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electron', {
    invoke: (channel: string, data?: any) => ipcRenderer.invoke(channel, data),
})

contextBridge.exposeInMainWorld('electronAPI', {
    onDeepLink: (callback: (url: string) => void) =>
        ipcRenderer.on('deep-link-url', (_event, url) => callback(url))
})
