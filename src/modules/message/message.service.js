const messageModel = require('./message.model');
const cache = require('../../lib/cache');
const { NotFoundError } = require('../../lib/errors');

async function list(userId, currentUserId) {
  const filter = {
    $or: [
      { fromUserId: currentUserId, toUserId: userId },
      { fromUserId: userId, toUserId: currentUserId },
    ],
  };
  const messages = await messageModel.find(filter).sort({ createdAt: 1 });
  return messages.map((m) => m.toJSON());
}

async function send(fromUserId, toUserId, propertyId, text) {
  const message = await messageModel.create({
    fromUserId,
    toUserId,
    propertyId: propertyId || 'general',
    text,
  });
  await cache.del(`unread:${toUserId}`);
  return message.toJSON();
}

async function markRead(id, userId) {
  const message = await messageModel.findById(id);
  if (!message) throw new NotFoundError('Message not found');
  message.read = true;
  message.readAt = new Date();
  await message.save();
  await cache.del(`unread:${userId}`);
  return message.toJSON();
}

async function unreadCount(userId) {
  const cacheKey = `unread:${userId}`;
  return cache.wrap(cacheKey, async () => {
    const count = await messageModel.countDocuments({ toUserId: userId, read: false });
    return { unread: count };
  }, 30);
}

module.exports = { list, send, markRead, unreadCount };
