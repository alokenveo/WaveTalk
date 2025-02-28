// Home.jsx
import waveTalkLogo from './assets/logo_waveTalk.png'
import './assets/Home.css'
import Chat from './components/Chat'
import { useState, useEffect } from 'react'
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
  const [ws, setWs] = useState(null) // Estado para el WebSocket

  // Home.jsx
  useEffect(() => {
    if (!usuario) return

    // Cargar chats iniciales
    window.electron.send('obtener-chats-usuario', usuario.id)
    window.electron.once('chats-respuesta', (event, response) => {
      if (response.error) {
        console.error(response.error)
      } else {
        setChats(response.chats)
        setFilteredChats(response.chats)
      }
    })

    // Conectar al WebSocket
    let websocket
    try {
      websocket = window.electron.connectWebSocket(usuario.id, (eventType, data) => {
        if (eventType === 'nuevo-chat') {
          setChats((prevChats) => [...prevChats, data])
          setFilteredChats((prevChats) => [...prevChats, data])
        }
        if (eventType === 'nuevo-mensaje' && !selectedChat) {
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
  }, [usuario])

  const handleChatSelect = (chat) => {
    setSelectedChat(chat)
  }

  const handleLogout = () => {
    if (ws) ws.close()
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
