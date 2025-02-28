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
  enviarMensaje,
  obtenerUsuarios,
  crearChat
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
      devTools: true
    }
  })

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
}

app.whenReady().then(async () => {
  electronApp.setAppUserModelId('com.electron')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC test
  ipcMain.on('ping', () => console.log('pong'))

  // Manejador IPC para registrar usuario
  ipcMain.on('registrar-usuario', (event, { nombre, correo, password }) => {
    registrarUsuario(nombre, correo, password, (err, usuario) => {
      if (err) {
        // Más detalle en el error, por ejemplo, si el correo ya existe
        event.reply('registro-respuesta', { error: err.message || 'Error al registrar usuario' })
      } else {
        event.reply('registro-respuesta', { success: true, usuario })
      }
    })
  })

  // Manejador IPC para iniciar sesión
  ipcMain.on('iniciar-sesion', (event, { correo, password }) => {
    iniciarSesion(correo, password, (err, usuario) => {
      if (err) {
        event.reply('login-respuesta', { error: err.message })
      } else {
        event.reply('login-respuesta', { success: true, usuario })
      }
    })
  })

  ipcMain.on('obtener-chats-usuario', (event, usuarioId) => {
    obtenerChatsUsuario(usuarioId, (err, chats) => {
      if (err) {
        event.reply('chats-respuesta', { error: err.message })
      } else {
        event.reply('chats-respuesta', { success: true, chats })
      }
    })
  })

  ipcMain.on('obtener-mensajes-chat', (event, chatId) => {
    obtenerMensajesChat(chatId, (err, mensajes) => {
      if (err) {
        event.reply('mensajes-respuesta', { error: err.message })
      } else {
        event.reply('mensajes-respuesta', { success: true, mensajes })
      }
    })
  })

  ipcMain.on('enviar-mensaje', (event, mensaje) => {
    enviarMensaje(mensaje, (err, nuevoMensaje) => {
      if (err) {
        event.reply('mensaje-enviado-respuesta', { error: err.message })
      } else {
        event.reply('mensaje-enviado-respuesta', { success: true, mensaje: nuevoMensaje })
      }
    })
  })

  ipcMain.on('cerrar-chat', (event, chatId) => {
    cerrarChat(chatId, (err) => {
      if (err) {
        event.reply('chat-cerrado-respuesta', { error: err.message })
      } else {
        event.reply('chat-cerrado-respuesta', { success: true })
      }
    })
  })

  ipcMain.on('obtener-usuarios', (event) => {
    obtenerUsuarios((err, usuarios) => {
      if (err) {
        event.reply('usuarios-respuesta', { error: err.message })
      } else {
        event.reply('usuarios-respuesta', { success: true, usuarios })
      }
    })
  })

  ipcMain.on('crear-chat', (event, chat) => {
    crearChat(chat, (err, nuevoChat) => {
      if (err) {
        event.reply('chat-creado-respuesta', { error: err.message })
      } else {
        event.reply('chat-creado-respuesta', { success: true, chat: nuevoChat })
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
