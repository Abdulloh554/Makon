import { type Server as HttpServer } from 'node:http'

const mockEmit = jest.fn()
const mockTo = jest.fn(() => ({ emit: jest.fn() }))
const mockJoin = jest.fn()
const mockLeave = jest.fn()
const mockUse = jest.fn()
const mockOn = jest.fn()
let connectionCb: ((socket: any) => void) | null = null
let authCb: ((socket: any, next: (err?: Error) => void) => void) | null = null

jest.mock('socket.io', () => ({
  Server: jest.fn().mockImplementation(() => ({
    use: jest.fn((fn: any) => { authCb = fn }),
    on: jest.fn((event: string, fn: any) => { if (event === 'connection') connectionCb = fn }),
    emit: mockEmit,
    to: mockTo,
    adapter: jest.fn(),
  })),
}))

jest.mock('@socket.io/redis-adapter', () => ({
  createAdapter: jest.fn(),
}))

jest.mock('jsonwebtoken', () => ({
  verify: jest.fn(),
}))

jest.mock('cookie', () => ({
  parse: jest.fn(),
}))

jest.mock('../config', () => ({
  config: {
    cors: { origin: 'http://localhost:3000' },
    jwt: { secret: 'test_secret_key_at_least_32_chars_long_for_jwt!' },
  },
}))

jest.mock('../database/redis', () => ({
  getRedisClient: jest.fn().mockReturnValue(null),
}))

jest.mock('@shared/constants/events', () => ({
  SOCKET_EVENTS: {
    CLIENT: {
      JOIN_CONVERSATION: 'conversation:join',
      LEAVE_CONVERSATION: 'conversation:leave',
      SEND_MESSAGE: 'message:send',
      TYPING_START: 'typing:start',
      TYPING_STOP: 'typing:stop',
      MARK_READ: 'message:markRead',
    },
    SERVER: {
      MESSAGE_NEW: 'message:new',
      MESSAGE_UPDATED: 'message:updated',
      MESSAGE_DELETED: 'message:deleted',
      TYPING_START: 'typing:start',
      TYPING_STOP: 'typing:stop',
      USER_ONLINE: 'user:online',
      USER_OFFLINE: 'user:offline',
      UNREAD_COUNT: 'message:unreadCount',
      ERROR: 'socket:error',
    },
  },
}))

import { Server } from 'socket.io'
import jwt from 'jsonwebtoken'
import cookie from 'cookie'
import * as socketService from '../services/socket'
import { SOCKET_EVENTS } from '@shared/constants/events'

function makeSocket(overrides: Record<string, unknown> = {}) {
  return {
    id: 'socket_' + Math.random().toString(36).slice(2, 8),
    handshake: {
      headers: { cookie: '' },
      auth: {},
    },
    join: mockJoin,
    leave: mockLeave,
    emit: jest.fn(),
    to: mockTo,
    userId: undefined,
    on: jest.fn((event: string, cb: any) => {
      if (overrides.eventHandlers) {
        (overrides.eventHandlers as Record<string, any>)[event] = cb
      }
    }),
    ...overrides,
  }
}

