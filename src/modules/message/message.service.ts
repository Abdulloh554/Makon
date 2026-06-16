import { messageModel } from './message.model'
import { userModel } from '../user/user.model'
import { cache } from '../../lib/cache'
import { NotFoundError } from '../../lib/errors'

const CACHE_TTL = {
  UNREAD_COUNT: 30,
} as const

async function toJSON(doc: Record<string, unknown>): Promise<Record<string, unknown>> {
  return typeof doc.toJSON === 'function' ? doc.toJSON() : doc
}

export async function list(userId: string, currentUserId: string) {
  const filter = {
    $or: [
      { fromUserId: currentUserId, toUserId: userId },
      { fromUserId: userId, toUserId: currentUserId },
    ],
  }
  const messages = await messageModel.find(filter).sort({ createdAt: 1 })
  return Promise.all(messages.map(toJSON))
}

export async function create(data: { toUserId: string; propertyId: string; text: string }, fromUserId: string) {
  const message = await messageModel.create({
    fromUserId,
    toUserId: data.toUserId,
    propertyId: data.propertyId || 'general',
    text: data.text,
  })
  await cache.del(`unread:${data.toUserId}`)
  return toJSON(message)
}

export async function send(fromUserId: string, toUserId: string, propertyId: string, text: string) {
  return create({ toUserId, propertyId, text }, fromUserId)
}

export async function getConversations(userId: string) {
  const messages = await messageModel.find({
    $or: [{ fromUserId: userId }, { toUserId: userId }],
  }).sort({ createdAt: -1 })

  const conversationMap = new Map<string, Record<string, unknown>>()

  for (const msg of messages) {
    const otherId = String(msg.fromUserId) === userId ? String(msg.toUserId) : String(msg.fromUserId)
    if (!conversationMap.has(otherId)) {
      conversationMap.set(otherId, {
        id: otherId,
        participantId: otherId,
        participantName: otherId,
        lastMessage: String(msg.text || '').slice(0, 100),
        lastMessageAt: String(msg.createdAt),
        unread: String(msg.fromUserId) !== userId && !msg.read ? 1 : 0,
      })
    } else if (String(msg.fromUserId) !== userId && !msg.read) {
      const existing = conversationMap.get(otherId)!
      existing.unread = (existing.unread as number) + 1
    }
  }

  return Array.from(conversationMap.values())
}

export async function getMessages(conversationId: string, userId: string) {
  const filter = {
    $or: [
      { fromUserId: userId, toUserId: conversationId },
      { fromUserId: conversationId, toUserId: userId },
    ],
  }
  const messages = await messageModel.find(filter).sort({ createdAt: 1 })

  // Mark messages as read
  for (const msg of messages) {
    if (String(msg.toUserId) === userId && !msg.read) {
      msg.read = true
      msg.readAt = new Date()
      await msg.save()
    }
  }

  await cache.del(`unread:${userId}`)
  return Promise.all(messages.map(toJSON))
}

export async function markRead(id: string, userId: string) {
  const message = await messageModel.findById(id)
  if (!message) throw new NotFoundError('Message not found')
  message.read = true
  message.readAt = new Date()
  await message.save()
  await cache.del(`unread:${userId}`)
  return toJSON(message)
}

export async function getUnreadCount(userId: string) {
  const cacheKey = `unread:${userId}`
  return cache.wrap(cacheKey, async () => {
    const count = await messageModel.countDocuments({ toUserId: userId, read: false })
    return count
  }, CACHE_TTL.UNREAD_COUNT)
}
