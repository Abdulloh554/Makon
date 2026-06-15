import request from 'supertest'
import app from '../server'

describe('Auth API', () => {
  describe('POST /api/auth/register', () => {
    it('should register a new user', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          firstName: 'Test',
          lastName: 'User',
          phone: '+998901234567',
          password: 'password123',
        })

      expect(res.status).toBe(201)
      expect(res.body.success).toBe(true)
      expect(res.body.data).toHaveProperty('token')
      expect(res.body.data.user.firstName).toBe('Test')
    })

    it('should reject duplicate phone', async () => {
      await request(app)
        .post('/api/auth/register')
        .send({
          firstName: 'Test',
          lastName: 'User',
          phone: '+998901234568',
          password: 'password123',
        })

      const res = await request(app)
        .post('/api/auth/register')
        .send({
          firstName: 'Test',
          lastName: 'User',
          phone: '+998901234568',
          password: 'password123',
        })

      expect(res.status).toBe(409)
    })

    it('should reject missing required fields', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ firstName: 'Test' })

      expect(res.status).toBe(400)
    })

    it('should reject weak password', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          firstName: 'Weak',
          lastName: 'Password',
          phone: '+998901234570',
          password: '12',
        })

      expect(res.status).toBe(400)
    })
  })

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      await request(app)
        .post('/api/auth/register')
        .send({
          firstName: 'Login',
          lastName: 'Test',
          phone: '+998901234569',
          password: 'password123',
        })
    })

    it('should login with valid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          phone: '+998901234569',
          password: 'password123',
        })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data).toHaveProperty('token')
    })

    it('should reject invalid password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          phone: '+998901234569',
          password: 'wrongpassword',
        })

      expect(res.status).toBe(401)
    })

    it('should reject non-existent phone', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          phone: '+998900000000',
          password: 'password123',
        })

      expect(res.status).toBe(404)
    })
  })

  describe('POST /api/auth/logout', () => {
    it('should clear cookie', async () => {
      const res = await request(app).post('/api/auth/logout')

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
    })
  })

  describe('GET /api/auth/me', () => {
    it('should return current user when authenticated', async () => {
      const registerRes = await request(app)
        .post('/api/auth/register')
        .send({
          firstName: 'Me',
          lastName: 'Test',
          phone: '+998901234571',
          password: 'password123',
        })
      const token = registerRes.body.data.token

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`)

      expect(res.status).toBe(200)
      expect(res.body.data.firstName).toBe('Me')
      expect(res.body.data).not.toHaveProperty('password')
    })

    it('should reject without token', async () => {
      const res = await request(app).get('/api/auth/me')

      expect(res.status).toBe(401)
    })
  })

  describe('DELETE /api/auth/account', () => {
    it('should delete account and related data', async () => {
      const registerRes = await request(app)
        .post('/api/auth/register')
        .send({
          firstName: 'Delete',
          lastName: 'Me',
          phone: '+998901234572',
          password: 'password123',
        })
      const token = registerRes.body.data.token

      const res = await request(app)
        .delete('/api/auth/account')
        .set('Authorization', `Bearer ${token}`)

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)

      const meRes = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`)

      expect(meRes.status).toBe(401)
    })
  })
})
