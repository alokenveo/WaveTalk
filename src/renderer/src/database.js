import sqlite3 from 'sqlite3'
import { join } from 'path'
import { app } from 'electron'

const dbPath = join(app.getPath('userData'), 'wavetalk.db')

let databaseLock = Promise.resolve()

async function withDatabaseLock(fn) {
  await databaseLock
  try {
    return await fn()
  } finally {
    databaseLock = Promise.resolve()
  }
}

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error al abrir la base de datos', err)
  } else {
    console.log('Base de datos conectada')

    db.run(
      `CREATE TABLE IF NOT EXISTS usuarios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL,
        correo TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL
      )`,
      (err) => {
        if (err) console.error('Error al crear la tabla', err)
      }
    )

    db.run(
      `CREATE TABLE IF NOT EXISTS chats (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        usuario1_id INTEGER NOT NULL,
        usuario2_id INTEGER NOT NULL,
        tema TEXT CHECK(tema IN ('fútbol', 'amor', 'viajes', 'música', 'cine', 'tecnología', 'naturaleza', 'videojuegos') OR tema IS NULL) DEFAULT NULL,
        fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
        estado TEXT CHECK(estado IN ('activo', 'cerrado')) DEFAULT 'activo',
        FOREIGN KEY (usuario1_id) REFERENCES usuarios(id),
        FOREIGN KEY (usuario2_id) REFERENCES usuarios(id)
      )`,
      (err) => {
        if (err) console.error('Error al crear la tabla de chats', err)
      }
    )

    db.run(
      `CREATE TABLE IF NOT EXISTS mensajes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        chat_id INTEGER NOT NULL,
        usuario_id INTEGER NOT NULL,
        mensaje TEXT NOT NULL,
        leido INTEGER DEFAULT 0,
        fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (chat_id) REFERENCES chats(id),
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
      )`,
      (err) => {
        if (err) console.error('Error al crear la tabla de mensajes', err)
      }
    )
  }
})

export function registrarUsuario(nombre, correo, password, callback) {
  withDatabaseLock(() => {
    return new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO usuarios (nombre, correo, password) VALUES (?, ?, ?)`,
        [nombre, correo, password],
        function (err) {
          if (err) {
            reject(err)
          } else {
            resolve({ id: this.lastID, nombre, correo })
          }
        }
      )
    })
  })
    .then((result) => callback(null, result))
    .catch((err) => callback(err, null))
}

export function iniciarSesion(correo, password, callback) {
  withDatabaseLock(() => {
    return new Promise((resolve, reject) => {
      db.get(
        `SELECT id, nombre, correo FROM usuarios WHERE correo = ? AND password = ?`,
        [correo, password],
        (err, row) => {
          if (err) {
            reject(err)
          } else if (!row) {
            reject(new Error('Correo o contraseña incorrectos'))
          } else {
            resolve(row)
          }
        }
      )
    })
  })
    .then((result) => callback(null, result))
    .catch((err) => callback(err, null))
}

export function obtenerChatsUsuario(usuarioId, callback) {
  withDatabaseLock(() => {
    return new Promise((resolve, reject) => {
      db.all(
        `
        SELECT 
          c.id, 
          c.tema, 
          c.fecha_creacion, 
          c.estado,
          c.usuario1_id,  -- Añadido
          c.usuario2_id,  -- Añadido
          CASE 
            WHEN c.usuario1_id = ? THEN u2.nombre 
            ELSE u1.nombre 
          END AS interlocutor
        FROM chats c
        LEFT JOIN usuarios u1 ON c.usuario1_id = u1.id
        LEFT JOIN usuarios u2 ON c.usuario2_id = u2.id
        WHERE c.usuario1_id = ? OR c.usuario2_id = ?
        `,
        [usuarioId, usuarioId, usuarioId],
        (err, rows) => {
          if (err) {
            reject(err)
          } else {
            resolve(rows)
          }
        }
      )
    })
  })
    .then((result) => callback(null, result))
    .catch((err) => callback(err, null))
}

export function obtenerMensajesChat(chatId, callback) {
  withDatabaseLock(() => {
    return new Promise((resolve, reject) => {
      db.all(
        `SELECT id, chat_id, usuario_id, mensaje, fecha, leido FROM mensajes WHERE chat_id = ? ORDER BY fecha ASC`,
        [chatId],
        (err, rows) => {
          if (err) {
            reject(err)
          } else {
            resolve(rows)
          }
        }
      )
    })
  })
    .then((result) => callback(null, result))
    .catch((err) => callback(err, null))
}

export function enviarMensaje({ chat_id, usuario_id, mensaje }, callback) {
  withDatabaseLock(() => {
    return new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO mensajes (chat_id, usuario_id, mensaje) VALUES (?, ?, ?)`,
        [chat_id, usuario_id, mensaje],
        function (err) {
          if (err) {
            reject(err)
          } else {
            resolve({ id: this.lastID, chat_id, usuario_id, mensaje, fecha: new Date() })
          }
        }
      )
    })
  })
    .then((result) => callback(null, result))
    .catch((err) => callback(err, null))
}

export function cerrarChat(chatId, callback) {
  withDatabaseLock(() => {
    return new Promise((resolve, reject) => {
      db.run(`UPDATE chats SET estado = 'cerrado' WHERE id = ?`, [chatId], function (err) {
        if (err) {
          reject(err)
        } else {
          resolve()
        }
      })
    })
  })
    .then(() => callback(null))
    .catch((err) => callback(err))
}

export function obtenerUsuarios(callback) {
  withDatabaseLock(() => {
    return new Promise((resolve, reject) => {
      db.all(`SELECT id, nombre, correo FROM usuarios`, (err, rows) => {
        if (err) {
          reject(err)
        } else {
          resolve(rows)
        }
      })
    })
  })
    .then((result) => callback(null, result))
    .catch((err) => callback(err, null))
}

export function crearChat({ usuario1_id, usuario2_id, tema }, callback) {
  withDatabaseLock(() => {
    return new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO chats (usuario1_id, usuario2_id, tema) VALUES (?, ?, ?)`,
        [usuario1_id, usuario2_id, tema],
        function (err) {
          if (err) {
            reject(err)
          } else {
            resolve({ id: this.lastID, usuario1_id, usuario2_id, tema })
          }
        }
      )
    })
  })
    .then((result) => callback(null, result))
    .catch((err) => callback(err, null))
}

export function obtenerUsuarioPorId(usuarioId, callback) {
  withDatabaseLock(() => {
    return new Promise((resolve, reject) => {
      db.get(`SELECT id, nombre, correo FROM usuarios WHERE id = ?`, [usuarioId], (err, row) => {
        if (err) {
          reject(err)
        } else if (!row) {
          reject(new Error(`Usuario con ID ${usuarioId} no encontrado`))
        } else {
          resolve(row)
        }
      })
    })
  })
    .then((result) => callback(null, result))
    .catch((err) => callback(err, null))
}

export { db }

export default db
