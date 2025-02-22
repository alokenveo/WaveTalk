import sqlite3 from 'sqlite3'
import { join } from 'path'
import { app } from 'electron'

const dbPath = join(app.getPath('userData'), 'wavetalk.db')
//const dbPath = join(__dirname, 'wavetalk.db')

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error al abrir la base de datos', err)
  } else {
    console.log('Base de datos conectada')

    //Crear tabla de usuarios
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

    //Crear tabla de chats
    db.run(
      `CREATE TABLE IF NOT EXISTS chats (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        usuario1_id INTEGER NOT NULL,
        usuario2_id INTEGER NOT NULL,
        tema TEXT CHECK(tema IN ('fútbol', 'amor', 'viajes', 'música', 'cine', 'tecnología', 'naturaleza', 'videojuegos')) NOT NULL,
        fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
        estado TEXT CHECK(estado IN ('activo', 'cerrado')) DEFAULT 'activo',
        FOREIGN KEY (usuario1_id) REFERENCES usuarios(id),
        FOREIGN KEY (usuario2_id) REFERENCES usuarios(id)
      )`,
      (err) => {
        if (err) console.error('Error al crear la tabla de chats', err)
      }
    )

    //Crear tabla de mensajes
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
  db.run(
    `INSERT INTO usuarios (nombre, correo, password) VALUES (?, ?, ?)`,
    [nombre, correo, password],
    function (err) {
      if (err) {
        callback(err, null)
      } else {
        callback(null, { id: this.lastID, nombre, correo })
      }
    }
  )
}

export function iniciarSesion(correo, password, callback) {
  db.get(
    `SELECT id, nombre, correo FROM usuarios WHERE correo = ? AND password = ?`,
    [correo, password],
    (err, row) => {
      if (err) {
        callback(err, null)
      } else if (!row) {
        callback(new Error('Correo o contraseña incorrectos'), null)
      } else {
        callback(null, row)
      }
    }
  )
}

export function obtenerChatsUsuario(usuarioId, callback) {
  db.all(
    `
    SELECT 
      c.id, 
      c.tema, 
      c.fecha_creacion, 
      c.estado,
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
        callback(err, null)
      } else {
        callback(null, rows)
      }
    }
  )
}

export default db
