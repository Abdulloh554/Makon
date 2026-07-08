import request from 'supertest'
import app from '../app'
import { userModel } from '../modules/user/user.model'
import bcrypt from 'bcryptjs'

export function extractCookies(res: request.Response): string {
  const c = res.headers['set-cookie']
  if (!c) return ''
  const cookies = Array.isArray(c) ? c : [c]
  return cookies.map((s: string) => s.split(';')[0]).join('; ')
}

describe('Auth API', () => {
  describe('POST /api/v1/auth/register', () => {
    it('should register a new user and return user data', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          username: 'testuser',
          phone: '+998901234567',
          password: 'password123',
        })

      expect(res.status).toBe(201)
      expect(res.body.success).toBe(true)
      expect(res.body.data.user.username).toBe('testuser')
      expect(res.body.data.user.phone).toBe('+998901234567')
      expect(res.body.data.user.password).toBeUndefined()
      expect(res.headers['set-cookie']).toBeDefined()
    })

    it('should reject duplicate phone', async () => {
      await request(app)
        .post('/api/v1/auth/register')
        .send({
          username: 'testuser',
          phone: '+998901234567',
          password: 'password123',
        })

      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          username: 'testuser2',
          phone: '+998901234567',
          password: 'password456',
        })

      expect(res.status).toBe(409)
      expect(res.body.success).toBe(false)
    })

    it('should reject invalid phone', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          username: 'Test',
          phone: '',
          password: 'password123',
        })

      expect(res.status).toBe(400)
    })
  })

  describe('POST /api/v1/auth/login', () => {
    beforeEach(async () => {
      const salt = await bcrypt.genSalt(10)
      const hashed = await bcrypt.hash('password123', salt)
      await userModel.create({
        username: 'loginuser',
        firstName: 'Login',
        lastName: 'User',
        phone: '+998901234560',
        email: '',
        password: hashed,
      })
    })

    it('should login with correct credentials', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          phone: '+998901234560',
          password: 'password123',
        })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.headers['set-cookie']).toBeDefined()
    })

    it('should reject wrong password', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          phone: '+998901234560',
          password: 'wrongpassword',
        })

      expect(res.status).toBe(401)
    })

    it('should reject non-existent user', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          phone: '+998901239999',
          password: 'password123',
        })

      expect(res.status).toBe(404)
    })
  })

  describe('GET /api/v1/auth/me', () => {
    it('should return user data when authenticated', async () => {
      const registerRes = await request(app)
        .post('/api/v1/auth/register')
        .send({
          username: 'authmeuser',
          phone: '+998901234561',
          password: 'password123',
        })

      const cookies = extractCookies(registerRes)
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Cookie', cookies)

      expect(res.status).toBe(200)
      expect(res.body.data.username).toBe('authmeuser')
    })

    it('should return 401 without auth', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')

      expect(res.status).toBe(401)
    })
  })

  describe('POST /api/v1/auth/refresh', () => {
    it('should refresh token', async () => {
      const registerRes = await request(app)
        .post('/api/v1/auth/register')
        .send({
          username: 'refreshtest',
          phone: '+998901234562',
          password: 'password123',
        })

      const cookies = extractCookies(registerRes)
      const res = await request(app)
        .post('/api/v1/auth/refresh')
        .set('Cookie', cookies)

      expect(res.status).toBe(200)
      expect(res.headers['set-cookie']).toBeDefined()
    })

    it('should return 401 without refresh token', async () => {
      const res = await request(app)
        .post('/api/v1/auth/refresh')

      expect([401, 429]).toContain(res.status)
    })
  })

  describe('POST /api/v1/auth/logout', () => {
    it('should clear cookies', async () => {
      const res = await request(app)
        .post('/api/v1/auth/logout')

      expect(res.status).toBe(200)
      const setCookieHeader = res.headers['set-cookie']
      expect(setCookieHeader).toBeDefined()
    })
  })
})
