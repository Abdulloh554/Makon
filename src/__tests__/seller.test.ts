import request from 'supertest'
import app from '../server'

describe('Sellers API', () => {
  beforeAll(async () => {
    await request(app)
      .post('/api/auth/register')
      .send({
        firstName: 'Seller',
        lastName: 'Test',
        phone: '+998902222201',
        password: 'password123',
      })
  })

  describe('GET /api/sellers', () => {
    it('should return sellers list', async () => {
      const res = await request(app).get('/api/sellers')

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(Array.isArray(res.body.data)).toBe(true)
    })
  })

  describe('GET /api/sellers/:id', () => {
    it('should return a seller by valid ID', async () => {
      const listRes = await request(app).get('/api/sellers')
      const sellers = listRes.body.data
      if (!sellers || sellers.length === 0) return
      const sellerId = sellers[0]._id || sellers[0].id

      const res = await request(app).get(`/api/sellers/${sellerId}`)

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data).toHaveProperty('name')
    })

    it('should return 404 for non-existent seller', async () => {
      const res = await request(app).get('/api/sellers/nonexistentid123')

      expect(res.status).toBe(404)
      expect(res.body.success).toBe(false)
    })
  })

  describe('GET /api/sellers/:id/properties', () => {
    it('should return properties for a seller', async () => {
      const listRes = await request(app).get('/api/sellers')
      const sellers = listRes.body.data
      if (!sellers || sellers.length === 0) return
      const sellerId = sellers[0]._id || sellers[0].id

      const res = await request(app).get(`/api/sellers/${sellerId}/properties`)

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(Array.isArray(res.body.data)).toBe(true)
    })
  })
})