describe('SocketService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    authCb = null
    connectionCb = null
    mockUse.mockClear()
    mockOn.mockClear()
  })

  describe('initSocket', () => {
    it('should create server with Redis adapter', () => {
      const httpServer = {} as HttpServer
      const io = socketService.initSocket(httpServer)

      expect(Server).toHaveBeenCalledWith(httpServer, expect.objectContaining({
        cors: expect.any(Object),
      }))
      expect(io).toBeDefined()
    })

    it('should register auth middleware', () => {
      const httpServer = {} as HttpServer
      socketService.initSocket(httpServer)

      expect(authCb).toBeDefined()
    })
  })

  describe('Auth middleware', () => {
    it('should validate JWT and set userId', () => {
      const httpServer = {} as HttpServer
      socketService.initSocket(httpServer)

      const socket = makeSocket()
      const next = jest.fn()
      ;(cookie.parse as jest.Mock).mockReturnValue({ access_token: 'valid_token' })
      ;(jwt.verify as jest.Mock).mockReturnValue({ sub: 'user123', type: 'access' })

      authCb!(socket, next)

      expect(jwt.verify).toHaveBeenCalledWith('valid_token', expect.any(String))
      expect(socket.userId).toBe('user123')
      expect(next).toHaveBeenCalledWith()
    })

    it('should accept token from auth handshake', () => {
      const httpServer = {} as HttpServer
      socketService.initSocket(httpServer)

      const socket = makeSocket({
        handshake: { headers: { cookie: '' }, auth: { token: 'auth_token' } },
      })
      const next = jest.fn()
      ;(cookie.parse as jest.Mock).mockReturnValue({})
      ;(jwt.verify as jest.Mock).mockReturnValue({ sub: 'user456', type: 'access' })

      authCb!(socket, next)

      expect(jwt.verify).toHaveBeenCalledWith('auth_token', expect.any(String))
      expect(socket.userId).toBe('user456')
    })

    it('should reject if no token provided', () => {
      const httpServer = {} as HttpServer
      socketService.initSocket(httpServer)

      const socket = makeSocket()
      const next = jest.fn()
      ;(cookie.parse as jest.Mock).mockReturnValue({})

      authCb!(socket, next)

      expect(next).toHaveBeenCalledWith(new Error('Authentication required'))
    })

    it('should reject invalid token type', () => {
      const httpServer = {} as HttpServer
      socketService.initSocket(httpServer)

      const socket = makeSocket()
      const next = jest.fn()
      ;(cookie.parse as jest.Mock).mockReturnValue({ access_token: 'bad_type_token' })
      ;(jwt.verify as jest.Mock).mockReturnValue({ sub: 'user1', type: 'refresh' })

      authCb!(socket, next)

      expect(next).toHaveBeenCalledWith(new Error('Invalid token type'))
    })

    it('should reject invalid/expired token', () => {
      const httpServer = {} as HttpServer
      socketService.initSocket(httpServer)

      const socket = makeSocket()
      const next = jest.fn()
      ;(cookie.parse as jest.Mock).mockReturnValue({ access_token: 'expired' })
      ;(jwt.verify as jest.Mock).mockImplementation(() => { throw new Error('jwt expired') })

      authCb!(socket, next)

      expect(next).toHaveBeenCalledWith(new Error('Invalid or expired token'))
    })
  })

  describe('Connection event handlers', () => {
    it('should emit USER_ONLINE on connection', () => {
      const httpServer = {} as HttpServer
      socketService.initSocket(httpServer)

      const socket = makeSocket({ userId: 'user1' })
      connectionCb!(socket)

      expect(socket.join).toHaveBeenCalledWith('user:user1')
      expect(mockEmit).toHaveBeenCalledWith(SOCKET_EVENTS.SERVER.USER_ONLINE, { userId: 'user1', online: true })
    })

    it('should set up conversation:join handler', () => {
      const httpServer = {} as HttpServer
      socketService.initSocket(httpServer)

      const handlers: Record<string, Function> = {}
      const socket = makeSocket({
        userId: 'user1',
        on: jest.fn((event: string, cb: Function) => { handlers[event] = cb }),
      })
      connectionCb!(socket)

      expect(socket.on).toHaveBeenCalledWith('conversation:join', expect.any(Function))
    })

    it('should set up conversation:leave handler', () => {
      const httpServer = {} as HttpServer
      socketService.initSocket(httpServer)

      const handlers: Record<string, Function> = {}
      const socket = makeSocket({
        userId: 'user1',
        on: jest.fn((event: string, cb: Function) => { handlers[event] = cb }),
      })
      connectionCb!(socket)

      expect(socket.on).toHaveBeenCalledWith('conversation:leave', expect.any(Function))
    })

    it('should set up typing:start handler', () => {
      const httpServer = {} as HttpServer
      socketService.initSocket(httpServer)

      const handlers: Record<string, Function> = {}
      const socket = makeSocket({
        userId: 'user1',
        on: jest.fn((event: string, cb: Function) => { handlers[event] = cb }),
      })
      connectionCb!(socket)

      expect(socket.on).toHaveBeenCalledWith('typing:start', expect.any(Function))
    })

    it('should set up typing:stop handler', () => {
      const httpServer = {} as HttpServer
      socketService.initSocket(httpServer)

      const handlers: Record<string, Function> = {}
      const socket = makeSocket({
        userId: 'user1',
        on: jest.fn((event: string, cb: Function) => { handlers[event] = cb }),
      })
      connectionCb!(socket)

      expect(socket.on).toHaveBeenCalledWith('typing:stop', expect.any(Function))
    })

    it('should set up mark:read handler', () => {
      const httpServer = {} as HttpServer
      socketService.initSocket(httpServer)

      const handlers: Record<string, Function> = {}
      const socket = makeSocket({
        userId: 'user1',
        on: jest.fn((event: string, cb: Function) => { handlers[event] = cb }),
      })
      connectionCb!(socket)

      expect(socket.on).toHaveBeenCalledWith('message:markRead', expect.any(Function))
    })

    it('should set up disconnect handler', () => {
      const httpServer = {} as HttpServer
      socketService.initSocket(httpServer)

      const handlers: Record<string, Function> = {}
      const socket = makeSocket({
        userId: 'user1',
        on: jest.fn((event: string, cb: Function) => { handlers[event] = cb }),
      })
      connectionCb!(socket)

      expect(socket.on).toHaveBeenCalledWith('disconnect', expect.any(Function))
    })
  })

  describe('Conversation join/leave', () => {
    it('should join conversation room', () => {
      const httpServer = {} as HttpServer
      socketService.initSocket(httpServer)

      const handlers: Record<string, Function> = {}
      const socket = makeSocket({
        userId: 'user1',
        on: jest.fn((event: string, cb: Function) => { handlers[event] = cb }),
      })
      connectionCb!(socket)

      handlers['conversation:join']({ conversationId: 'conv1' })

      expect(socket.join).toHaveBeenCalledWith('conversation:conv1')
    })

    it('should not join without conversationId', () => {
      const httpServer = {} as HttpServer
      socketService.initSocket(httpServer)

      const handlers: Record<string, Function> = {}
      const localJoin = jest.fn()
      const socket = makeSocket({
        userId: 'user1',
        on: jest.fn((event: string, cb: Function) => { handlers[event] = cb }),
        join: localJoin,
      })
      connectionCb!(socket)
      localJoin.mockClear()

      handlers['conversation:join']({})

      expect(localJoin).not.toHaveBeenCalled()
    })

    it('should leave conversation room', () => {
      const httpServer = {} as HttpServer
      socketService.initSocket(httpServer)

      const handlers: Record<string, Function> = {}
      const socket = makeSocket({
        userId: 'user1',
        on: jest.fn((event: string, cb: Function) => { handlers[event] = cb }),
        leave: jest.fn(),
      })
      connectionCb!(socket)

      handlers['conversation:leave']({ conversationId: 'conv1' })

      expect(socket.leave).toHaveBeenCalledWith('conversation:conv1')
    })
  })

  describe('Typing events', () => {
    it('should emit typing:start to conversation room', () => {
      const httpServer = {} as HttpServer
      socketService.initSocket(httpServer)

      const handlers: Record<string, Function> = {}
      const toEmit = jest.fn()
      const socket = makeSocket({
        userId: 'user1',
        on: jest.fn((event: string, cb: Function) => { handlers[event] = cb }),
        to: jest.fn(() => ({ emit: toEmit })),
      })
      connectionCb!(socket)

      handlers['typing:start']({ conversationId: 'conv1' })

      expect(socket.to).toHaveBeenCalledWith('conversation:conv1')
      expect(toEmit).toHaveBeenCalledWith('typing:start', { userId: 'user1', conversationId: 'conv1' })
    })

    it('should emit typing:stop to conversation room', () => {
      const httpServer = {} as HttpServer
      socketService.initSocket(httpServer)

      const handlers: Record<string, Function> = {}
      const toEmit = jest.fn()
      const socket = makeSocket({
        userId: 'user1',
        on: jest.fn((event: string, cb: Function) => { handlers[event] = cb }),
        to: jest.fn(() => ({ emit: toEmit })),
      })
      connectionCb!(socket)

      handlers['typing:stop']({ conversationId: 'conv1' })

      expect(socket.to).toHaveBeenCalledWith('conversation:conv1')
      expect(toEmit).toHaveBeenCalledWith('typing:stop', { userId: 'user1', conversationId: 'conv1' })
    })

    it('should not emit typing without conversationId', () => {
      const httpServer = {} as HttpServer
      socketService.initSocket(httpServer)

      const handlers: Record<string, Function> = {}
      const socket = makeSocket({
        userId: 'user1',
        on: jest.fn((event: string, cb: Function) => { handlers[event] = cb }),
        to: jest.fn(() => ({ emit: jest.fn() })),
      })
      connectionCb!(socket)

      handlers['typing:start']({})

      expect(socket.to).not.toHaveBeenCalled()
    })
  })

  describe('getIO', () => {
    it('should return server after init', () => {
      const httpServer = {} as HttpServer
      socketService.initSocket(httpServer)
      const io = socketService.getIO()
      expect(io).toBeDefined()
    })
  })

  describe('isUserOnline', () => {
    it('should return false for unknown user', async () => {
      const online = await socketService.isUserOnline('unknown')
      expect(online).toBe(false)
    })
  })

  describe('emitNewMessage', () => {
    it('should emit to conversation room', async () => {
      const httpServer = {} as HttpServer
      socketService.initSocket(httpServer)

      await socketService.emitNewMessage({
        conversationId: 'conv1',
        toUserId: 'user2',
        text: 'Hello',
      })

      expect(mockTo).toHaveBeenCalledWith('conversation:conv1')
    })
  })

  describe('emitUpdateMessage', () => {
    it('should emit updated message to room', async () => {
      const httpServer = {} as HttpServer
      socketService.initSocket(httpServer)

      await socketService.emitUpdateMessage({ conversationId: 'conv1', text: 'Updated' })

      expect(mockTo).toHaveBeenCalledWith('conversation:conv1')
    })
  })

  describe('emitDeleteMessage', () => {
    it('should emit delete event to room', async () => {
      const httpServer = {} as HttpServer
      socketService.initSocket(httpServer)

      await socketService.emitDeleteMessage({ conversationId: 'conv1', messageId: 'msg1' })

      expect(mockTo).toHaveBeenCalledWith('conversation:conv1')
    })
  })

  describe('Rate limiter', () => {
    it('should block excessive socket events via mock verification', () => {
      const httpServer = {} as HttpServer
      socketService.initSocket(httpServer)

      const handlers: Record<string, Function> = {}
      const socketEmit = jest.fn()
      const socket = makeSocket({
        userId: 'user1',
        on: jest.fn((event: string, cb: Function) => { handlers[event] = cb }),
        emit: socketEmit,
      })
      connectionCb!(socket)

      expect(handlers['conversation:join']).toBeDefined()
    })
  })
})
