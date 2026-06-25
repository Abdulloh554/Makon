jest.mock('../database/model', () => {
  const mm = () => ({
    find: jest.fn(),
    findOne: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    countDocuments: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findOneAndUpdate: jest.fn(),
    findByIdAndDelete: jest.fn(),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    deleteMany: jest.fn(),
    aggregate: jest.fn(),
    save: jest.fn(),
  })
  return { createModel: jest.fn(() => mm()) }
})

jest.mock('../utils/cache', () => ({
  cache: {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    delPattern: jest.fn(),
    wrap: jest.fn((_key: string, fn: () => Promise<unknown>) => fn()),
  },
}))

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDoc = Record<string, any>

import { messageModel } from '../modules/message/message.model'
import { sellerModel } from '../modules/seller/seller.model'
import { cache } from '../utils/cache'
import * as messageService from '../modules/message/message.service'
import { NotFoundError } from '../errors/AppError'

function mockDoc(overrides: AnyDoc = {}): AnyDoc {
  const doc: AnyDoc = {
    _id: 'msg_' + Math.random().toString(36).slice(2, 8),
    fromUserId: 'user1',
    toUserId: 'user2',
    conversationId: 'user1:user2',
    propertyId: 'general',
    text: 'Hello',
    read: false,
    edited: false,
    createdAt: new Date().toISOString(),
    ...overrides,
    save: jest.fn().mockResolvedValue(undefined),
  }
  doc.toJSON = jest.fn(() => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { toJSON: _, save: _s, ...rest } = doc
    return { ...rest, id: rest._id }
  })
  return doc
}

function mockCursor(docs: AnyDoc[] = []) {
  const cursor: any = {
    sort: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    toArray: jest.fn().mockResolvedValue(docs),
  }
  cursor.then = jest.fn((resolve: (v: AnyDoc[]) => void) => {
    resolve(docs)
    return cursor
  })
  return cursor
}

function mockSeller(overrides: AnyDoc = {}): AnyDoc {
  const seller: AnyDoc = {
    _id: 'seller_' + Math.random().toString(36).slice(2, 8),
    userId: 'user_' + Math.random().toString(36).slice(2, 8),
    ...overrides,
  }
  seller.toJSON = jest.fn(() => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { toJSON: _, ...rest } = seller
    return { ...rest, id: rest._id }
  })
  return seller
}

