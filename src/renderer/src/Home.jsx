import waveTalkLogo from './assets/logo_waveTalk.png'
import './assets/Home.css'
import Chat from './components/Chat'
import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'

function Home() {
  const [selectedChat, setSelectedChat] = useState(null)
  const [showSettingsMenu, setShowSettingsMenu] = useState(false)
  const [chats, setChats] = useState([])
  const navigate = useNavigate()
  const location = useLocation()
  const usuario = location.state?.usuario // Obtener el usuario del estado de navegación

  useEffect(() => {
    console.log('Cargando mensajes...')
    if (usuario) {
      window.electron.send('obtener-chats-usuario', usuario.id)
      window.electron.once('chats-respuesta', (event, response) => {
        if (response.error) {
          console.error(response.error)
        } else {
          setChats(response.chats)
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

  return (
    <div id="app">
      {/* Barra lateral (15% del ancho) */}
      <div id="barra">
        <img src={waveTalkLogo} alt="Logo WaveTalk" className="logo" />
        <div
          className="settings-container"
          onMouseEnter={() => setShowSettingsMenu(true)}
          onMouseLeave={() => setShowSettingsMenu(false)}
        >
          <button id="settings">⚙️</button>
          <div className={`settings-menu ${showSettingsMenu ? 'show' : ''}`}>
            <button id="logout" onClick={handleLogout}>
              Cerrar sesión
            </button>
          </div>
        </div>
      </div>

      {/* Sección de mensajes (35% del ancho) */}
      <div id="mensajes">
        <div>
          <h3>{usuario?.nombre || 'Usuario'}</h3>
        </div>
        <div className="buscador">
          <input type="text" placeholder="Buscar chats..." />
        </div>
        <div className="lista-chats">
          {chats.length > 0 ? (
            chats.map((chat) => (
              <div
                key={chat.id}
                className={`chat-item ${selectedChat?.id === chat.id ? 'selected' : ''}`}
                onClick={() => handleChatSelect(chat)}
              >
                {chat.interlocutor} - {chat.tema}
              </div>
            ))
          ) : (
            <p>No tienes chats aún</p>
          )}
        </div>
      </div>

      {/* Sección de trabajo (50% del ancho) */}
      <div id="trabajo">
        {selectedChat ? (
          <Chat chat={selectedChat} />
        ) : (
          <div className="no-chat">
            <img src={waveTalkLogo} alt="Logo WaveTalk" className="logo-trabajo" />
          </div>
        )}
      </div>
    </div>
  )
}

export default Home
