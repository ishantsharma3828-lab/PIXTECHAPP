"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
electron_1.contextBridge.exposeInMainWorld('electron', {
    invoke: (channel, data) => electron_1.ipcRenderer.invoke(channel, data),
});
electron_1.contextBridge.exposeInMainWorld('electronAPI', {
    onDeepLink: (callback) => electron_1.ipcRenderer.on('deep-link-url', (_event, url) => callback(url))
});
