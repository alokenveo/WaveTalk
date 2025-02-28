// preload/index.js
import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
  send: (channel, data) => ipcRenderer.send(channel, data),
  once: (channel, listener) =>
    ipcRenderer.once(channel, (event, ...args) => listener(event, ...args)),
  // Para WebSocket (ya lo tienes)
  connectWebSocket: (userId, onMessage) => {
    const ws = new WebSocket(`ws://localhost:8080/?userId=${userId}`)
    ws.onmessage = (event) => {
      const { event: eventType, data } = JSON.parse(event.data)
      onMessage(eventType, data)
    }
    ws.onopen = () => console.log(`WebSocket conectado para usuario ${userId}`)
    ws.onclose = () => console.log(`WebSocket cerrado para usuario ${userId}`)
    ws.onerror = (err) => console.error('Error en WebSocket:', err)
    return ws
  }
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', api)
    contextBridge.exposeInMainWorld('api', electronAPI)
  } catch (error) {
    console.error(error)
  }
} else {
  window.electron = api
  window.api = electronAPI
}
