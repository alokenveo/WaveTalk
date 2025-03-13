import waveTalkLogo from './assets/logo_waveTalk.png'
import profileLogo from '../../../resources/icon.png?assets'
import './assets/Home.css'
import Chat from './components/Chat'
import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import NuevoChatModal from './components/NuevoChatModal'

function Home() {
  const [selectedChat, setSelectedChat] = useState(null)
  const [showSettingsMenu, setShowSettingsMenu] = useState(false)
  const [chats, setChats] = useState([])
  const [filteredChats, setFilteredChats] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [showNuevoChatModal, setShowNuevoChatModal] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const usuario = location.state?.usuario
  const wsRef = useRef(null)

  useEffect(() => {
    if (!usuario) {
      navigate('/login')
      return
    }

    // Cargar chats iniciales
    window.electron.send('obtener-chats-usuario', usuario.id)
    window.electron.once('chats-respuesta', (event, response) => {
      if (response.error) {
        console.error('Error al obtener chats:', response.error)
      } else {
        console.log('Chats iniciales cargados:', response.chats)
        const sortedChats = response.chats.sort((a, b) => {
          const dateA = a.fecha_ultimo_mensaje || a.fecha_creacion || '1970-01-01'
          const dateB = b.fecha_ultimo_mensaje || b.fecha_creacion || '1970-01-01'
          return new Date(dateB) - new Date(dateA)
        })
        setChats(sortedChats)
        setFilteredChats(sortedChats)
      }
    })

    // Conectar al WebSocket
    try {
      console.log('Suscribiendo a WebSocket para usuario:', usuario.id)
      wsRef.current = window.electron.connectWebSocket(usuario.id, (eventType, data) => {
        console.log('Evento recibido en WebSocket (Home.jsx):', eventType, data)
        switch (eventType) {
          case 'nuevo-chat':
            setChats((prevChats) => {
              // Evitar duplicados
              if (prevChats.some((chat) => chat.id === data.id)) return prevChats
              const updatedChats = [...prevChats, data]
              return updatedChats.sort((a, b) => {
                const dateA = a.fecha_ultimo_mensaje || a.fecha_creacion || '1970-01-01'
                const dateB = b.fecha_ultimo_mensaje || b.fecha_creacion || '1970-01-01'
                return new Date(dateB) - new Date(dateA)
              })
            })
            setFilteredChats((prevChats) => {
              if (prevChats.some((chat) => chat.id === data.id)) return prevChats
              const updatedChats = [...prevChats, data]
              return updatedChats.sort((a, b) => {
                const dateA = a.fecha_ultimo_mensaje || a.fecha_creacion || '1970-01-01'
                const dateB = b.fecha_ultimo_mensaje || b.fecha_creacion || '1970-01-01'
                return new Date(dateB) - new Date(dateA)
              })
            })
            break
          case 'nuevo-mensaje':
            setChats((prevChats) => {
              const updatedChats = prevChats.map((chat) =>
                chat.id === data.chat_id
                  ? { ...chat, ultimoMensaje: data.mensaje, fecha_ultimo_mensaje: data.fecha }
                  : chat
              )
              return updatedChats.sort((a, b) => {
                const dateA = a.fecha_ultimo_mensaje || a.fecha_creacion || '1970-01-01'
                const dateB = b.fecha_ultimo_mensaje || b.fecha_creacion || '1970-01-01'
                return new Date(dateB) - new Date(dateA)
              })
            })
            setFilteredChats((prevChats) => {
              const updatedChats = prevChats.map((chat) =>
                chat.id === data.chat_id
                  ? { ...chat, ultimoMensaje: data.mensaje, fecha_ultimo_mensaje: data.fecha }
                  : chat
              )
              return updatedChats.sort((a, b) => {
                const dateA = a.fecha_ultimo_mensaje || a.fecha_creacion || '1970-01-01'
                const dateB = b.fecha_ultimo_mensaje || b.fecha_creacion || '1970-01-01'
                return new Date(dateB) - new Date(dateA)
              })
            })
            break
          case 'tema-cambiado':
            setChats((prevChats) =>
              prevChats.map((chat) =>
                chat.id === data.chat_id ? { ...chat, tema: data.tema } : chat
              )
            )
            setFilteredChats((prevChats) =>
              prevChats.map((chat) =>
                chat.id === data.chat_id ? { ...chat, tema: data.tema } : chat
              )
            )
            break
          case 'chat-estado-cambiado':
            setChats((prevChats) =>
              prevChats.map((chat) =>
                chat.id === data.chat_id
                  ? { ...chat, estado: data.estado, cerradoPor: data.cerradoPor }
                  : chat
              )
            )
            setFilteredChats((prevChats) =>
              prevChats.map((chat) =>
                chat.id === data.chat_id
                  ? { ...chat, estado: data.estado, cerradoPor: data.cerradoPor }
                  : chat
              )
            )
            break
          default:
            console.log('Evento no manejado:', eventType)
        }
      })
    } catch (error) {
      console.error('Error al suscribirse a WebSocket en Home.jsx:', error)
    }

    return () => {
      if (wsRef.current && typeof wsRef.current.close === 'function') {
        console.log('Desuscribiendo WebSocket en Home.jsx')
        wsRef.current.close()
      }
    }
  }, [usuario, navigate])

  const handleChatSelect = (chat) => {
    setSelectedChat(chat)
  }

  const handleLogout = () => {
    if (wsRef.current && typeof wsRef.current.close === 'function') {
      wsRef.current.close()
    }
    navigate('/login')
  }

  const handleSearch = (e) => {
    const term = e.target.value.toLowerCase()
    setSearchTerm(term)
    const filtered = chats.filter(
      (chat) =>
        chat.interlocutor.toLowerCase().includes(term) ||
        (chat.ultimoMensaje && chat.ultimo_mensaje.toLowerCase().includes(term))
    )
    setFilteredChats(filtered)
  }

  const handleNuevoChat = () => {
    setShowSettingsMenu(false)
    setShowNuevoChatModal(true)
  }

  return (
    <div id="app">
      <div id="barra">
        <img src={waveTalkLogo} alt="Logo WaveTalk" className="logo" />
        <div
          className="settings-container"
          onMouseEnter={() => setShowSettingsMenu(true)}
          onMouseLeave={() => setShowSettingsMenu(false)}
        >
          <button id="settings">⚙️</button>
          <div className={`settings-menu ${showSettingsMenu ? 'show' : ''}`}>
            <button id="nuevo-chat" onClick={handleNuevoChat}>
              Nuevo chat
            </button>
            <button id="logout" onClick={handleLogout}>
              Cerrar sesión
            </button>
          </div>
        </div>
      </div>

      <div id="mensajes">
        <div>
          <h3 id="nombre-usuario">{usuario?.nombre || 'Usuario'}</h3>
        </div>
        <div className="buscador">
          <input
            type="text"
            placeholder="Buscar chats..."
            value={searchTerm}
            onChange={handleSearch}
          />
        </div>
        <div className="lista-chats">
          {filteredChats.length > 0 ? (
            filteredChats.map((chat) => (
              <div
                key={chat.id}
                className={`chat-item ${selectedChat?.id === chat.id ? 'selected' : ''}`}
                onClick={() => handleChatSelect(chat)}
              >
                <img src={profileLogo} alt="Perfil" className="profile-pic" />
                <div className="chat-info">
                  <span className="interlocutor">{chat.interlocutor}</span>
                  <span className="last-message">{chat.ultimoMensaje || 'Sin mensajes'}</span>
                </div>
              </div>
            ))
          ) : (
            <p>No se encontraron chats</p>
          )}
        </div>
      </div>

      <div id="trabajo">
        {selectedChat ? (
          <Chat chat={selectedChat} usuario={usuario} onDeselect={() => setSelectedChat(null)} />
        ) : (
          <div className="no-chat">
            <img src={waveTalkLogo} alt="Logo WaveTalk" className="logo-trabajo" />
          </div>
        )}
      </div>

      {showNuevoChatModal && (
        <NuevoChatModal
          usuario={usuario}
          onClose={() => setShowNuevoChatModal(false)}
          onChatSelect={handleChatSelect}
        />
      )}
    </div>
  )
}

export default Home
