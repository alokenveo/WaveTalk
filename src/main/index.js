import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/waveTalk.png?asset'
import {
  registrarUsuario,
  iniciarSesion,
  obtenerChatsUsuario,
  obtenerMensajesChat,
  cerrarChat,
  abrirChat,
  enviarMensaje,
  obtenerUsuarios,
  crearChat,
  obtenerUsuarioPorId,
  cambiarTemaChat,
  db
} from '../renderer/src/database.js'

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    icon,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      devTools: true,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  // Configurar CSP para permitir WebSocket
  if (is.dev) {
    mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          'Content-Security-Policy': [
            "default-src 'self' http://localhost:5173 http://localhost:5174; connect-src 'self' ws://localhost:8080 http://localhost:5173 http://localhost:5174; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'"
          ]
        }
      })
    })
  } else {
    mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          'Content-Security-Policy': [
            "default-src 'self'; connect-src 'self' ws://localhost:8080; script-src 'self'; style-src 'self'"
          ]
        }
      })
    })
  }

  mainWindow.webContents.openDevTools()

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return mainWindow
}

app.whenReady().then(async () => {
  electronApp.setAppUserModelId('com.electron')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC test
  ipcMain.on('ping', () => console.log('pong'))

  // Registrar usuario
  ipcMain.on('registrar-usuario', (event, { nombre, correo, password }) => {
    registrarUsuario(nombre, correo, password, (err, usuario) => {
      if (err) {
        event.reply('registro-respuesta', { error: err.message || 'Error al registrar usuario' })
      } else {
        event.reply('registro-respuesta', { success: true, usuario })
      }
    })
  })

  // Iniciar sesión
  ipcMain.on('iniciar-sesion', (event, { correo, password }) => {
    iniciarSesion(correo, password, (err, usuario) => {
      if (err) {
        event.reply('login-respuesta', { error: err.message })
      } else {
        event.reply('login-respuesta', { success: true, usuario })
      }
    })
  })

  // Obtener chats de usuario
  ipcMain.on('obtener-chats-usuario', (event, usuarioId) => {
    obtenerChatsUsuario(usuarioId, (err, chats) => {
      if (err) {
        event.reply('chats-respuesta', { error: err.message })
      } else {
        event.reply('chats-respuesta', { success: true, chats })
      }
    })
  })

  // Obtener mensajes de un chat
  ipcMain.on('obtener-mensajes-chat', (event, chatId) => {
    obtenerMensajesChat(chatId, (err, mensajes) => {
      if (err) {
        event.reply('mensajes-respuesta', { error: err.message })
      } else {
        event.reply('mensajes-respuesta', { success: true, mensajes })
      }
    })
  })

  // Enviar mensaje
  ipcMain.on('enviar-mensaje', (event, mensaje) => {
    enviarMensaje(mensaje, (err, nuevoMensaje) => {
      if (err) {
        event.reply('mensaje-enviado-respuesta', { error: err.message })
      } else {
        event.reply('mensaje-enviado-respuesta', { success: true, mensaje: nuevoMensaje })
        // Notificar a los usuarios del chat vía WebSocket
        db.get(
          'SELECT usuario1_id, usuario2_id FROM chats WHERE id = ?',
          [nuevoMensaje.chat_id],
          (err, row) => {
            if (!err && row) {
              const userIds = [row.usuario1_id, row.usuario2_id]
              event.sender.send('notificar-usuarios', {
                userIds,
                event: 'nuevo-mensaje',
                data: nuevoMensaje
              })
            } else {
              console.error('Error al obtener usuarios del chat:', err)
            }
          }
        )
      }
    })
  })

  // Cerrar chat
  ipcMain.on('cerrar-chat', (event, { chatId, usuarioId }) => {
    cerrarChat({ chatId, usuarioId }, (err, result) => {
      if (err) {
        event.reply('chat-cerrado-respuesta', { error: err.message })
      } else {
        event.reply('chat-cerrado-respuesta', { success: true })
        const userIds = [result.usuario1_id, result.usuario2_id]
        event.sender.send('notificar-usuarios', {
          userIds,
          event: 'chat-estado-cambiado',
          data: {
            chat_id: chatId,
            estado: 'cerrado',
            cerradoPor: usuarioId
          }
        })
      }
    })
  })

  // Abrir chat
  ipcMain.on('abrir-chat', (event, { chatId, usuarioId }) => {
    abrirChat({ chatId, usuarioId }, (err, result) => {
      if (err) {
        event.reply('chat-abierto-respuesta', { error: err.message })
      } else {
        event.reply('chat-abierto-respuesta', { success: true })
        const userIds = [result.usuario1_id, result.usuario2_id]
        event.sender.send('notificar-usuarios', {
          userIds,
          event: 'chat-estado-cambiado',
          data: {
            chat_id: chatId,
            estado: 'activo',
            cerradoPor: null
          }
        })
      }
    })
  })

  // Obtener lista de usuarios
  ipcMain.on('obtener-usuarios', (event) => {
    obtenerUsuarios((err, usuarios) => {
      if (err) {
        event.reply('usuarios-respuesta', { error: err.message })
      } else {
        event.reply('usuarios-respuesta', { success: true, usuarios })
      }
    })
  })

  // Crear chat
  ipcMain.on('crear-chat', (event, chat) => {
    crearChat(chat, (err, nuevoChat) => {
      if (err) {
        event.reply('chat-creado-respuesta', { error: err.message })
      } else {
        obtenerUsuarioPorId(chat.usuario2_id, (err, usuario) => {
          if (err) {
            console.error('Error al obtener usuario:', err)
            event.reply('chat-creado-respuesta', { success: true, chat: nuevoChat })
            const userIds = [nuevoChat.usuario1_id, nuevoChat.usuario2_id]
            event.sender.send('notificar-usuarios', {
              userIds,
              event: 'nuevo-chat',
              data: nuevoChat
            })
          } else {
            const chatEnriquecido = {
              ...nuevoChat,
              interlocutor: usuario.nombre,
              estado: 'activo', // Asegurar estado inicial
              cerradoPor: null
            }
            event.reply('chat-creado-respuesta', { success: true, chat: chatEnriquecido })
            const userIds = [nuevoChat.usuario1_id, nuevoChat.usuario2_id]
            event.sender.send('notificar-usuarios', {
              userIds,
              event: 'nuevo-chat',
              data: chatEnriquecido
            })
          }
        })
      }
    })
  })

  // Cambiar tema del chat
  ipcMain.on('cambiar-tema-chat', (event, { chatId, tema }) => {
    cambiarTemaChat(chatId, tema, (err, result) => {
      if (err) {
        event.reply('tema-cambiado-respuesta', { error: err.message })
      } else {
        event.reply('tema-cambiado-respuesta', { success: true })
        const userIds = [result.usuario1_id, result.usuario2_id]
        event.sender.send('notificar-usuarios', {
          userIds,
          event: 'tema-cambiado',
          data: {
            chat_id: chatId,
            tema
          }
        })
      }
    })
  })

  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
