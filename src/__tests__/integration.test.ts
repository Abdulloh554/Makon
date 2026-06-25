import request from 'supertest'
import app from '../app'

function extractCookies(res: request.Response): string {
  const c = res.headers['set-cookie']
  if (!c) return ''
  const cookies = Array.isArray(c) ? c : [c]
  return cookies.map((s: string) => s.split(';')[0]).join('; ')
}

describe('Integration Tests', () => {
  describe('Auth Flow: Register → Login → Me', () => {
    let cookies: string

    it('should register a new user', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          firstName: 'Integration',
          lastName: 'User',
          phone: '+998901001001',
          password: 'password123',
        })

      expect(res.status).toBe(201)
      expect(res.body.success).toBe(true)
      expect(res.body.data.user.firstName).toBe('Integration')
      cookies = extractCookies(res)
    })

    it('should get current user with me endpoint', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Cookie', cookies)

      expect(res.status).toBe(200)
      expect(res.body.data.firstName).toBe('Integration')
    })

    it('should login with registered credentials', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ phone: '+998901001001', password: 'password123' })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.headers['set-cookie']).toBeDefined()
    })
  })

  describe('Property Flow: Create → Get → List → Delete', () => {
    let cookies: string
    let propertyId: string

    it('should register a seller', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({ firstName: 'Prop', lastName: 'Owner', phone: '+998901002002', password: 'password123' })

      expect(res.status).toBe(201)
      cookies = extractCookies(res)
    })

    it('should create a property', async () => {
      const res = await request(app)
        .post('/api/v1/properties')
        .set('Cookie', cookies)
        .send({
          title: 'Integration Property',
          description: 'A property created during integration test',
          price: 75000,
          type: 'apartment',
          dealType: 'sale',
          status: 'ready',
          rooms: 3,
          area: 80,
          location: { address: 'Toshkent, Chilonzor', lat: 41.28, lng: 69.21 },
        })

      expect(res.status).toBe(201)
      expect(res.body.success).toBe(true)
      expect(res.body.data.title).toBe('Integration Property')
      propertyId = res.body.data.id || res.body.data._id
    })

    it('should get property by id', async () => {
      const res = await request(app)
        .get(`/api/v1/properties/${propertyId}`)

      expect(res.status).toBe(200)
      expect(res.body.title).toBe('Integration Property')
    })

    it('should list properties with filters', async () => {
      const res = await request(app)
        .get('/api/v1/properties?dealType=sale&page=1&limit=10')

      expect(res.status).toBe(200)
      expect(res.body.data.length).toBeGreaterThanOrEqual(1)
    })

    it('should delete own property', async () => {
      const res = await request(app)
        .delete(`/api/v1/properties/${propertyId}`)
        .set('Cookie', cookies)

      expect(res.status).toBe(200)
    })
  })

  describe('Message Flow: Send → List → Read', () => {
    let cookies1: string
    let cookies2: string

    it('should register two users', async () => {
      const res1 = await request(app)
        .post('/api/v1/auth/register')
        .send({ firstName: 'Sender', lastName: 'One', phone: '+998901003001', password: 'password123' })
      expect(res1.status).toBe(201)
      cookies1 = extractCookies(res1)

      const res2 = await request(app)
        .post('/api/v1/auth/register')
        .send({ firstName: 'Receiver', lastName: 'One', phone: '+998901003002', password: 'password123' })
      expect(res2.status).toBe(201)
      cookies2 = extractCookies(res2)
    })

    it('should send a message between users', async () => {
      const me2 = await request(app).get('/api/v1/auth/me').set('Cookie', cookies2)

      const res = await request(app)
        .post('/api/v1/messages')
        .set('Cookie', cookies1)
        .send({
          toUserId: me2.body.data.id,
          propertyId: 'general',
          text: 'Hello from integration test!',
        })

      expect(res.status).toBe(201)
      expect(res.body.data.text).toBe('Hello from integration test!')
    })

    it('should get unread count', async () => {
      const res = await request(app)
        .get('/api/v1/messages/unread')
        .set('Cookie', cookies2)

      expect(res.status).toBe(200)
      expect(typeof res.body.unread).toBe('number')
    })
  })

  describe('Seller Flow: List → Get', () => {
    it('should list all sellers', async () => {
      const res = await request(app)
        .get('/api/v1/sellers')

      expect(res.status).toBe(200)
      expect(Array.isArray(res.body)).toBe(true)
    })
  })

  describe('Health Check', () => {
    it('should return OK status', async () => {
      const res = await request(app)
        .get('/api/v1/health')

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data.status).toBe('ok')
    })
  })

  describe('404 Handling', () => {
    it('should return 404 for unknown routes', async () => {
      const res = await request(app)
        .get('/api/v1/nonexistent')

      expect(res.status).toBe(404)
      expect(res.body.success).toBe(false)
    })
  })
})
