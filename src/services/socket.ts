/**
 * @file socket.ts
 * @layer Service
 * @responsibility Socket.IO server with Redis adapter, JWT auth, rate limiting, and presence
 */

import { type Server as HttpServer } from 'node:http'
import { Server, type Socket } from 'socket.io'
import { createAdapter } from '@socket.io/redis-adapter'
import jwt from 'jsonwebtoken'
import cookie from 'cookie'
import { config } from '../config'
import { getRedisClient } from '../database/redis'
import { SOCKET_EVENTS } from '@shared/constants/events'

interface AuthSocket extends Socket {
  userId?: string
}

interface JwtPayload {
  sub: string
  type: string
}

// ─── Socket Rate Limiter ──────────────────────────────────────────────
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

const SOCKET_RATE_LIMIT = {
  WINDOW_MS: 10000,
  MAX_EVENTS: 30,
}

function checkSocketRateLimit(userId: string): boolean {
  const now = Date.now()
  const key = `socket:${userId}`
  const entry = rateLimitMap.get(key)

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + SOCKET_RATE_LIMIT.WINDOW_MS })
    return true
  }

  if (entry.count >= SOCKET_RATE_LIMIT.MAX_EVENTS) {
    return false
  }

  entry.count++
  return true
}

// Clean up stale entries every 60s
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of rateLimitMap) {
    if (now > entry.resetAt) {
      rateLimitMap.delete(key)
    }
  }
}, 60000).unref()

let io: Server | null = null

const redisClient = getRedisClient()
const PRESENCE_PREFIX = 'presence:'
const PRESENCE_TTL = 120

// In-memory fallback when Redis is unavailable
const localPresence = new Map<string, Set<string>>()

async function markOnline(userId: string, socketId: string): Promise<void> {
  if (redisClient?.status === 'ready') {
    await redisClient.sadd(`${PRESENCE_PREFIX}${userId}`, socketId)
    await redisClient.expire(`${PRESENCE_PREFIX}${userId}`, PRESENCE_TTL)
  }
  if (!localPresence.has(userId)) {
    localPresence.set(userId, new Set())
  }
  localPresence.get(userId)!.add(socketId)
}

async function markOffline(userId: string, socketId: string): Promise<void> {
  if (redisClient?.status === 'ready') {
    await redisClient.srem(`${PRESENCE_PREFIX}${userId}`, socketId)
  }
  const sockets = localPresence.get(userId)
  if (sockets) {
    sockets.delete(socketId)
    if (sockets.size === 0) {
      localPresence.delete(userId)
    }
  }
}