describe('MessageService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('resolveUserId', () => {
    it('should resolve seller ID to user ID', async () => {
      const seller = mockSeller({ _id: 'seller1', userId: 'user1' })
      ;(sellerModel.findOne as jest.Mock).mockResolvedValue(seller)

      const result = await messageService.resolveUserId('seller1')

      expect(result).toBe('user1')
    })

    it('should return the same ID if no seller mapping found', async () => {
      ;(sellerModel.findOne as jest.Mock).mockResolvedValue(null)

      const result = await messageService.resolveUserId('user1')

      expect(result).toBe('user1')
    })

    it('should handle seller lookup error gracefully', async () => {
      ;(sellerModel.findOne as jest.Mock).mockRejectedValue(new Error('DB error'))

      const result = await messageService.resolveUserId('user1')

      expect(result).toBe('user1')
    })
  })

  describe('create', () => {
    it('should create message with conversationId', async () => {
      ;(sellerModel.findOne as jest.Mock).mockResolvedValue(null)
      ;(messageModel.create as jest.Mock).mockResolvedValue(mockDoc())

      const result = await messageService.create(
        { toUserId: 'user2', propertyId: 'prop1', text: 'Hello' },
        'user1',
      )

      expect(messageModel.create).toHaveBeenCalled()
      const createCall = (messageModel.create as jest.Mock).mock.calls[0][0]
      expect(createCall.conversationId).toBeDefined()
      expect(createCall.text).toBe('Hello')
      expect(result).toBeDefined()
    })

    it('should resolve userId via seller lookup', async () => {
      const seller = mockSeller({ _id: 'seller1', userId: 'user1' })
      ;(sellerModel.findOne as jest.Mock).mockResolvedValue(seller)
      ;(messageModel.create as jest.Mock).mockResolvedValue(mockDoc())

      await messageService.create(
        { toUserId: 'user2', propertyId: 'general', text: 'Hi' },
        'seller1',
      )

      expect(messageModel.create).toHaveBeenCalled()
    })

    it('should clear unread cache for recipient', async () => {
      ;(sellerModel.findOne as jest.Mock).mockResolvedValue(null)
      ;(messageModel.create as jest.Mock).mockResolvedValue(mockDoc())

      await messageService.create(
        { toUserId: 'user2', propertyId: 'general', text: 'Hi' },
        'user1',
      )

      expect(cache.del).toHaveBeenCalledWith('unread:user2')
    })
  })

  describe('send', () => {
    it('should delegate to create', async () => {
      ;(sellerModel.findOne as jest.Mock).mockResolvedValue(null)
      ;(messageModel.create as jest.Mock).mockResolvedValue(mockDoc())

      const result = await messageService.send('user1', 'user2', 'general', 'Hello')

      expect(result).toBeDefined()
    })
  })

  describe('list', () => {
    it('should return messages between two users', async () => {
      const msgs = [mockDoc({ text: 'Hi' }), mockDoc({ text: 'Hello' })]
      ;(sellerModel.findOne as jest.Mock).mockResolvedValue(null)
      ;(messageModel.find as jest.Mock).mockReturnValue(mockCursor(msgs))

      const result = await messageService.list('user2', 'user1')

      expect(result).toHaveLength(2)
      expect(messageModel.find).toHaveBeenCalled()
      const filter = (messageModel.find as jest.Mock).mock.calls[0][0]
      expect(filter.$or).toBeDefined()
    })

    it('should return empty array when no messages', async () => {
      ;(sellerModel.findOne as jest.Mock).mockResolvedValue(null)
      ;(messageModel.find as jest.Mock).mockReturnValue(mockCursor([]))

      const result = await messageService.list('user2', 'user1')

      expect(result).toEqual([])
    })
  })

  describe('getConversations', () => {
    it('should group messages by participant', async () => {
      const msg1 = mockDoc({ fromUserId: 'user1', toUserId: 'user2', text: 'Last msg', createdAt: '2025-01-02' })
      const msg2 = mockDoc({ fromUserId: 'user2', toUserId: 'user1', text: 'Older', createdAt: '2025-01-01' })
      ;(sellerModel.findOne as jest.Mock).mockResolvedValue(null)
      ;(messageModel.find as jest.Mock).mockReturnValue(mockCursor([msg1, msg2]))
      ;(sellerModel.find as jest.Mock).mockResolvedValue([])

      const result = await messageService.getConversations('user1')

      expect(result).toHaveLength(1)
      expect(result[0].participantId).toBe('user2')
      expect(result[0].lastMessage).toBe('Last msg')
    })

    it('should return empty array when no conversations', async () => {
      ;(sellerModel.findOne as jest.Mock).mockResolvedValue(null)
      ;(messageModel.find as jest.Mock).mockReturnValue(mockCursor([]))

      const result = await messageService.getConversations('user1')

      expect(result).toEqual([])
    })
  })

  describe('getMessages', () => {
    it('should return messages and mark as read', async () => {
      const msgs = [mockDoc({ fromUserId: 'user1', toUserId: 'user2', read: false })]
      ;(sellerModel.findOne as jest.Mock).mockResolvedValue(null)
      ;(messageModel.find as jest.Mock).mockReturnValue(mockCursor(msgs))
      ;(messageModel.updateMany as jest.Mock).mockResolvedValue({ modifiedCount: 1 })

      const result = await messageService.getMessages('user2', 'user1')

      expect(result).toHaveLength(1)
      expect(messageModel.updateMany).toHaveBeenCalled()
      expect(cache.del).toHaveBeenCalledWith('unread:user1')
    })

    it('should return empty array for no messages', async () => {
      ;(sellerModel.findOne as jest.Mock).mockResolvedValue(null)
      ;(messageModel.find as jest.Mock).mockReturnValue(mockCursor([]))
      ;(messageModel.updateMany as jest.Mock).mockResolvedValue({ modifiedCount: 0 })

      const result = await messageService.getMessages('user2', 'user1')

      expect(result).toEqual([])
    })
  })

  describe('markRead', () => {
    it('should mark single message as read', async () => {
      const msg = mockDoc({ read: false })
      ;(messageModel.findById as jest.Mock).mockResolvedValue(msg)

      await messageService.markRead('msg1', 'user1')

      expect(messageModel.findById).toHaveBeenCalledWith('msg1')
      expect(msg.read).toBe(true)
      expect(msg.save).toHaveBeenCalled()
      expect(cache.del).toHaveBeenCalledWith('unread:user1')
    })

    it('should throw NotFoundError for missing message', async () => {
      ;(messageModel.findById as jest.Mock).mockResolvedValue(null)

      await expect(messageService.markRead('invalid', 'user1')).rejects.toThrow(NotFoundError)
    })
  })

  describe('updateMessage', () => {
    it('should edit text and set edited flag', async () => {
      const msg = mockDoc({ fromUserId: 'user1', text: 'Original' })
      ;(sellerModel.findOne as jest.Mock).mockResolvedValue(null)
      ;(messageModel.findById as jest.Mock).mockResolvedValue(msg)

      await messageService.updateMessage('msg1', 'Updated text', 'user1')

      expect(msg.text).toBe('Updated text')
      expect(msg.edited).toBe(true)
      expect(msg.save).toHaveBeenCalled()
    })

    it('should throw NotFoundError for missing message', async () => {
      ;(messageModel.findById as jest.Mock).mockResolvedValue(null)

      await expect(messageService.updateMessage('invalid', 'new text', 'user1')).rejects.toThrow(NotFoundError)
    })

    it('should throw if not the owner', async () => {
      const msg = mockDoc({ fromUserId: 'user1' })
      ;(sellerModel.findOne as jest.Mock).mockResolvedValue(null)
      ;(messageModel.findById as jest.Mock).mockResolvedValue(msg)

      await expect(messageService.updateMessage('msg1', 'new text', 'user3')).rejects.toThrow(NotFoundError)
    })
  })

  describe('deleteMessage', () => {
    it('should remove message', async () => {
      const msg = mockDoc({ fromUserId: 'user1', toUserId: 'user2' })
      ;(sellerModel.findOne as jest.Mock).mockResolvedValue(null)
      ;(messageModel.findById as jest.Mock).mockResolvedValue(msg)
      ;(messageModel.findByIdAndDelete as jest.Mock).mockResolvedValue(msg)

      const result = await messageService.deleteMessage('msg1', 'user1')

      expect(messageModel.findByIdAndDelete).toHaveBeenCalledWith('msg1')
      expect(result.id).toBe('msg1')
    })

    it('should throw NotFoundError for missing message', async () => {
      ;(messageModel.findById as jest.Mock).mockResolvedValue(null)

      await expect(messageService.deleteMessage('invalid', 'user1')).rejects.toThrow(NotFoundError)
    })

    it('should throw if not the owner', async () => {
      const msg = mockDoc({ fromUserId: 'user1' })
      ;(sellerModel.findOne as jest.Mock).mockResolvedValue(null)
      ;(messageModel.findById as jest.Mock).mockResolvedValue(msg)

      await expect(messageService.deleteMessage('msg1', 'user3')).rejects.toThrow(NotFoundError)
    })
  })

  describe('getUnreadCount', () => {
    it('should return unread count', async () => {
      ;(sellerModel.findOne as jest.Mock).mockResolvedValue(null)
      ;(cache.wrap as jest.Mock).mockImplementation((_key: string, fn: () => Promise<number>) => fn())
      ;(messageModel.countDocuments as jest.Mock).mockResolvedValue(5)

      const result = await messageService.getUnreadCount('user1')

      expect(result).toBe(5)
      expect(messageModel.countDocuments).toHaveBeenCalledWith({ toUserId: 'user1', read: false })
    })

    it('should return 0 when no unread messages', async () => {
      ;(sellerModel.findOne as jest.Mock).mockResolvedValue(null)
      ;(cache.wrap as jest.Mock).mockImplementation((_key: string, fn: () => Promise<number>) => fn())
      ;(messageModel.countDocuments as jest.Mock).mockResolvedValue(0)

      const result = await messageService.getUnreadCount('user1')

      expect(result).toBe(0)
    })

    it('should cache the unread count', async () => {
      ;(sellerModel.findOne as jest.Mock).mockResolvedValue(null)
      ;(cache.wrap as jest.Mock).mockImplementation((_key: string, fn: () => Promise<number>) => fn())
      ;(messageModel.countDocuments as jest.Mock).mockResolvedValue(3)

      await messageService.getUnreadCount('user1')

      expect(cache.wrap).toHaveBeenCalledWith('unread:user1', expect.any(Function), 30)
    })
  })
})
