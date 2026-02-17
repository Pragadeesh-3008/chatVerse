import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import http from 'http'
import { Server } from 'socket.io'
import { createUser, getUser, removeUser, saveMessage, getRecentMessages } from './db.js'

const PORT = process.env.PORT || 5000

const app = express()
const server = http.createServer(app)

const io = new Server(server, {
    cors: {
        origin: function (origin, callback) {
            // Allow all origins for the chat app
            callback(null, true)
        },
        methods: ['GET', 'POST'],
    },
})

app.use(cors())

// Health check endpoint
app.get('/health', (_req, res) => {
    res.json({ status: 'ok', uptime: process.uptime() })
})

io.on('connection', (socket) => {
    console.log(`[+] New connection: ${socket.id}`)

    //Join
    socket.on('join', async (name, clerkId, avatar, email, callback) => {
        if (socket.joined) {
            console.log(`[!] Duplicate join attempt ignored for: ${socket.id}`)
            return
        }

        // Handle cases where clerkId/avatar might not be passed (legacy or fallback)
        if (typeof name !== 'string') {
            const data = name; // If user passed an object
            name = data.name;
            clerkId = data.clerkId;
            avatar = data.avatar;
            email = data.email;
            callback = email; // Re-align if callback was last arg
        }

        const { error, user, wasOnline } = await createUser({
            id: socket.id,
            name,
            clerkId,
            avatar,
            email
        })

        if (error) {
            console.log(`[!] Join failed for "${name}": ${error}`)
            if (typeof callback === 'function') callback({ error })
            return
        }

        // Mark as joined to prevent re-processing this event for this socket
        socket.joined = true
        console.log(`[✓] ${user.name} joined (${socket.id})`)

        // Send chat history to the user
        const history = await getRecentMessages(50)
        socket.emit('chatHistory', history)

        // 1. Welcome the user (EPHEMERAL - SENT ONLY TO JOINER)
        socket.emit('message', {
            user: 'admin',
            text: `Welcome to the chat, ${user.name}!`,
            isEphemeral: true,
            targetClerkId: user.clerkId
        })

        if (!wasOnline) {
            socket.broadcast.emit('message', {
                user: 'admin',
                text: `${user.name} has joined the chat`,
                isEphemeral: true,
                targetClerkId: user.clerkId
            })
        }

        socket.join('group-chat')
    })

    // Send Message
    socket.on('sendMsg', async (message) => {
        const user = await getUser(socket.id)
        if (!user) return

        const msgData = {
            user: user.name,
            avatar: user.avatar,
            text: message
        }
        io.emit('message', msgData)

        await saveMessage({
            text: message,
            senderId: user.id
        })
    })

    // ── Disconnect (browser close, network drop, etc.) ──
    socket.on('disconnect', async (reason) => {
        console.log(`[-] Disconnected: ${socket.id} (${reason})`)
        await handleUserLeave(socket)
    })
})

// Shared cleanup helper
async function handleUserLeave(socket) {
    const user = await removeUser(socket.id)
    if (user) {
        // Ephemeral leave alert
        io.emit('message', {
            user: 'admin',
            text: `${user.name} has left the chat`,
            isEphemeral: true,
            targetClerkId: user.clerkId
        })
        console.log(`[←] ${user.name} left`)
    }
}

// Export the app for Vercel
export default app

// Only listen locally
if (process.env.NODE_ENV !== 'production') {
    server.listen(PORT, () => {
        console.log(`🚀 Server running on http://localhost:${PORT}`)
    })
}