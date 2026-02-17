import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser, useClerk } from '@clerk/clerk-react'
import socket from './socket.js'

function ChatPage() {
    const [text, setText] = useState('')
    const [msgs, setMsgs] = useState([])
    const bottomRef = useRef(null)
    const { isLoaded, isSignedIn, user } = useUser()
    const { signOut } = useClerk()
    const navigate = useNavigate()

    const name = user?.firstName || user?.username || 'Anonymous'

    // Effect: Redirect if not signed in
    useEffect(() => {
        if (isLoaded && !isSignedIn) {
            navigate('/')
        }
    }, [isLoaded, isSignedIn, navigate])

    // Effect: Socket Setup & Message Listeners
    useEffect(() => {
        if (!isLoaded || !isSignedIn) return

        if (!socket.connected) {
            socket.connect()
        }

        // 1. Attach Listeners FIRST
        socket.on('message', (data) => {
            console.log('Message received:', data)
            setMsgs((prev) => [...prev, data])
        })

        socket.on('chatHistory', (history) => {
            console.log('History received:', history)
            setMsgs(history)
        })

        socket.on('connect', () => {
            console.log('Socket connected:', socket.id)
        })

        socket.on('connect_error', (err) => {
            console.error('Connection error:', err.message)
        })

        // 2. Emit Join
        console.log(`[Socket] Emitting join for name: "${name || 'Anonymous'}"`)
        socket.emit('join', name || 'Anonymous', user.id, user.imageUrl, user.primaryEmailAddress?.emailAddress, (response) => {
            if (response?.error) {
                console.error('[Socket] Join error:', response.error)
                alert(response.error)
            } else {
                console.log('[Socket] Join successful')
            }
        })

        return () => {
            console.log('[Socket] Cleaning up listeners and disconnecting')
            socket.off('message')
            socket.off('chatHistory')
            socket.off('connect')
            socket.off('connect_error')
            socket.disconnect()
        }
    }, [isLoaded, isSignedIn, name])

    // Auto-scroll to bottom on new messages
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [msgs])

    const send = () => {
        if (text.trim()) {
            socket.emit('sendMsg', text)
            setText('')
        }
    }

    const leaveChat = async () => {
        socket.disconnect()
        await signOut()
        navigate('/', { replace: true })
        window.location.reload()
    }

    // Get user initials for avatar
    const getInitials = (n) => {
        if (!n) return '?'
        return n.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    }

    return (
        <div className="h-screen flex flex-col bg-[#0f0c29]">
            {/* ───── Header ───── */}
            <div className="flex-none flex items-center justify-between px-4 sm:px-8 py-3 bg-white/5 backdrop-blur-xl border-b border-white/10">
                {/* Left: Back arrow (mobile) + Brand */}
                <div className="flex items-center gap-3">
                    <button onClick={leaveChat} className="sm:hidden text-gray-400 hover:text-white transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <h1 className="text-lg font-semibold text-white tracking-tight">💬 ChatVerse</h1>
                </div>

                {/* Right: User info + Logout */}
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <div className="relative w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white text-xs font-bold shadow-lg shadow-indigo-500/20 overflow-hidden">
                            {user?.imageUrl ? (
                                <img src={user.imageUrl} alt="profile" className="w-full h-full object-cover" />
                            ) : (
                                getInitials(name)
                            )}
                            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-400 border-2 border-[#0f0c29] rounded-full" />
                        </div>
                        <span className="hidden sm:block text-sm text-gray-300 font-medium">{name}</span>
                    </div>
                    <button
                        onClick={leaveChat}
                        className="hidden sm:flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-300 bg-white/5 border border-white/10 rounded-lg hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/30 transition-all duration-200"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        Leave
                    </button>
                </div>
            </div>

            {/* ───── Messages Area ───── */}
            <div className="flex-grow overflow-y-auto px-4 py-6 sm:px-[18%] space-y-4">
                {msgs.filter(msg => {
                    // Filter out system messages about ourselves (Join/Leave)
                    // but ALWAYS show the "Welcome" message.
                    if (msg.user === 'admin' && msg.targetClerkId === user?.id) {
                        return msg.text.includes('Welcome')
                    }
                    return true
                }).map((msg, index) =>
                    msg.user === 'admin' ? (
                        <div className="flex justify-center animate-msg-in" key={index}>
                            <div className="px-4 py-1.5 bg-white/5 backdrop-blur-sm border border-white/5 rounded-full text-xs text-gray-400 font-medium">
                                {msg.text}
                            </div>
                        </div>
                    ) : msg.user !== name ? (
                        <div className="flex items-end gap-2 animate-msg-in" key={index}>
                            <div className="w-8 h-8 rounded-full overflow-hidden flex-none bg-indigo-500/20 border border-white/10 flex items-center justify-center text-[10px] text-white font-bold mb-1">
                                {msg.avatar ? (
                                    <img src={msg.avatar} alt="" className="w-full h-full object-cover" />
                                ) : (
                                    getInitials(msg.user)
                                )}
                            </div>
                            <div className="max-w-[75%] w-fit">
                                <p className="text-[11px] text-indigo-300/70 font-medium mb-1 ml-1">{msg.user}</p>
                                <div className="bg-white/[0.07] backdrop-blur-sm border border-white/5 px-4 py-2.5 rounded-2xl rounded-tl-sm text-sm text-gray-200 leading-relaxed">
                                    {msg.text}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex justify-end items-end gap-2 animate-msg-in" key={index}>
                            <div className="max-w-[75%]">
                                <p className="text-[11px] text-gray-500 font-medium mb-1 mr-1 text-right">You</p>
                                <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2.5 rounded-2xl rounded-tr-sm text-sm text-white leading-relaxed shadow-lg shadow-indigo-500/10">
                                    {msg.text}
                                </div>
                            </div>
                            <div className="w-8 h-8 rounded-full overflow-hidden flex-none bg-indigo-600 border border-white/10 flex items-center justify-center text-[10px] text-white font-bold mb-1">
                                {user?.imageUrl ? (
                                    <img src={user.imageUrl} alt="" className="w-full h-full object-cover" />
                                ) : (
                                    getInitials(name)
                                )}
                            </div>
                        </div>
                    )
                )}
                <div ref={bottomRef} />
            </div>

            {/* ───── Input Bar ───── */}
            <div className="flex-none px-4 py-3 sm:px-[18%] bg-white/5 backdrop-blur-xl border-t border-white/10">
                <div className="flex items-center gap-2">
                    <input
                        type="text"
                        value={text}
                        placeholder="Type a message..."
                        onChange={(e) => setText(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') send() }}
                        className="flex-grow px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-transparent transition-all duration-200"
                    />
                    <button
                        onClick={send}
                        className="flex items-center justify-center w-11 h-11 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white hover:from-indigo-500 hover:to-violet-500 hover:shadow-lg hover:shadow-indigo-500/25 hover:scale-105 active:scale-95 transition-all duration-200 disabled:opacity-40"
                        disabled={!text.trim()}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 rotate-45" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    )
}

export default ChatPage