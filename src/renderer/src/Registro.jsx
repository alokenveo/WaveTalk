import './assets/LoginRegistro.css'
import { Link, useNavigate } from 'react-router-dom'
import waveTalkLogo from './assets/logo_waveTalk.png'
import { useState } from 'react'

function Registro() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const navigate = useNavigate()

  const registrarUsuario = (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const nombre = e.target.nombre.value
    const correo = e.target.correo.value
    const password = e.target.password.value

    window.electron.send('registrar-usuario', { nombre, correo, password })

    window.electron.once('registro-respuesta', (event, response) => {
      setLoading(false)
      if (response.error) {
        // Personalizar mensaje de error según el caso
        if (response.error.includes('UNIQUE constraint failed')) {
          setError('El correo ya está registrado')
        } else {
          setError(response.error)
        }
      } else {
        alert('Usuario registrado con éxito')
        e.target.reset()
        navigate('/login')
      }
    })
  }

  return (
    <div className="login-container">
      <div id="izquierdo">
        <img src={waveTalkLogo} alt="Logo WaveTalk" />
      </div>
      <div id="derecho">
        <h2>Registro</h2>
        <form onSubmit={registrarUsuario}>
          <input type="text" name="nombre" placeholder="Nombre" required />
          <input type="email" name="correo" placeholder="Correo electrónico" required />
          <input type="password" name="password" placeholder="Contraseña" required />
          <button type="submit" disabled={loading}>
            {loading ? 'Registrando...' : 'Registrarse'}
          </button>
        </form>
        {error && <p className="error-message">{error}</p>}
        <p>
          ¿Ya tienes una cuenta? <Link to="/login">Inicia sesión</Link>
        </p>
      </div>
    </div>
  )
}

export default Registro
