import request from 'supertest'
import app from '../server'

describe('Properties API', () => {
  let token: string
  let propertyId: string

  beforeAll(async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        firstName: 'Seller',
        lastName: 'Test',
        phone: '+998901111111',
        password: 'password123',
      })
    token = res.body.data.token
  })

  describe('POST /api/properties', () => {
    it('should create a property', async () => {
      const res = await request(app)
        .post('/api/properties')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Test Property',
          description: 'A nice property',
          price: 50000,
          type: 'apartment',
          dealType: 'sale',
          status: 'ready',
          area: 80,
          rooms: 3,
          location: {
            lat: 41.2995,
            lng: 69.2401,
            address: 'Tashkent, Uzbekistan',
          },
        })

      expect(res.status).toBe(201)
      expect(res.body.success).toBe(true)
      expect(res.body.data.title).toBe('Test Property')
      propertyId = res.body.data.id || res.body.data._id
    })

    it('should reject without auth', async () => {
      const res = await request(app)
        .post('/api/properties')
        .send({
          title: 'Test Property',
          price: 50000,
          type: 'apartment',
          dealType: 'sale',
          area: 80,
        })

      expect(res.status).toBe(401)
    })

    it('should reject with missing required fields', async () => {
      const res = await request(app)
        .post('/api/properties')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Incomplete' })

      expect(res.status).toBe(400)
    })
  })

  describe('GET /api/properties', () => {
    it('should return properties list', async () => {
      const res = await request(app).get('/api/properties')

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(Array.isArray(res.body.data)).toBe(true)
    })

    it('should filter by dealType', async () => {
      const res = await request(app).get('/api/properties?dealType=sale')

      expect(res.status).toBe(200)
      expect(res.body.data.every((p: Record<string, unknown>) => p.dealType === 'sale')).toBe(true)
    })

    it('should filter by property type', async () => {
      const res = await request(app).get('/api/properties?propertyType=apartment')

      expect(res.status).toBe(200)
      expect(res.body.data.every((p: Record<string, unknown>) => p.type === 'apartment')).toBe(true)
    })
  })

  describe('GET /api/properties/:id', () => {
    it('should return a property by ID', async () => {
      if (!propertyId) return
      const res = await request(app).get(`/api/properties/${propertyId}`)

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data.title).toBe('Test Property')
    })

    it('should return 404 for non-existent property', async () => {
      const res = await request(app).get('/api/properties/nonexistentid123')

      expect(res.status).toBe(404)
    })
  })

  describe('PATCH /api/properties/:id', () => {
    it('should update a property', async () => {
      if (!propertyId) return
      const res = await request(app)
        .patch(`/api/properties/${propertyId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ price: 60000, title: 'Updated Property' })

      expect(res.status).toBe(200)
      expect(res.body.data.title).toBe('Updated Property')
      expect(res.body.data.price).toBe(60000)
    })

    it('should reject update without auth', async () => {
      if (!propertyId) return
      const res = await request(app)
        .patch(`/api/properties/${propertyId}`)
        .send({ price: 70000 })

      expect(res.status).toBe(401)
    })
  })

  describe('DELETE /api/properties/:id', () => {
    it('should delete a property', async () => {
      if (!propertyId) return
      const res = await request(app)
        .delete(`/api/properties/${propertyId}`)
        .set('Authorization', `Bearer ${token}`)

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
    })

    it('should reject delete without auth', async () => {
      if (!propertyId) return
      const res = await request(app)
        .delete(`/api/properties/${propertyId}`)

      expect(res.status).toBe(401)
    })
  })
})
