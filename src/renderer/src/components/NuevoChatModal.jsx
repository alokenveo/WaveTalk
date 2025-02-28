import { useState, useEffect } from 'react'
import './NuevoChatModal.css' // CSS para el modal
import PropTypes from 'prop-types'

function NuevoChatModal({ usuario, onClose, onChatSelect }) {
  const [usuarios, setUsuarios] = useState([]) // Lista de todos los usuarios
  const [filteredUsuarios, setFilteredUsuarios] = useState([]) // Usuarios filtrados
  const [searchTerm, setSearchTerm] = useState('') // Término de búsqueda

  // Obtener lista de usuarios al cargar el modal
  useEffect(() => {
    window.electron.send('obtener-usuarios')
    window.electron.once('usuarios-respuesta', (event, response) => {
      if (response.error) {
        console.error(response.error)
      } else {
        // Excluir al usuario actual de la lista
        const filtered = response.usuarios.filter((u) => u.id !== usuario.id)
        setUsuarios(filtered)
        setFilteredUsuarios(filtered)
      }
    })
  }, [usuario.id])

  // Filtrar usuarios por nombre
  const handleSearch = (e) => {
    const term = e.target.value.toLowerCase()
    setSearchTerm(term)
    const filtered = usuarios.filter((u) => u.nombre.toLowerCase().includes(term))
    setFilteredUsuarios(filtered)
  }

  // Crear un nuevo chat
  const handleUsuarioSelect = (interlocutor) => {
    const nuevoChat = {
      usuario1_id: usuario.id,
      usuario2_id: interlocutor.id,
      tema: null
    }

    window.electron.send('crear-chat', nuevoChat)
    window.electron.once('chat-creado-respuesta', (event, response) => {
      if (response.error) {
        console.error(response.error)
      } else {
        const chatCreado = {
          ...response.chat,
          interlocutor: interlocutor.nombre
        }
        onChatSelect(chatCreado) // Seleccionar el nuevo chat
        onClose() // Cerrar el modal
      }
    })
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Nuevo Chat</h2>
        <div className="buscador">
          <input
            type="text"
            placeholder="Buscar usuarios..."
            value={searchTerm}
            onChange={handleSearch}
          />
        </div>
        <div className="usuarios-lista">
          {filteredUsuarios.length > 0 ? (
            filteredUsuarios.map((u) => (
              <div key={u.id} className="usuario-item" onClick={() => handleUsuarioSelect(u)}>
                {u.nombre}
              </div>
            ))
          ) : (
            <p>No se encontraron usuarios</p>
          )}
        </div>
        <button className="close-btn" onClick={onClose}>
          Cerrar
        </button>
      </div>
    </div>
  )
}

NuevoChatModal.propTypes = {
  usuario: PropTypes.shape({
    id: PropTypes.number.isRequired,
    nombre: PropTypes.string.isRequired
  }).isRequired,
  onClose: PropTypes.func.isRequired,
  onChatSelect: PropTypes.func.isRequired
}

export default NuevoChatModal
