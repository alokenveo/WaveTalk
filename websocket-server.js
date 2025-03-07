import { WebSocketServer } from 'ws'

const wss = new WebSocketServer({ port: 8080 })

// Mapa para almacenar clientes conectados por userId
const clients = new Map()

wss.on('connection', (ws, req) => {
  const urlParams = new URLSearchParams(req.url.slice(1))
  const userId = urlParams.get('userId')

  if (!userId) {
    console.log('Conexión rechazada: userId no proporcionado')
    ws.close()
    return
  }

  console.log(`Cliente conectado: ${userId}`)
  clients.set(userId, ws)

  ws.on('message', (message) => {
    let parsedMessage
    try {
      parsedMessage = JSON.parse(message)
    } catch (error) {
      console.error('Error al parsear mensaje:', error, 'Mensaje recibido:', message)
      return
    }

    const { event, data, targetUserIds } = parsedMessage
    console.log(`Mensaje recibido de ${userId}: ${event}`, data)

    if (event === 'check-connection') {
      const interlocutorId = data.userId.toString() // Convertimos a cadena
      console.log(`Verificando conexión de ${interlocutorId}`)
      console.log('Clientes actuales:', Array.from(clients.keys()))
      const connected =
        !!clients.get(interlocutorId) &&
        clients.get(interlocutorId).readyState === clients.get(interlocutorId).OPEN
      console.log(`Resultado de la verificación para ${interlocutorId}: ${connected}`)
      ws.send(JSON.stringify({ event: 'connection-response', data: { connected } }))
    } else {
      notifyUsers(targetUserIds, event, data)
    }
  })

  ws.on('close', () => {
    console.log(`Cliente desconectado: ${userId}`)
    clients.delete(userId)
  })

  ws.on('error', (err) => {
    console.error(`Error en WebSocket para ${userId}:`, err)
  })
})

// Función para notificar a los usuarios
function notifyUsers(userIds, event, data) {
  console.log('Notificando a usuarios:', userIds, 'Evento:', event, 'Datos:', data)
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

console.log('Servidor WebSocket iniciado en ws://localhost:8080')
