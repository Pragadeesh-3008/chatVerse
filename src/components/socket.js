import { io } from 'socket.io-client'

const URL = process.env.NODE_ENV === 'production'
  ? undefined // Use relative path in production
  : 'http://localhost:5000'

const socket = io(URL, {
  autoConnect: false,
})

export default socket