export function initSocket(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: {
      origin: config.cors.origin,
      credentials: true,
    },
    pingInterval: 25000,
    pingTimeout: 20000,
  })

  // Redis adapter for multi-instance support
  if (redisClient) {
    const subClient = redisClient.duplicate()
    io.adapter(createAdapter(redisClient, subClient))
  }

  // Auth middleware — verify JWT from cookie or auth token
  io.use((socket: AuthSocket, next) => {
    try {
      const cookies = cookie.parse(socket.handshake.headers.cookie || '')
      const token = socket.handshake.auth?.token || cookies?.access_token

      if (!token) {
        return next(new Error('Authentication required'))
      }

      const decoded = jwt.verify(token, config.jwt.secret) as JwtPayload

      if (decoded.type !== 'access') {
        return next(new Error('Invalid token type'))
      }

      socket.userId = decoded.sub
      next()
    } catch {
      next(new Error('Invalid or expired token'))
    }
  })

  io.on('connection', (rawSocket: Socket) => {
    const socket = rawSocket as AuthSocket
    const userId = socket.userId!

    // Track online status (Redis-backed for multi-instance)
    socket.join(`user:${userId}`)
    markOnline(userId, socket.id)

    io?.emit(SOCKET_EVENTS.SERVER.USER_ONLINE, { userId, online: true })

    // ── Rate-limited event handlers ──────────────────────────────
    function withRateLimit<T extends (...args: never[]) => void>(fn: T): T {
      return ((...args: never[]) => {
        if (!checkSocketRateLimit(userId)) {
          socket.emit(SOCKET_EVENTS.SERVER.ERROR, { message: 'Rate limit exceeded. Slow down.' })
          return
        }
        fn(...args)
      }) as T
    }

    // Join conversation room
    socket.on(SOCKET_EVENTS.CLIENT.JOIN_CONVERSATION, withRateLimit((data: { conversationId: string }) => {
      if (!data?.conversationId) return
      socket.join(`conversation:${data.conversationId}`)
    }))

    // Leave conversation room
    socket.on(SOCKET_EVENTS.CLIENT.LEAVE_CONVERSATION, withRateLimit((data: { conversationId: string }) => {
      if (!data?.conversationId) return
      socket.leave(`conversation:${data.conversationId}`)
    }))

    // Typing indicators
    socket.on(SOCKET_EVENTS.CLIENT.TYPING_START, withRateLimit((data: { conversationId: string }) => {
      if (!data?.conversationId) return
      socket.to(`conversation:${data.conversationId}`).emit(SOCKET_EVENTS.SERVER.TYPING_START, {
        userId,
        conversationId: data.conversationId,
      })
    }))

    socket.on(SOCKET_EVENTS.CLIENT.TYPING_STOP, withRateLimit((data: { conversationId: string }) => {
      if (!data?.conversationId) return
      socket.to(`conversation:${data.conversationId}`).emit(SOCKET_EVENTS.SERVER.TYPING_STOP, {
        userId,
        conversationId: data.conversationId,
      })
    }))

    // Mark messages as read
    socket.on(SOCKET_EVENTS.CLIENT.MARK_READ, withRateLimit(async (data: { conversationId: string; messageIds: string[] }) => {
      if (!data?.conversationId || !data?.messageIds?.length) return
      try {
        const { messageModel: Message } = await import('../modules/message/message.model')
        await Message.updateMany(
          { _id: { $in: data.messageIds }, toUserId: userId },
          { read: true, readAt: new Date() },
        )

        io?.to(`conversation:${data.conversationId}`).emit(SOCKET_EVENTS.SERVER.MESSAGE_UPDATED, {
          conversationId: data.conversationId,
          messageIds: data.messageIds,
          read: true,
        })
      } catch (err) {
        socket.emit(SOCKET_EVENTS.SERVER.ERROR, {
          message: 'Failed to mark messages as read',
        })
      }
    }))

    // Disconnect
    socket.on('disconnect', async () => {
      await markOffline(userId, socket.id)
      const online = await isUserOnline(userId)
      if (!online) {
        io?.emit(SOCKET_EVENTS.SERVER.USER_OFFLINE, { userId, online: false })
      }
    })
  })

  return io
}

export function getIO(): Server | null {
  return io
}

/**
 * Emit a new message to a conversation room
 */
export async function emitNewMessage(message: Record<string, unknown>): Promise<void> {
  if (!io) return

  const room = `conversation:${message.conversationId}`
  io.to(room).emit(SOCKET_EVENTS.SERVER.MESSAGE_NEW, message)

  // Send notification to offline user
  try {
    const { getNotificationQueue } = await import('../queues/notification.queue')
    const queue = getNotificationQueue()
    const toUserId = message.toUserId as string
    const text = message.text as string
    await queue.add('push_notification', {
      type: 'push_notification',
      userId: toUserId,
      title: 'New Message',
      body: text.slice(0, 100),
    })
  } catch {
    // Queue notification silently
  }
}

/**
 * Emit an updated message to a conversation room
 */
export async function emitUpdateMessage(message: Record<string, unknown>): Promise<void> {
  if (!io) return

  const room = `conversation:${message.conversationId}`
  io.to(room).emit(SOCKET_EVENTS.SERVER.MESSAGE_UPDATED, message)
}

/**
 * Emit a deleted message event to a conversation room
 */
export async function emitDeleteMessage(data: Record<string, unknown>): Promise<void> {
  if (!io) return

  const conversationId = data.conversationId as string
  const room = `conversation:${conversationId}`
  io.to(room).emit(SOCKET_EVENTS.SERVER.MESSAGE_DELETED, data)
}

export async function isUserOnline(userId: string): Promise<boolean> {
  if (redisClient?.status === 'ready') {
    const count = await redisClient.scard(`${PRESENCE_PREFIX}${userId}`)
    return count > 0
  }
  const sockets = localPresence.get(userId)
  return !!sockets && sockets.size > 0
}
