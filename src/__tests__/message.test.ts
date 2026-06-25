import request from 'supertest'
import app from '../app'

describe('Messages API', () => {
  let cookies: string

  function extractCookies(res: request.Response): string {
    const c = res.headers['set-cookie']
    if (!c) return ''
    const cookies = Array.isArray(c) ? c : [c]
    return cookies.map((s: string) => s.split(';')[0]).join('; ')
  }

  beforeEach(async () => {
    const registerRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        firstName: 'Test',
        lastName: 'User',
        phone: '+998901234567',
        password: 'password123',
      })
    cookies = extractCookies(registerRes)
  })

  describe('POST /api/v1/messages', () => {
    it('should send a message', async () => {
      const res = await request(app)
        .post('/api/v1/messages')
        .set('Cookie', cookies)
        .send({
          toUserId: '507f1f77bcf86cd799439011',
          propertyId: 'general',
          text: 'Hello, I am interested in your property',
        })

      expect(res.status).toBe(201)
      expect(res.body.data.text).toBe('Hello, I am interested in your property')
    })

    it('should reject message without text', async () => {
      const res = await request(app)
        .post('/api/v1/messages')
        .set('Cookie', cookies)
        .send({
          toUserId: '507f1f77bcf86cd799439011',
          propertyId: 'general',
          text: '',
        })

      expect(res.status).toBe(400)
    })
  })

  describe('GET /api/v1/messages/unread', () => {
    it('should return unread count', async () => {
      const res = await request(app)
        .get('/api/v1/messages/unread')
        .set('Cookie', cookies)

      expect(res.status).toBe(200)
      expect(typeof res.body.unread).toBe('number')
    })
  })
})
