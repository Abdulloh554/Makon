import { messageModel } from './message.model'
import { sellerModel } from '../seller/seller.model'
import { cache } from '../../utils/cache'
import { NotFoundError } from '../../utils/errors'


const CACHE_TTL = {
  UNREAD_COUNT: 30,
} as const

async function toJSON(doc: Record<string, unknown>): Promise<Record<string, unknown>> {
  return typeof doc.toJSON === 'function' ? doc.toJSON() : doc
}

export async function resolveUserId(id: string): Promise<string> {
  const seller = await sellerModel.findOne({ _id: id }).catch(() => null)
  if (seller) {
    const userId = String((seller as Record<string, unknown>).userId ?? '')
    if (userId) return userId
  }
  const sellerByUserId = await sellerModel.findOne({ userId: id }).catch(() => null)
  if (sellerByUserId) return id
  return id
}

async function resolveBothIds(id1: string, id2: string): Promise<{ id1: string; id2: string }> {
  const [resolved1, resolved2] = await Promise.all([resolveUserId(id1), resolveUserId(id2)])
  return { id1: resolved1, id2: resolved2 }
}

export async function list(userId: string, currentUserId: string) {
  const { id1: uid, id2: cuid } = await resolveBothIds(userId, currentUserId)
  const filter = {
    $or: [
      { fromUserId: cuid, toUserId: uid },
      { fromUserId: uid, toUserId: cuid },
    ],
  }
  const messages = await messageModel.find(filter).sort({ createdAt: 1 })
  return Promise.all(messages.map(toJSON))
}

export async function create(data: { toUserId: string; propertyId: string; text: string }, fromUserId: string) {
  console.log('[MESSAGE] create called:', { toUserId: data.toUserId, fromUserId, propertyId: data.propertyId })

  const resolvedTo = await resolveUserId(data.toUserId)
  const resolvedFrom = await resolveUserId(fromUserId)

  console.log('[MESSAGE] resolved IDs:', { resolvedTo, resolvedFrom })

  const message = await messageModel.create({
    fromUserId: resolvedFrom,
    toUserId: resolvedTo,
    propertyId: data.propertyId || 'general',
    text: data.text,
  })

  const saved = await toJSON(message)
  console.log('[MESSAGE] saved to DB:', { id: saved._id ?? saved.id })

  await cache.del(`unread:${resolvedTo}`)
  console.log('[MESSAGE] cache cleared for unread:', resolvedTo)

  return saved
}

export async function send(fromUserId: string, toUserId: string, propertyId: string, text: string) {
  return create({ toUserId, propertyId, text }, fromUserId)
}

export async function getConversations(userId: string) {
  const uid = await resolveUserId(userId)
  const messages = await messageModel.find({
    $or: [{ fromUserId: uid }, { toUserId: uid }],
  }).sort({ createdAt: -1 })

  const conversationMap = new Map<string, Record<string, unknown>>()

  for (const msg of messages) {
    const otherRaw = String(msg.fromUserId) === uid ? String(msg.toUserId) : String(msg.fromUserId)
    const otherId = await resolveUserId(otherRaw)
    if (!conversationMap.has(otherId)) {
      conversationMap.set(otherId, {
        id: otherId,
        participantId: otherId,
        participantName: otherId,
        lastMessage: String(msg.text || '').slice(0, 100),
        lastMessageAt: String(msg.createdAt),
        unread: String(msg.fromUserId) !== uid && !msg.read ? 1 : 0,
      })
    } else if (String(msg.fromUserId) !== uid && !msg.read) {
      const existing = conversationMap.get(otherId)!
      existing.unread = (existing.unread as number) + 1
    }
  }

  return Array.from(conversationMap.values())
}

export async function getMessages(conversationId: string, userId: string) {
  const { id1: cid, id2: uid } = await resolveBothIds(conversationId, userId)
  const filter = {
    $or: [
      { fromUserId: uid, toUserId: cid },
      { fromUserId: cid, toUserId: uid },
    ],
  }
  const messages = await messageModel.find(filter).sort({ createdAt: 1 })

  // Mark messages as read
  for (const msg of messages) {
    if (String(msg.toUserId) === uid && !msg.read) {
      msg.read = true
      msg.readAt = new Date()
      await msg.save()
    }
  }

  await cache.del(`unread:${uid}`)
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

export async function updateMessage(messageId: string, text: string, userId: string) {
  const message = await messageModel.findById(messageId)
  if (!message) throw new NotFoundError('Message not found')

  const fromId = String(message.fromUserId)
  const resolved = await resolveUserId(fromId)
  const uid = await resolveUserId(userId)
  if (resolved !== uid) throw new NotFoundError('Message not found')

  message.text = text
  message.edited = true
  message.editedAt = new Date()
  await message.save()

  const saved = await toJSON(message)
  return saved
}

export async function deleteMessage(messageId: string, userId: string) {
  const message = await messageModel.findById(messageId)
  if (!message) throw new NotFoundError('Message not found')

  const fromId = String(message.fromUserId)
  const resolved = await resolveUserId(fromId)
  const uid = await resolveUserId(userId)
  if (resolved !== uid) throw new NotFoundError('Message not found')

  const fromUserId = String(message.fromUserId)
  const toUserId = String(message.toUserId)

  await messageModel.findByIdAndDelete(messageId)
  return { id: messageId, fromUserId, toUserId }
}

export async function getUnreadCount(userId: string) {
  const uid = await resolveUserId(userId)
  const cacheKey = `unread:${uid}`
  return cache.wrap(cacheKey, async () => {
    const count = await messageModel.countDocuments({ toUserId: uid, read: false })
    return count
  }, CACHE_TTL.UNREAD_COUNT)
}
