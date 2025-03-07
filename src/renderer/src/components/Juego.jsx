import { useState, useEffect } from 'react'
import PropTypes from 'prop-types'
import './Juego.css'

function Juego({ chat, usuario, onGameEnd, player1Name, player2Name }) {
  const [board, setBoard] = useState(Array(9).fill(null))
  const [isPlayer2Turn, setIsPlayer2Turn] = useState(true) // Jugador 2 empieza
  const [winner, setWinner] = useState(null)
  const [winningLine, setWinningLine] = useState(null)
  const player1Id = chat.usuario1_id
  const player2Id = chat.usuario2_id

  useEffect(() => {
    const ws = window.electron.connectWebSocket(usuario.id, (eventType, data) => {
      if (eventType === 'game-move' && data.chatId === chat.id) {
        console.log(`Movimiento recibido por ${usuario.id}:`, data.board)
        setBoard(data.board)
        setIsPlayer2Turn((prev) => !prev)
      }
      if (eventType === 'game-ended' && data.chat_id === chat.id) {
        const win = calculateWinner(data.board)
        setWinner(data.winner ? (data.winner === player2Id ? 'X' : 'O') : 'draw')
        if (win) setWinningLine(getWinningLine(data.board))
      }
    })
    return () => ws.close()
  }, [chat.id, usuario.id, player2Id])

  const handleClick = (index) => {
    console.log(
      `Usuario ${usuario.id} intenta jugar en ${index}. Turno: ${isPlayer2Turn ? 'Jugador 2' : 'Jugador 1'}`
    )
    console.log(`player1Id: ${player1Id}, player2Id: ${player2Id}`)

    if (
      board[index] || // Casilla ocupada
      winner || // Hay ganador
      (isPlayer2Turn && usuario.id !== player2Id) || // No es el turno del Jugador 2
      (!isPlayer2Turn && usuario.id !== player1Id) // No es el turno del Jugador 1
    ) {
      console.log('Movimiento bloqueado')
      return
    }

    const newBoard = [...board]
    newBoard[index] = isPlayer2Turn ? 'X' : 'O'
    console.log(`Movimiento realizado: ${newBoard}`)
    setBoard(newBoard)

    const gameWinner = calculateWinner(newBoard)
    if (gameWinner || !newBoard.includes(null)) {
      setWinner(gameWinner || 'draw')
      if (gameWinner) setWinningLine(getWinningLine(newBoard))
      console.log(`Fin del juego. Ganador: ${gameWinner || 'empate'}`)
      window.electron.send('notify-game-end', {
        chatId: chat.id,
        winner: gameWinner ? (isPlayer2Turn ? player2Id : player1Id) : null,
        board: newBoard
      })
      setTimeout(onGameEnd, 2000)
    } else {
      console.log(`Enviando movimiento al servidor desde ${usuario.id}`)
      window.electron.send('send-game-move', { chatId: chat.id, board: newBoard, from: usuario.id })
    }
  }

  const calculateWinner = (board) => {
    const lines = [
      [0, 1, 2],
      [3, 4, 5],
      [6, 7, 8],
      [0, 3, 6],
      [1, 4, 7],
      [2, 5, 8],
      [0, 4, 8],
      [2, 4, 6]
    ]
    for (let line of lines) {
      const [a, b, c] = line
      if (board[a] && board[a] === board[b] && board[a] === board[c]) return board[a]
    }
    return null
  }

  const getWinningLine = (board) => {
    const lines = [
      [0, 1, 2],
      [3, 4, 5],
      [6, 7, 8],
      [0, 3, 6],
      [1, 4, 7],
      [2, 5, 8],
      [0, 4, 8],
      [2, 4, 6]
    ]
    for (let line of lines) {
      const [a, b, c] = line
      if (board[a] && board[a] === board[b] && board[a] === board[c]) return line
    }
    return null
  }

  const renderSquare = (index) => (
    <button
      key={index}
      className={`square ${board[index] === 'X' ? 'x' : board[index] === 'O' ? 'o' : ''}`}
      onClick={() => handleClick(index)}
    >
      {board[index]}
    </button>
  )

  return (
    <div className="modal-overlay">
      <div className="modal-content game-modal">
        <h2>Tres en Raya</h2>
        <div className="board-container">
          <div className="board">{board.map((_, i) => renderSquare(i))}</div>
          {winningLine && (
            <div
              className={`winning-line line-${winningLine[0]}-${winningLine[2]}`}
              style={{ animation: 'drawLine 1s ease-in-out forwards' }}
            />
          )}
        </div>
        <p>Turno de: {isPlayer2Turn ? `${player2Name} (X)` : `${player1Name} (O)`}</p>
        {winner && (
          <div>
            <p>
              {winner === 'draw'
                ? 'Empate'
                : `Ganador: ${winner === 'X' ? player2Name : player1Name}`}
            </p>
            <button onClick={onGameEnd}>Salir</button>
          </div>
        )}
      </div>
    </div>
  )
}

Juego.propTypes = {
  chat: PropTypes.shape({
    id: PropTypes.number.isRequired,
    interlocutor: PropTypes.string.isRequired,
    usuario1_id: PropTypes.number.isRequired,
    usuario2_id: PropTypes.number.isRequired,
    estado: PropTypes.string
  }).isRequired,
  usuario: PropTypes.shape({
    id: PropTypes.number.isRequired,
    nombre: PropTypes.string.isRequired
  }).isRequired,
  onGameEnd: PropTypes.func.isRequired,
  player1Name: PropTypes.string.isRequired,
  player2Name: PropTypes.string.isRequired
}

export default Juego
