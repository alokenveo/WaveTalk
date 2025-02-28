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
  console.log('Notificando a usuarios:', userIds, 'Evento:', event, 'Datos:', data) // Log para depurar
  userIds.forEach((userId) => {
    const client = clients.get(userId.toString())
    if (client && client.readyState === client.OPEN) {
      console.log(`Enviando a ${userId}: ${event}`, data)
      client.send(JSON.stringify({ event, data }))
    } else {
      console.log(`Cliente ${userId} no encontrado o no está abierto`)
    }
  })
}

// Exportación ES6
export { wss, notifyUsers }
