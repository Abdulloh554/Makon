import { Server as HttpServer } from 'http'
import { Server, Socket } from 'socket.io'
import jwt from 'jsonwebtoken'
import { config } from '../config'
import { messageModel } from '../modules/message/message.model'

let io: Server | null = null

interface JwtPayload {
  id: string
  phone: string
}

interface AuthSocket extends Socket {
  userId?: string
}

const onlineUsers = new Map<string, Set<string>>()

export function initSocket(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: {
      origin: config.cors.origin === '*' ? true : config.cors.origin.split(',').map(s => s.trim()),
      credentials: true,
    },
  })

  io.use((socket: AuthSocket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token
    if (!token) {
      return next(new Error('Authentication required'))
    }
    try {
      const decoded = jwt.verify(token as string, config.jwt.secret) as JwtPayload
      socket.userId = decoded.id
      next()
    } catch {
      next(new Error('Invalid token'))
    }
  })

  io.on('connection', (rawSocket: Socket) => {
    const socket = rawSocket as AuthSocket
    const userId = socket.userId!

    socket.join(`user:${userId}`)

    if (!onlineUsers.has(userId)) {
      onlineUsers.set(userId, new Set())
    }
    onlineUsers.get(userId)!.add(socket.id)

    io?.emit('user:online', { userId, online: true })

    console.log(`[SOCKET] User ${userId} connected (${socket.id})`)

    socket.on('join_conversation', (data: { partnerId: string }) => {
      if (!data.partnerId) return
      const room = getConversationRoom(userId, data.partnerId)
      socket.join(room)
      console.log(`[SOCKET] User ${userId} joined room ${room}`)
    })

    socket.on('leave_conversation', (data: { partnerId: string }) => {
      if (!data.partnerId) return
      const room = getConversationRoom(userId, data.partnerId)
      socket.leave(room)
    })

    socket.on('typing_start', (data: { toUserId: string }) => {
      if (!data.toUserId) return
      io?.to(`user:${data.toUserId}`).emit('user:typing', {
        fromUserId: userId,
        isTyping: true,
      })
    })

    socket.on('typing_stop', (data: { toUserId: string }) => {
      if (!data.toUserId) return
      io?.to(`user:${data.toUserId}`).emit('user:typing', {
        fromUserId: userId,
        isTyping: false,
      })
    })

    socket.on('disconnect', () => {
      const sockets = onlineUsers.get(userId)
      if (sockets) {
        sockets.delete(socket.id)
        if (sockets.size === 0) {
          onlineUsers.delete(userId)
          io?.emit('user:online', { userId, online: false })
        }
      }
      console.log(`[SOCKET] User ${userId} disconnected (${socket.id})`)
    })
  })

  return io
}

export function getConversationRoom(userId1: string, userId2: string): string {
  const [a, b] = [userId1, userId2].sort()
  return `conversation:${a}:${b}`
}

export async function emitNewMessage(message: Record<string, unknown>) {
  const fromId = String(message.fromUserId ?? '')
  const toId = String(message.toUserId ?? '')
  if (!fromId || !toId) return

  const room = getConversationRoom(fromId, toId)
  io?.to(room).emit('new_message', message)
  io?.to(`user:${toId}`).emit('new_message', message)

  const unreadCount = await messageModel.countDocuments({ toUserId: toId, read: false })
  io?.to(`user:${toId}`).emit('unread_count', { count: unreadCount })
}

export function isUserOnline(userId: string): boolean {
  const sockets = onlineUsers.get(userId)
  return !!sockets && sockets.size > 0
}

export function getUserOnlineStatus(): Record<string, boolean> {
  const result: Record<string, boolean> = {}
  for (const [userId, sockets] of onlineUsers) {
    result[userId] = sockets.size > 0
  }
  return result
}
