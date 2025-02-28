import { useState, useEffect } from 'react'
import PropTypes from 'prop-types'
import './Chat.css'

function Chat({ chat, usuario }) {
  const [mensajes, setMensajes] = useState([])
  const [mensajeInput, setMensajeInput] = useState('')
  const [showOptions, setShowOptions] = useState(false)

  useEffect(() => {
    window.electron.send('obtener-mensajes-chat', chat.id)
    window.electron.once('mensajes-respuesta', (event, response) => {
      if (response.error) {
        console.error(response.error)
      } else {
        setMensajes(response.mensajes)
      }
    })
  }, [chat.id])

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
        setMensajes([...mensajes, response.mensaje])
        setMensajeInput('')
      }
    })
  }

  const handleChangeTopic = () => {
    console.log('Cambiar tema - Implementar más tarde')
    setShowOptions(false)
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

      <div className="messages-area">
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
    </div>
  )
}

Chat.propTypes = {
  chat: PropTypes.shape({
    id: PropTypes.number.isRequired,
    interlocutor: PropTypes.string.isRequired,
    tema: PropTypes.string, // Cambiado de isRequired a opcional
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
