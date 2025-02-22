import './assets/LoginRegistro.css'
import { Link, useNavigate } from 'react-router-dom'
import waveTalkLogo from './assets/logo_waveTalk.png'
import { useState } from 'react'

function Login() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const navigate = useNavigate()

  const handleLogin = (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const correo = e.target.correo.value
    const password = e.target.password.value

    window.electron.send('iniciar-sesion', { correo, password })

    window.electron.once('login-respuesta', (event, response) => {
      setLoading(false)
      if (response.error) {
        setError(response.error)
      } else {
        alert('Inicio de sesión exitoso')
        navigate('/', { state: { usuario: response.usuario } })
      }
    })
  }

  return (
    <div className="login-container">
      <div id="izquierdo">
        <img src={waveTalkLogo} alt="Logo WaveTalk" />
      </div>
      <div id="derecho">
        <h2>Iniciar Sesión</h2>
        <form onSubmit={handleLogin}>
          <input type="email" name="correo" placeholder="Correo electrónico" required />
          <input type="password" name="password" placeholder="Contraseña" required />
          <button type="submit" disabled={loading}>
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>
        {error && <p className="error-message">{error}</p>}
        <p>
          ¿No tienes cuenta? <Link to="/registro">Regístrate</Link>
        </p>
      </div>
    </div>
  )
}

export default Login
