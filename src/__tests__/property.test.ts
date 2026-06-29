import request from 'supertest'
import app from '../app'
import { propertyModel } from '../modules/property/property.model'
import { sellerModel } from '../modules/seller/seller.model'
import { userModel } from '../modules/user/user.model'
import bcrypt from 'bcryptjs'

describe('Properties API', () => {
  let cookies: string
  let sellerId: string
  let propertyId: string

  function extractCookies(res: request.Response): string {
    const c = res.headers['set-cookie']
    if (!c) return ''
    const cookies = Array.isArray(c) ? c : [c]
    return cookies.map((s: string) => s.split(';')[0]).join('; ')
  }

  beforeEach(async () => {
    const salt = await bcrypt.genSalt(10)
    const hashed = await bcrypt.hash('password123', salt)
    const user = await userModel.create({
      firstName: 'Test',
      lastName: 'User',
      phone: '+998901234567',
      password: hashed,
    })
    const regUserId = String(user._id)

    const seller = await sellerModel.create({
      userId: regUserId,
      name: 'Test Seller',
      phone: '+998901234567',
      rating: 5.0,
      totalListings: 0,
    })
    sellerId = String(seller._id)

    const apiEmail = `test${String(Math.random()).slice(2, 8)}@example.com`
    const registerRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        firstName: 'Test',
        lastName: 'User',
        email: apiEmail,
        password: 'password123',
      })

    expect(registerRes.status).toBe(201)

    const apiUserId = registerRes.body.data.user.id
    cookies = extractCookies(registerRes)

    await sellerModel.create({
      userId: apiUserId,
      name: 'Test Seller',
      phone: '',
      rating: 5.0,
      totalListings: 0,
    })
  })

  describe('POST /api/v1/properties', () => {
    it('should create a property', async () => {
      const res = await request(app)
        .post('/api/v1/properties')
        .set('Cookie', cookies)
        .send({
          title: 'Test Property',
          description: 'A nice test property with good location',
          price: 50000,
          type: 'apartment',
          dealType: 'sale',
          status: 'ready',
          rooms: 3,
          area: 75,
          location: {
            address: 'Toshkent, Yunusobod',
            lat: 41.2995,
            lng: 69.2401,
          },
        })

      expect(res.status).toBe(201)
      expect(res.body.success).toBe(true)
      expect(res.body.data.title).toBe('Test Property')
      propertyId = res.body.data.id
    })

    it('should reject property with missing required fields', async () => {
      const res = await request(app)
        .post('/api/v1/properties')
        .set('Cookie', cookies)
        .send({
          title: 'Test',
        })

      expect(res.status).toBe(400)
    })
  })

  describe('GET /api/v1/properties', () => {
    beforeEach(async () => {
      for (let i = 0; i < 3; i++) {
        await propertyModel.create({
          sellerId,
          title: `Property ${i}`,
          description: `Description ${i}`,
          price: 50000 + i * 10000,
          type: 'apartment',
          dealType: 'sale',
          status: 'ready',
          rooms: 2 + i,
          area: 50 + i * 10,
          isActive: true,
          location: { address: 'Toshkent', lat: 41.3, lng: 69.2 },
        })
      }
    })

    it('should list all properties', async () => {
      const res = await request(app)
        .get('/api/v1/properties')

      expect(res.status).toBe(200)
      expect(res.body.data.length).toBe(3)
    })

    it('should filter by dealType', async () => {
      const res = await request(app)
        .get('/api/v1/properties?dealType=sale')

      expect(res.status).toBe(200)
      expect(res.body.data.length).toBe(3)
    })

    it('should paginate results', async () => {
      const res = await request(app)
        .get('/api/v1/properties?page=1&limit=2')

      expect(res.status).toBe(200)
      expect(res.body.data.length).toBe(2)
      expect(res.body.totalPages).toBe(2)
    })

    it('should reject NoSQL injection attempts', async () => {
      const res = await request(app)
        .get('/api/v1/properties?price[$gt]=0')

      expect(res.status).toBe(200)
    })
  })

  describe('GET /api/v1/properties/:id', () => {
    beforeEach(async () => {
      const prop = await propertyModel.create({
        sellerId,
        title: 'Test Property',
        description: 'A nice test property',
        price: 50000,
        type: 'apartment',
        dealType: 'sale',
        status: 'ready',
        rooms: 3,
        area: 75,
        isActive: true,
        location: { address: 'Toshkent', lat: 41.3, lng: 69.2 },
      })
      propertyId = String(prop._id)
    })

    it('should get property by id', async () => {
      const res = await request(app)
        .get(`/api/v1/properties/${propertyId}`)

      expect(res.status).toBe(200)
      expect(res.body.title).toBe('Test Property')
    })

    it('should return 404 for non-existent property', async () => {
      const res = await request(app)
        .get('/api/v1/properties/507f1f77bcf86cd799439011')

      expect(res.status).toBe(404)
    })
  })

  describe('DELETE /api/v1/properties/:id', () => {
    beforeEach(async () => {
      const prop = await propertyModel.create({
        sellerId,
        title: 'Test Property',
        description: 'A nice test property',
        price: 50000,
        type: 'apartment',
        dealType: 'sale',
        status: 'ready',
        rooms: 3,
        area: 75,
        isActive: true,
        location: { address: 'Toshkent', lat: 41.3, lng: 69.2 },
      })
      propertyId = String(prop._id)
    })

    it('should delete own property', async () => {
      const res = await request(app)
        .delete(`/api/v1/properties/${propertyId}`)
        .set('Cookie', cookies)

      expect(res.status).toBe(200)
    })

    it('should reject delete without auth', async () => {
      const res = await request(app)
        .delete(`/api/v1/properties/${propertyId}`)

      expect(res.status).toBe(401)
    })
  })
})
