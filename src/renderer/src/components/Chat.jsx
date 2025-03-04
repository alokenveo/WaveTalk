import { useState, useEffect, useRef } from 'react'
import PropTypes from 'prop-types'
import './Chat.css'
import fondoDefault from '../../../../resources/fondos/fondo.jpg?assets'
import fondoAmor from '../../../../resources/fondos/fondo_amor.jpg?assets'
import fondoCine from '../../../../resources/fondos/fondo_cine.jpg?assets'
import fondoFutbol from '../../../../resources/fondos/fondo_futbol.jpg?assets'
import fondoMusica from '../../../../resources/fondos/fondo_musica.jpg?assets'
import fondoNaturaleza from '../../../../resources/fondos/fondo_naturaleza.jpg?assets'
import fondoTecnologia from '../../../../resources/fondos/fondo_tecnologia.jpg?assets'
import fondoViajes from '../../../../resources/fondos/fondo_viajes.jpg?assets'
import fondoVideojuegos from '../../../../resources/fondos/fondo_videojuegos.jpg?assets'
import profileLogo from '../../../../resources/icon.png?assets'

function Chat({ chat, usuario, onDeselect }) {
  const [mensajes, setMensajes] = useState([])
  const [mensajeInput, setMensajeInput] = useState('')
  const [showOptions, setShowOptions] = useState(false)
  const [showTopicModal, setShowTopicModal] = useState(false)
  const [selectedTopic, setSelectedTopic] = useState(chat.tema || null)
  const wsRef = useRef(null)
  const messagesEndRef = useRef(null)

  const fondosPorTema = {
    fútbol: fondoFutbol,
    amor: fondoAmor,
    viajes: fondoViajes,
    música: fondoMusica,
    cine: fondoCine,
    tecnología: fondoTecnologia,
    naturaleza: fondoNaturaleza,
    videojuegos: fondoVideojuegos,
    null: fondoDefault
  }

  useEffect(() => {
    // Cargar mensajes iniciales
    window.electron.send('obtener-mensajes-chat', chat.id)
    window.electron.once('mensajes-respuesta', (event, response) => {
      if (response.error) {
        console.error(response.error)
      } else {
        setMensajes(response.mensajes)
      }
    })

    // Conectar al WebSocket
    try {
      console.log('Suscribiendo a WebSocket en Chat.jsx para usuario:', usuario.id)
      wsRef.current = window.electron.connectWebSocket(usuario.id, (eventType, data) => {
        console.log('Evento recibido en WebSocket (Chat.jsx):', eventType, data)
        if (eventType === 'nuevo-mensaje' && data.chat_id === chat.id) {
          setMensajes((prevMensajes) => {
            if (prevMensajes.some((msg) => msg.id === data.id)) return prevMensajes
            return [...prevMensajes, data]
          })
        }
        if (eventType === 'tema-cambiado' && data.chat_id === chat.id) {
          chat.tema = data.tema
          setSelectedTopic(data.tema) // Actualizar el tema seleccionado localmente
        }
        if (eventType === 'chat-estado-cambiado' && data.chat_id === chat.id) {
          chat.estado = data.estado
          chat.cerradoPor = data.cerradoPor
        }
      })
    } catch (error) {
      console.error('Error al suscribirse a WebSocket en Chat.jsx:', error)
    }

    return () => {
      if (wsRef.current && typeof wsRef.current.close === 'function') {
        console.log('Desuscribiendo WebSocket en Chat.jsx')
        wsRef.current.close()
      }
    }
  }, [chat.id, usuario.id])

  // Auto-scroll al final de los mensajes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensajes])

  const handleSendMessage = (e) => {
    e.preventDefault()
    if (!mensajeInput.trim() || chat.estado === 'cerrado') return

    const nuevoMensaje = {
      chat_id: chat.id,
      usuario_id: usuario.id,
      mensaje: mensajeInput
    }

    window.electron.send('enviar-mensaje', nuevoMensaje)
    window.electron.once('mensaje-enviado-respuesta', (event, response) => {
      if (response.error) {
        console.error(response.error)
      } else {
        setMensajeInput('')
        // El mensaje ya se añadirá vía WebSocket, no necesitamos añadirlo manualmente aquí
      }
    })
  }

  const handleChangeTopic = () => {
    setShowOptions(false)
    setShowTopicModal(true)
  }

  const handleTopicSelect = (e) => {
    const value = e.target.value === 'null' ? null : e.target.value
    setSelectedTopic(value)
  }

  const handleTopicSubmit = () => {
    window.electron.send('cambiar-tema-chat', { chatId: chat.id, tema: selectedTopic })
    window.electron.once('tema-cambiado-respuesta', (event, response) => {
      if (response.error) {
        console.error(response.error)
      } else {
        setShowTopicModal(false)
        // La actualización del tema se manejará vía WebSocket
      }
    })
  }

  const handleBlock = () => {
    window.electron.send('cerrar-chat', { chatId: chat.id, usuarioId: usuario.id })
    window.electron.once('chat-cerrado-respuesta', (event, response) => {
      if (response.error) {
        console.error(response.error)
      } else {
        setShowOptions(false)
      }
    })
  }

  const handleUnblock = () => {
    window.electron.send('abrir-chat', { chatId: chat.id, usuarioId: usuario.id })
    window.electron.once('chat-abierto-respuesta', (event, response) => {
      if (response.error) {
        console.error(response.error)
      } else {
        setShowOptions(false)
      }
    })
  }

  const handleBack = () => {
    onDeselect()
  }

  const temasDisponibles = [
    'fútbol',
    'amor',
    'viajes',
    'música',
    'cine',
    'tecnología',
    'naturaleza',
    'videojuegos'
  ]

  const isBlocked = chat.estado === 'cerrado'
  const canUnblock = isBlocked && chat.cerradoPor === usuario.id
  const chatBackground = fondosPorTema[chat.tema] || fondoDefault

  return (
    <div className="chat-container">
      <div className="chat-header">
        <button className="back-btn" onClick={handleBack}>
          ←
        </button>
        <img src={profileLogo} alt="Perfil" className="profile-pic" />
        <h3>{chat.interlocutor}</h3>
        <div className="options-container">
          <button className="options-btn" onClick={() => setShowOptions(!showOptions)}>
            ⋮
          </button>
          {showOptions && (
            <div className="options-menu">
              <button onClick={handleChangeTopic}>Cambiar tema</button>
              {isBlocked ? (
                canUnblock ? (
                  <button onClick={handleUnblock}>Desbloquear</button>
                ) : (
                  <p>Chat bloqueado por otro usuario</p>
                )
              ) : (
                <button onClick={handleBlock}>Bloquear</button>
              )}
            </div>
          )}
        </div>
      </div>

      <div
        className="messages-area chat-background"
        style={{ backgroundImage: `url(${chatBackground})` }}
      >
        {mensajes.map((msg) => (
          <div
            key={msg.id}
            className={`message ${msg.usuario_id === usuario.id ? 'sent' : 'received'}`}
          >
            <div className="message-bubble">{msg.mensaje}</div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <form className="input-bar" onSubmit={handleSendMessage}>
        <button type="button" className="more-btn" disabled={isBlocked}>
          +
        </button>
        <input
          type="text"
          value={mensajeInput}
          onChange={(e) => setMensajeInput(e.target.value)}
          placeholder={isBlocked ? 'Este chat está bloqueado' : 'Escribe un mensaje...'}
          disabled={isBlocked}
        />
        <button type="submit" className="send-btn" disabled={isBlocked}>
          ➤
        </button>
      </form>

      {showTopicModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Cambiar Tema</h2>
            <div className="topic-options">
              <label>
                <input
                  type="radio"
                  value="null"
                  checked={selectedTopic === null}
                  onChange={handleTopicSelect}
                />
                Sin tema
              </label>
              {temasDisponibles.map((tema) => (
                <label key={tema}>
                  <input
                    type="radio"
                    value={tema}
                    checked={selectedTopic === tema}
                    onChange={handleTopicSelect}
                  />
                  {tema.charAt(0).toUpperCase() + tema.slice(1)}
                </label>
              ))}
            </div>
            <div className="modal-buttons">
              <button onClick={handleTopicSubmit}>Aceptar</button>
              <button onClick={() => setShowTopicModal(false)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

Chat.propTypes = {
  chat: PropTypes.shape({
    id: PropTypes.number.isRequired,
    interlocutor: PropTypes.string.isRequired,
    tema: PropTypes.string,
    usuario1_id: PropTypes.number.isRequired,
    usuario2_id: PropTypes.number.isRequired,
    estado: PropTypes.string,
    cerradoPor: PropTypes.number
  }).isRequired,
  usuario: PropTypes.shape({
    id: PropTypes.number.isRequired,
    nombre: PropTypes.string.isRequired,
    correo: PropTypes.string.isRequired
  }).isRequired,
  onDeselect: PropTypes.func.isRequired
}

export default Chat
