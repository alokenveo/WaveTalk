// preload/index.js
import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

const clients = new Map() // Suscriptores por userId
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

    const subscribers = clients.get(userId) || []
    subscribers.push(onMessage)
    clients.set(userId, subscribers)

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
  },
  // Nueva función para enviar notificaciones al servidor WebSocket
  notifyUsers: (userIds, event, data) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ event, data, targetUserIds: userIds }))
    } else {
      console.error('WebSocket no está abierto para enviar notificación')
    }
  }
}

// Escuchar notificaciones desde main
ipcRenderer.on('notificar-usuarios', (event, { userIds, event: eventType, data }) => {
  api.notifyUsers(userIds, eventType, data)
})

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
