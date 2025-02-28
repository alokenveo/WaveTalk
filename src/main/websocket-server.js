// websocket-server.js
import { WebSocketServer } from 'ws'

const wss = new WebSocketServer({ port: 8080 })

// Mapa para almacenar clientes conectados por usuario
const clients = new Map()

wss.on('connection', (ws, req) => {
  const urlParams = new URLSearchParams(req.url.slice(1))
  const userId = urlParams.get('userId')

  if (userId) {
    console.log(`Cliente conectado: ${userId}`)
    clients.set(userId, ws)

    ws.on('close', () => {
      console.log(`Cliente desconectado: ${userId}`)
      clients.delete(userId)
    })
  }
})

// Función para notificar a los usuarios sobre nuevos mensajes o chats
function notifyUsers(userIds, event, data) {
  userIds.forEach((userId) => {
    const client = clients.get(userId.toString())
    if (client && client.readyState === client.OPEN) {
      client.send(JSON.stringify({ event, data }))
    }
  })
}

// Exportación ES6
export { wss, notifyUsers }
