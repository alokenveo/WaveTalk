// preload/index.js
import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

const clients = new Map() // Almacenar suscriptores por userId
let ws = null // WebSocket único

const api = {
  send: (channel, data) => ipcRenderer.send(channel, data),
  once: (channel, listener) =>
    ipcRenderer.once(channel, (event, ...args) => listener(event, ...args)),
  connectWebSocket: (userId, onMessage) => {
    if (!ws || ws.readyState === WebSocket.CLOSED) {
      console.log(`Creando nueva conexión WebSocket para usuario ${userId}`)
      ws = new WebSocket(`ws://localhost:8080/?userId=${userId}`)
      ws.onmessage = (event) => {
        const { event: eventType, data } = JSON.parse(event.data)
        console.log('Mensaje recibido en WebSocket desde servidor:', eventType, data)
        const subscribers = clients.get(userId) || []
        subscribers.forEach((subscriber) => subscriber(eventType, data))
      }
      ws.onopen = () => console.log(`WebSocket abierto para usuario ${userId}`)
      ws.onclose = () => console.log(`WebSocket cerrado para usuario ${userId}`)
      ws.onerror = (err) => console.error('Error en WebSocket:', err)
    }

    // Registrar suscriptor
    const subscribers = clients.get(userId) || []
    subscribers.push(onMessage)
    clients.set(userId, subscribers)

    // Retornar función para desuscribirse
    return {
      close: () => {
        const currentSubscribers = clients.get(userId) || []
        const updatedSubscribers = currentSubscribers.filter((sub) => sub !== onMessage)
        clients.set(userId, updatedSubscribers)
        if (updatedSubscribers.length === 0 && ws && ws.readyState === WebSocket.OPEN) {
          ws.close()
        }
      }
    }
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
