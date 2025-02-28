import waveTalkLogo from './assets/logo_waveTalk.png'
import './assets/Home.css'
import Chat from './components/Chat'
import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import NuevoChatModal from './components/NuevoChatModal' // Nuevo componente

function Home() {
  const [selectedChat, setSelectedChat] = useState(null)
  const [showSettingsMenu, setShowSettingsMenu] = useState(false)
  const [chats, setChats] = useState([])
  const [filteredChats, setFilteredChats] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [showNuevoChatModal, setShowNuevoChatModal] = useState(false) // Estado para el modal
  const navigate = useNavigate()
  const location = useLocation()
  const usuario = location.state?.usuario

  useEffect(() => {
    console.log('Cargando mensajes...')
    if (usuario) {
      window.electron.send('obtener-chats-usuario', usuario.id)
      window.electron.once('chats-respuesta', (event, response) => {
        if (response.error) {
          console.error(response.error)
        } else {
          setChats(response.chats)
          setFilteredChats(response.chats)
        }
      })
    }
  }, [usuario])

  const handleChatSelect = (chat) => {
    setSelectedChat(chat)
  }

  const handleLogout = () => {
    navigate('/login')
  }

  const handleSearch = (e) => {
    const term = e.target.value.toLowerCase()
    setSearchTerm(term)
    const filtered = chats.filter(
      (chat) =>
        chat.interlocutor.toLowerCase().includes(term) || chat.tema.toLowerCase().includes(term)
    )
    setFilteredChats(filtered)
  }

  const handleNuevoChat = () => {
    setShowSettingsMenu(false) // Cerrar el menú de settings
    setShowNuevoChatModal(true) // Abrir el modal
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

      {/* Modal para nuevo chat */}
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
