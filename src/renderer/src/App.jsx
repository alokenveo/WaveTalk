import { Routes, Route } from 'react-router-dom'
import Home from './Home'
import Login from './Login'
import Registro from './Registro'

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Home />} />
      <Route path="/registro" element={<Registro />} />
    </Routes>
  )
}

export default App
