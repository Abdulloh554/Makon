import request from 'supertest'
import app from '../server'

describe('Messages API', () => {
  let token1: string
  let token2: string
  let user1Id: string
  let user2Id: string

  beforeAll(async () => {
    const res1 = await request(app)
      .post('/api/auth/register')
      .send({
        firstName: 'User',
        lastName: 'One',
        phone: '+998903333301',
        password: 'password123',
      })
    token1 = res1.body.data.token
    user1Id = res1.body.data.user.id || res1.body.data.user._id

    const res2 = await request(app)
      .post('/api/auth/register')
      .send({
        firstName: 'User',
        lastName: 'Two',
        phone: '+998903333302',
        password: 'password123',
      })
    token2 = res2.body.data.token
    user2Id = res2.body.data.user.id || res2.body.data.user._id
  })

  describe('POST /api/messages', () => {
    it('should send a message between users', async () => {
      const res = await request(app)
        .post('/api/messages')
        .set('Authorization', `Bearer ${token1}`)
        .send({
          toUserId: user2Id,
          text: 'Salom! Bu test xabar.',
          propertyId: 'general',
        })

      expect(res.status).toBe(201)
      expect(res.body.success).toBe(true)
      expect(res.body.data).toHaveProperty('text', 'Salom! Bu test xabar.')
    })

    it('should reject without auth', async () => {
      const res = await request(app)
        .post('/api/messages')
        .send({
          toUserId: user2Id,
          text: 'No auth test',
        })

      expect(res.status).toBe(401)
      expect(res.body.success).toBe(false)
    })

    it('should reject with empty text', async () => {
      const res = await request(app)
        .post('/api/messages')
        .set('Authorization', `Bearer ${token1}`)
        .send({
          toUserId: user2Id,
          text: '',
        })

      expect(res.status).toBe(400)
      expect(res.body.success).toBe(false)
    })

    it('should reject without toUserId', async () => {
      const res = await request(app)
        .post('/api/messages')
        .set('Authorization', `Bearer ${token1}`)
        .send({
          text: 'No recipient',
        })

      expect(res.status).toBe(400)
      expect(res.body.success).toBe(false)
    })
  })

  describe('GET /api/messages', () => {
    it('should list messages with a user', async () => {
      const res = await request(app)
        .get(`/api/messages?userId=${user2Id}`)
        .set('Authorization', `Bearer ${token1}`)

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(Array.isArray(res.body.data)).toBe(true)
    })

    it('should reject without userId query param', async () => {
      const res = await request(app)
        .get('/api/messages')
        .set('Authorization', `Bearer ${token1}`)

      expect(res.status).toBe(400)
      expect(res.body.success).toBe(false)
    })

    it('should reject without auth', async () => {
      const res = await request(app)
        .get(`/api/messages?userId=${user2Id}`)

      expect(res.status).toBe(401)
    })
  })

  describe('GET /api/messages/unread', () => {
    it('should return unread count', async () => {
      const res = await request(app)
        .get('/api/messages/unread')
        .set('Authorization', `Bearer ${token2}`)

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data).toHaveProperty('unread')
    })
  })

  describe('PATCH /api/messages/:id/read', () => {
    it('should mark message as read', async () => {
      const listRes = await request(app)
        .get(`/api/messages?userId=${user1Id}`)
        .set('Authorization', `Bearer ${token2}`)

      const messages = listRes.body.data
      if (!messages || messages.length === 0) return
      const msgId = messages[0]._id || messages[0].id

      const res = await request(app)
        .patch(`/api/messages/${msgId}/read`)
        .set('Authorization', `Bearer ${token2}`)

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data.read).toBe(true)
    })

    it('should return 404 for non-existent message', async () => {
      const res = await request(app)
        .patch('/api/messages/nonexistentid/read')
        .set('Authorization', `Bearer ${token1}`)

      expect(res.status).toBe(404)
      expect(res.body.success).toBe(false)
    })
  })
})
