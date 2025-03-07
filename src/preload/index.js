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
  notifyUsers: (userIds, event, data) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ event, data, targetUserIds: userIds }))
    } else {
      console.error('WebSocket no está abierto para enviar notificación')
    }
  },
  sendWebSocketMessage: (userId, event, data) => {
    console.log('Usuario actual:', userId)
    console.log('Interlocutor a verificar:', data.userId)
    return new Promise((resolve, reject) => {
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        console.log(`Abriendo WebSocket para usuario ${userId}`)
        ws = new WebSocket(`ws://localhost:8080/?userId=${userId}`)
        ws.onopen = () => {
          console.log(`WebSocket abierto, enviando mensaje para verificar ${data.userId}`)
          ws.send(JSON.stringify({ event, data }))
        }
      } else {
        console.log(`WebSocket ya abierto, enviando mensaje para verificar ${data.userId}`)
        ws.send(JSON.stringify({ event, data }))
      }

      const handler = (message) => {
        const { event: eventType, data: responseData } = JSON.parse(message.data)
        if (eventType === 'connection-response') {
          console.log('Respuesta recibida:', responseData)
          ws.removeEventListener('message', handler)
          resolve(responseData)
        }
      }
      ws.addEventListener('message', handler)
      setTimeout(() => {
        ws.removeEventListener('message', handler)
        reject(new Error('Timeout waiting for WebSocket response'))
      }, 5000) // Timeout de 5 segundos
    })
  }
}

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
