// Chat.jsx
import { useState, useEffect } from 'react'
import PropTypes from 'prop-types'
import './Chat.css'
import fondoChat from '../../../../resources/fondos/fondo.jpg?assets'

function Chat({ chat, usuario }) {
  const [mensajes, setMensajes] = useState([])
  const [mensajeInput, setMensajeInput] = useState('')
  const [showOptions, setShowOptions] = useState(false)
  const [ws, setWs] = useState(null)
  const [showTopicModal, setShowTopicModal] = useState(false)
  const [selectedTopic, setSelectedTopic] = useState(chat.tema || null)

  // Chat.jsx
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
    let websocket
    try {
      websocket = window.electron.connectWebSocket(usuario.id, (eventType, data) => {
        if (eventType === 'nuevo-mensaje' && data.chat_id === chat.id) {
          setMensajes((prevMensajes) => [...prevMensajes, data])
        }
        if (eventType === 'tema-cambiado' && data.chat_id === chat.id) {
          chat.tema = data.tema
        }
      })
      setWs(websocket)
    } catch (error) {
      console.error('Error al conectar WebSocket:', error)
    }

    // Limpiar WebSocket al desmontar
    return () => {
      if (websocket && typeof websocket.close === 'function') {
        websocket.close()
      }
    }
  }, [chat.id, usuario.id])

  const handleSendMessage = (e) => {
    e.preventDefault()
    if (!mensajeInput.trim()) return

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
        chat.tema = selectedTopic // Actualizar el tema en el objeto chat
        setShowTopicModal(false) // Cerrar el modal
      }
    })
  }

  const handleBlock = () => {
    window.electron.send('cerrar-chat', chat.id)
    window.electron.once('chat-cerrado-respuesta', (event, response) => {
      if (response.error) {
        console.error(response.error)
      } else {
        console.log('Chat cerrado')
      }
    })
    setShowOptions(false)
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

  return (
    <div className="chat-container">
      <div className="chat-header">
        <button className="back-btn" onClick={() => window.history.back()}>
          ←
        </button>
        <h3>{chat.interlocutor}</h3>
        <div className="options-container">
          <button className="options-btn" onClick={() => setShowOptions(!showOptions)}>
            ⋮
          </button>
          {showOptions && (
            <div className="options-menu">
              <button onClick={handleChangeTopic}>Cambiar tema</button>
              <button onClick={handleBlock}>Bloquear</button>
            </div>
          )}
        </div>
      </div>

      <div className="messages-area" style={{ backgroundImage: `url(${fondoChat})` }}>
        {mensajes.map((msg) => (
          <div
            key={msg.id}
            className={`message ${msg.usuario_id === usuario.id ? 'sent' : 'received'}`}
          >
            <div className="message-bubble">{msg.mensaje}</div>
          </div>
        ))}
      </div>

      <form className="input-bar" onSubmit={handleSendMessage}>
        <button type="button" className="more-btn">
          +
        </button>
        <input
          type="text"
          value={mensajeInput}
          onChange={(e) => setMensajeInput(e.target.value)}
          placeholder="Escribe un mensaje..."
        />
        <button type="submit" className="send-btn">
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
    usuario2_id: PropTypes.number.isRequired
  }).isRequired,
  usuario: PropTypes.shape({
    id: PropTypes.number.isRequired,
    nombre: PropTypes.string.isRequired,
    correo: PropTypes.string.isRequired
  }).isRequired
}

export default Chat
