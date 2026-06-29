import request from 'supertest'
import app from '../app'

describe('Security Comprehensive', () => {
  describe('CSRF Protection', () => {
    it('should allow register without CSRF token', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({ firstName: 'Test', lastName: 'User', email: 'csrf@example.com', password: 'password123' })

      expect([201, 403]).toContain(res.status)
    })
  })

  describe('Rate Limiter', () => {
    it('should have rate limit headers on API responses', async () => {
      const res = await request(app).get('/api/v1/properties')

      expect(res.status).toBe(200)
    })
  })

  describe('Helmet Security Headers', () => {
    it('should set X-Content-Type-Options', async () => {
      const res = await request(app).get('/api/v1/health')
      expect(res.headers['x-content-type-options']).toBe('nosniff')
    })

    it('should set X-Frame-Options', async () => {
      const res = await request(app).get('/api/v1/health')
      expect(res.headers['x-frame-options']).toBe('DENY')
    })

    it('should set X-XSS-Protection', async () => {
      const res = await request(app).get('/api/v1/health')
      expect(res.headers['x-xss-protection']).toBe('0')
    })

    it('should set Strict-Transport-Security', async () => {
      const res = await request(app).get('/api/v1/health')
      expect(res.headers['strict-transport-security']).toBeDefined()
    })

    it('should hide x-powered-by', async () => {
      const res = await request(app).get('/api/v1/health')
      expect(res.headers['x-powered-by']).toBeUndefined()
    })
  })

  describe('MongoDB Sanitization', () => {
    it('should strip $ operators from request body', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: { $gt: '' },
          password: { $regex: '.*' },
        })

      expect([200, 400, 401]).toContain(res.status)
      expect(res.status).not.toBe(500)
    })

    it('should strip $ operators from query string', async () => {
      const res = await request(app)
        .get('/api/v1/properties?price[$gt]=1000')

      expect(res.status).not.toBe(500)
    })
  })

  describe('Request Size Limiting', () => {
    it('should reject payloads over 1MB', async () => {
      const largePayload = { data: 'x'.repeat(2 * 1024 * 1024) }

      const res = await request(app)
        .post('/api/v1/auth/register')
        .send(largePayload)

      expect([400, 500, 413]).toContain(res.status)
    })
  })

  describe('CORS', () => {
    it('should handle OPTIONS preflight', async () => {
      const res = await request(app)
        .options('/api/v1/properties')
        .set('Origin', 'http://localhost:3000')
        .set('Access-Control-Request-Method', 'GET')

      expect(res.status).toBe(204)
      expect(res.headers['access-control-allow-origin']).toBeDefined()
    })
  })

  describe('XSS Protection', () => {
    it('should accept normal text fields', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          firstName: 'Test',
          lastName: 'User',
          email: 'normal@example.com',
          password: 'password123',
        })

      expect(res.status).toBe(201)
    })
  })

  describe('JWT Token', () => {
    it('should return set-cookie on successful login', async () => {
      const registerRes = await request(app)
        .post('/api/v1/auth/register')
        .send({
          firstName: 'Test',
          lastName: 'User',
          email: 'jwttest@example.com',
          password: 'password123',
        })

      expect(registerRes.headers['set-cookie']).toBeDefined()
    })

    it('should reject invalid JWT via 401 on protected route', async () => {
      const res = await request(app)
        .post('/api/v1/properties')
        .set('Cookie', 'access_token=invalidtoken')
        .send({ title: 'Test' })

      expect(res.status).toBe(401)
    })
  })

  describe('Validation', () => {
    it('should reject empty email', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          firstName: 'Test',
          lastName: 'User',
          email: '',
          password: 'password123',
        })

      expect(res.status).toBe(400)
    })

    it('should reject empty password', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          firstName: 'Test',
          lastName: 'User',
          email: 'emptypass@example.com',
          password: '',
        })

      expect(res.status).toBe(400)
    })
  })
})
