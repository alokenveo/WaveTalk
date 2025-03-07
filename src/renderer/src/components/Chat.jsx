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
import Juego from './Juego'

function Chat({ chat, usuario, onDeselect }) {
  const [mensajes, setMensajes] = useState([])
  const [mensajeInput, setMensajeInput] = useState('')
  const [showOptions, setShowOptions] = useState(false)
  const [showTopicModal, setShowTopicModal] = useState(false)
  const [selectedTopic, setSelectedTopic] = useState(chat.tema || null)
  const wsRef = useRef(null)
  const messagesEndRef = useRef(null)
  const [showMoreOptions, setShowMoreOptions] = useState(false)
  const [showInviteConfirm, setShowInviteConfirm] = useState(false)
  const [showInviteReceived, setShowInviteReceived] = useState(false)
  const [timer, setTimer] = useState(20)
  const [gameActive, setGameActive] = useState(false)
  const timerRef = useRef(null)

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
    window.electron.send('obtener-mensajes-chat', chat.id)
    window.electron.once('mensajes-respuesta', (event, response) => {
      if (response.error) {
        console.error(response.error)
      } else {
        setMensajes(response.mensajes)
      }
    })

    try {
      wsRef.current = window.electron.connectWebSocket(usuario.id, (eventType, data) => {
        if (eventType === 'nuevo-mensaje' && data.chat_id === chat.id) {
          setMensajes((prevMensajes) => {
            if (prevMensajes.some((msg) => msg.id === data.id)) return prevMensajes
            return [...prevMensajes, data]
          })
        }
        if (eventType === 'tema-cambiado' && data.chat_id === chat.id) {
          chat.tema = data.tema
          setSelectedTopic(data.tema)
        }
        if (eventType === 'chat-estado-cambiado' && data.chat_id === chat.id) {
          chat.estado = data.estado
          chat.cerradoPor = data.cerradoPor
        }
        if (eventType === 'game-invite' && data.chat_id === chat.id && data.to === usuario.id) {
          setShowInviteReceived(true)
          setTimer(20)
          timerRef.current = setInterval(() => {
            setTimer((prev) => {
              if (prev <= 1) {
                clearInterval(timerRef.current)
                handleInviteReject()
                return 0
              }
              return prev - 1
            })
          }, 1000)
        }
        if (eventType === 'game-invite-response' && data.chat_id === chat.id) {
          if (data.accepted) {
            setGameActive(true)
          } else {
            alert(`Invitación no aceptada por ${chat.interlocutor}`)
          }
          setShowInviteConfirm(false)
        }
        if (eventType === 'game-ended' && data.chat_id === chat.id) {
          setGameActive(false)
          if (data.winner === usuario.id) {
            // Solo el ganador envía el mensaje
            const winnerName = usuario.nombre
            const message = {
              chat_id: chat.id,
              usuario_id: usuario.id,
              mensaje: `${winnerName} ha ganado la partida`,
              color: 'green'
            }
            window.electron.send('enviar-mensaje', message)
          }
        }
      })
    } catch (error) {
      console.error('Error al conectar WebSocket:', error)
    }

    return () => {
      if (wsRef.current && typeof wsRef.current.close === 'function') {
        wsRef.current.close()
      }
    }
  }, [chat.id, usuario.id])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensajes])

  const handleSendMessage = (e) => {
    e.preventDefault()
    if (!mensajeInput.trim() || chat.estado === 'cerrado') return

    const nuevoMensaje = { chat_id: chat.id, usuario_id: usuario.id, mensaje: mensajeInput }
    window.electron.send('enviar-mensaje', nuevoMensaje)
    window.electron.once('mensaje-enviado-respuesta', (event, response) => {
      if (response.error) console.error(response.error)
      else setMensajeInput('')
    })
  }

  const handleInvite = async () => {
    setShowMoreOptions(false)
    const interlocutorId = chat.usuario1_id === usuario.id ? chat.usuario2_id : chat.usuario1_id
    console.log('Usuario:', usuario.id)
    try {
      const response = await window.electron.sendWebSocketMessage(usuario.id, 'check-connection', {
        userId: interlocutorId
      })
      if (!response.connected) {
        alert(
          `Sentimos informar de que el usuario ${chat.interlocutor} no se encuentra disponible en este momento`
        )
      } else {
        setShowInviteConfirm(true)
      }
    } catch (error) {
      console.error('Error checking user connection:', error)
      alert(
        `Sentimos informar de que el usuario ${chat.interlocutor} no se encuentra disponible en este momento`
      )
    }
  }

  const handleInviteConfirm = () => {
    setShowInviteConfirm(false)
    const interlocutorId = chat.usuario1_id === usuario.id ? chat.usuario2_id : chat.usuario1_id
    console.log(`Enviando invitación desde ${usuario.id} a ${interlocutorId} para chat ${chat.id}`)
    window.electron.send('send-game-invite', {
      chatId: chat.id,
      from: usuario.id,
      to: interlocutorId
    })
  }

  const handleInviteReject = () => {
    setShowInviteReceived(false)
    window.electron.send('respond-game-invite', {
      chatId: chat.id,
      from: usuario.id,
      accepted: false
    })
    alert('Has rechazado unirte a la partida')
    clearInterval(timerRef.current)
  }

  const handleInviteAccept = () => {
    setShowInviteReceived(false)
    window.electron.send('respond-game-invite', {
      chatId: chat.id,
      from: usuario.id,
      accepted: true
    })
    setGameActive(true)
    clearInterval(timerRef.current)
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

  const isBlocked = chat.estado === 'cerrado'
  const chatBackground = fondosPorTema[chat.tema] || fondoDefault

  return (
    <div className="chat-container">
      <div className="chat-header">
        <button className="back-btn" onClick={onDeselect}>
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
              <button
                onClick={() => {
                  setShowOptions(false)
                  setShowTopicModal(true)
                }}
              >
                Cambiar tema
              </button>
              {isBlocked ? (
                chat.cerradoPor === usuario.id ? (
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
            <div className="message-bubble" style={{ color: msg.color || 'inherit' }}>
              {msg.mensaje}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <form className="input-bar" onSubmit={handleSendMessage}>
        <div className="more-container">
          <button
            type="button"
            className="more-btn"
            disabled={isBlocked}
            onClick={() => setShowMoreOptions(!showMoreOptions)}
          >
            +
          </button>
          {showMoreOptions && (
            <div className="more-menu">
              <button onClick={handleInvite}>Retar a {chat.interlocutor}</button>
            </div>
          )}
        </div>
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
                />{' '}
                Sin tema
              </label>
              {[
                'fútbol',
                'amor',
                'viajes',
                'música',
                'cine',
                'tecnología',
                'naturaleza',
                'videojuegos'
              ].map((tema) => (
                <label key={tema}>
                  <input
                    type="radio"
                    value={tema}
                    checked={selectedTopic === tema}
                    onChange={handleTopicSelect}
                  />{' '}
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

      {showInviteConfirm && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Confirmar Invitación</h2>
            <p>¿Quieres invitar a {chat.interlocutor} a una partida de Tres en Raya?</p>
            <div className="modal-buttons">
              <button onClick={handleInviteConfirm}>Confirmar</button>
              <button onClick={() => setShowInviteConfirm(false)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {showInviteReceived && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Invitación Recibida</h2>
            <p>{chat.interlocutor} te invita a unirte a una partida de Tres en Raya</p>
            <p>Tiempo restante: {timer} segundos</p>
            <div className="modal-buttons">
              <button onClick={handleInviteAccept}>Aceptar</button>
              <button onClick={handleInviteReject}>Rechazar</button>
            </div>
          </div>
        </div>
      )}

      {gameActive && (
        <Juego
          chat={chat}
          usuario={usuario}
          onGameEnd={() => setGameActive(false)}
          player1Name={chat.usuario1_id === usuario.id ? usuario.nombre : chat.interlocutor}
          player2Name={chat.usuario2_id === usuario.id ? usuario.nombre : chat.interlocutor}
        />
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
