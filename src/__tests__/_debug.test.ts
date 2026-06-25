import request from 'supertest'
import app from '../app'

describe('DEBUG', () => {
  it('debug cookies', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ firstName: 'Test', lastName: 'User', phone: '+998901234560', password: 'password123' })
    console.log('Register status:', res.status)
    console.log('Body:', JSON.stringify(res.body))
    const raw = res.headers['set-cookie']
    console.log('Raw cookie:', JSON.stringify(raw))
    const extracted = (Array.isArray(raw) ? raw : [raw]).map((s: string) => s.split(';')[0]).join('; ')
    console.log('Extracted:', extracted)

    const meRes = await request(app)
      .get('/api/v1/auth/me')
      .set('Cookie', extracted)
    console.log('Me status:', meRes.status)
    console.log('Me body:', JSON.stringify(meRes.body))
    expect(meRes.status).toBe(200)
  })
})
