const messageService = require('./message.service');

async function list(req, res, next) {
  try {
    const messages = await messageService.list(req.query.userId, req.userId);
    res.json(messages);
  } catch (err) {
    next(err);
  }
}

async function send(req, res, next) {
  try {
    const { toUserId, propertyId, text } = req.body;
    const message = await messageService.send(req.userId, toUserId, propertyId, text);
    res.status(201).json(message);
  } catch (err) {
    next(err);
  }
}

async function markRead(req, res, next) {
  try {
    const message = await messageService.markRead(req.params.id, req.userId);
    res.json(message);
  } catch (err) {
    next(err);
  }
}

async function unreadCount(req, res, next) {
  try {
    const result = await messageService.unreadCount(req.userId);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = { list, send, markRead, unreadCount };
