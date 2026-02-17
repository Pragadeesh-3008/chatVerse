import { PrismaClient } from '@prisma/client'
import { withAccelerate } from '@prisma/extension-accelerate'

const prisma = new PrismaClient({
    accelerateUrl: process.env.DATABASE_URL
}).$extends(withAccelerate())

export const createUser = async ({ id, name, clerkId, avatar, email }) => {
    try {
        const cleanName = name.trim()

        // 1. First, try to find by Clerk ID (most specific)
        let user = null
        if (clerkId) {
            user = await prisma.user.findUnique({
                where: { clerkId }
            })
        }

        // 2. If not found by Clerk ID, try finding by email
        if (!user && email) {
            user = await prisma.user.findUnique({
                where: { email }
            })
        }

        // 3. Fallback: find by name
        if (!user) {
            user = await prisma.user.findUnique({
                where: { name: cleanName }
            })
        }

        if (user) {
            const wasOnline = user.online

            // Update existing user with new profile info and set online
            try {
                const updatedUser = await prisma.user.update({
                    where: { id: user.id },
                    data: {
                        socketId: id,
                        online: true,
                        clerkId: clerkId || user.clerkId,
                        email: email || user.email,
                        avatar: avatar || user.avatar,
                        name: cleanName || user.name
                    }
                })
                return { user: updatedUser, wasOnline }
            } catch (err) {
                // If update fails because cleanName is taken by ANOTHER user record
                if (err.code === 'P2002') {
                    console.log(`[!] Name conflict for "${cleanName}". Finding conflicting user...`)
                    const otherUser = await prisma.user.findUnique({ where: { name: cleanName } })
                    if (otherUser) {
                        const otherWasOnline = otherUser.online
                        // Merge current Clerk data into the user record that holds the name
                        const mergedUser = await prisma.user.update({
                            where: { id: otherUser.id },
                            data: {
                                socketId: id,
                                online: true,
                                clerkId: clerkId || otherUser.clerkId,
                                email: email || otherUser.email,
                                avatar: avatar || otherUser.avatar
                            }
                        })
                        return { user: mergedUser, wasOnline: otherWasOnline }
                    }
                }
                throw err
            }
        }

        // 4. Not found anywhere? Create a new user
        try {
            const newUser = await prisma.user.create({
                data: {
                    name: cleanName,
                    clerkId,
                    email,
                    avatar,
                    socketId: id,
                    online: true
                }
            })
            return { user: newUser, wasOnline: false }
        } catch (error) {
            if (error.code === 'P2002') {
                // Race condition: retry find one last time
                const existingUser = await prisma.user.findFirst({
                    where: {
                        OR: [
                            { clerkId: clerkId || undefined },
                            { email: email || undefined },
                            { name: cleanName }
                        ]
                    }
                })
                if (existingUser) {
                    const finalWasOnline = existingUser.online
                    const finalUser = await prisma.user.update({
                        where: { id: existingUser.id },
                        data: { socketId: id, online: true }
                    })
                    return { user: finalUser, wasOnline: finalWasOnline }
                }
            }
            throw error
        }
    } catch (error) {
        console.error('Error in createUser:', error)
        return { error: 'Could not join chat' }
    }
}

export const removeUser = async (socketId) => {
    try {
        const user = await prisma.user.findFirst({
            where: { socketId }
        })

        if (user) {
            return await prisma.user.update({
                where: { id: user.id },
                data: { online: false, socketId: null }
            })
        }
    } catch (error) {
        console.error('Error in removeUser:', error)
    }
    return null
}

export const getUser = async (socketId) => {
    try {
        return await prisma.user.findFirst({
            where: { socketId, online: true }
        })
    } catch (error) {
        console.error('Error in getUser:', error)
        return null
    }
}

export const saveMessage = async ({ text, senderId, isSystem = false }) => {
    try {
        return await prisma.message.create({
            data: {
                text,
                senderId: senderId || null,
                isSystem
            }
        })
    } catch (error) {
        console.error('Error in saveMessage:', error)
    }
}

export const getRecentMessages = async (limit = 50) => {
    try {
        const messages = await prisma.message.findMany({
            take: limit,
            orderBy: { createdAt: 'desc' },
            include: { sender: true }
        })

        // Reverse to get chronological order
        return messages.reverse().map(m => ({
            user: m.isSystem ? 'admin' : (m.sender?.name || 'Unknown'),
            avatar: m.sender?.avatar,
            text: m.text,
            createdAt: m.createdAt
        }))
    } catch (error) {
        console.error('Error in getRecentMessages:', error)
        return []
    }
}
