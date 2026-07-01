import request from 'supertest'
import app from '../app'
import { sellerModel } from '../modules/seller/seller.model'
import { userModel } from '../modules/user/user.model'
import bcrypt from 'bcryptjs'

describe('Sellers API', () => {
  beforeAll(async () => {
    const salt = await bcrypt.genSalt(10)
    const hashed = await bcrypt.hash('password123', salt)
    const phone = `+9989000${String(Math.random()).slice(2, 7)}`
    const user = await userModel.create({
      firstName: 'Test',
      lastName: 'User',
      phone,
      password: hashed,
    })
    const userId = String(user._id)
    await sellerModel.create({
      userId,
      name: 'Test Seller',
      phone,
      rating: 5.0,
      totalListings: 3,
    })
  })

  describe('GET /api/v1/sellers', () => {
    it('should list all sellers', async () => {
      const res = await request(app)
        .get('/api/v1/sellers')

      expect(res.status).toBe(200)
      expect(Array.isArray(res.body.data)).toBe(true)
      expect(res.body.data.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('GET /api/v1/sellers/:id', () => {
    it('should return 404 for non-existent seller', async () => {
      const res = await request(app)
        .get('/api/v1/sellers/507f1f77bcf86cd799439011')

      expect(res.status).toBe(404)
    })
  })
})
