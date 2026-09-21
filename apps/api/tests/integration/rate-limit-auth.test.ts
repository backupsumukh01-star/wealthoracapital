import { randomUUID } from 'node:crypto'

import { describe, expect, it } from 'vitest'
import request from 'supertest'

import { createApp } from '../../src/app.js'

const app = createApp()

describe('Auth vs global rate-limit interaction', () => {
  it('CSRF bootstrap is not globally rate-limited', async () => {
    const csrf = await request(app).get('/api/v1/csrf')
    expect(csrf.status).toBe(200)
    expect(csrf.body.error?.code).not.toBe('RATE_LIMITED')
  })

  it('failed login is not answered with the global Too many requests body', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: `missing_${randomUUID().slice(0, 8)}@example.com`, password: 'SecurePass1!' })
    expect(res.status).not.toBe(429)
    expect(res.body.error?.message).not.toBe('Too many requests. Please try again later.')
  })

  it('Google OAuth start is not globally rate-limited', async () => {
    const res = await request(app).get('/api/v1/auth/google')
    expect(res.status).not.toBe(429)
    expect(res.body.error?.code).not.toBe('RATE_LIMITED')
  })

  it('unauthenticated Daily Return mutation is rejected by auth, not as a batch of client calls', async () => {
    const res = await request(app).post('/api/v1/admin/returns').send({
      date: '2026-01-15',
      returnPct: '0.10',
      idempotencyKey: `unauth-${randomUUID()}`,
    })
    expect(res.status).toBe(401)
    expect(res.body.error?.code).toBe('UNAUTHENTICATED')
  })
})
