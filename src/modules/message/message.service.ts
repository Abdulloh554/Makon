import { messageModel } from './message.model'
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

export async function send(fromUserId: string, toUserId: string, propertyId: string, text: string) {
  const message = await messageModel.create({
    fromUserId,
    toUserId,
    propertyId: propertyId || 'general',
    text,
  })
  await cache.del(`unread:${toUserId}`)
  return toJSON(message)
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

export async function unreadCount(userId: string) {
  const cacheKey = `unread:${userId}`
  return cache.wrap(cacheKey, async () => {
    const count = await messageModel.countDocuments({ toUserId: userId, read: false })
    return { unread: count }
  }, CACHE_TTL.UNREAD_COUNT)
}
