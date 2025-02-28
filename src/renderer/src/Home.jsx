// Home.jsx
import waveTalkLogo from './assets/logo_waveTalk.png'
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
    if (!usuario) return

    // Cargar chats iniciales
    window.electron.send('obtener-chats-usuario', usuario.id)
    window.electron.once('chats-respuesta', (event, response) => {
      if (response.error) {
        console.error('Error al obtener chats:', response.error)
      } else {
        console.log('Chats iniciales cargados:', response.chats)
        setChats(response.chats)
        setFilteredChats(response.chats)
      }
    })

    // Conectar al WebSocket
    try {
      console.log('Suscribiendo a WebSocket para usuario:', usuario.id)
      wsRef.current = window.electron.connectWebSocket(usuario.id, (eventType, data) => {
        console.log('Evento recibido en WebSocket (Home.jsx):', eventType, data)
        if (eventType === 'nuevo-chat') {
          console.log('Nuevo chat recibido:', data)
          setChats((prevChats) => [...prevChats, data])
          setFilteredChats((prevChats) => [...prevChats, data])
        }
        if (eventType === 'nuevo-mensaje') {
          // Quitamos !selectedChat
          console.log('Nuevo mensaje recibido:', data)
          setChats((prevChats) =>
            prevChats.map((chat) =>
              chat.id === data.chat_id ? { ...chat, ultimoMensaje: data.mensaje } : chat
            )
          )
          setFilteredChats((prevChats) =>
            prevChats.map((chat) =>
              chat.id === data.chat_id ? { ...chat, ultimoMensaje: data.mensaje } : chat
            )
          )
        }
        if (eventType === 'tema-cambiado') {
          console.log('Tema cambiado recibido:', data)
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
  }, [usuario])

  const handleChatSelect = (chat) => {
    setSelectedChat(chat)
  }

  const handleLogout = () => {
    console.log('Estado de ws antes de cerrar:', wsRef.current)
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
        chat.interlocutor.toLowerCase().includes(term) || chat.tema?.toLowerCase().includes(term)
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
          <h3>{usuario?.nombre || 'Usuario'}</h3>
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
                {chat.interlocutor} - {chat.tema || 'Sin tema'}
              </div>
            ))
          ) : (
            <p>No se encontraron chats</p>
          )}
        </div>
      </div>

      <div id="trabajo">
        {selectedChat ? (
          <Chat chat={selectedChat} usuario={usuario} />
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
