import { describe, expect, it } from 'vitest'
import request from 'supertest'

import { createApp } from '../../src/app.js'

const app = createApp()

describe('API health & docs', () => {
  it('GET /api/health returns envelope', async () => {
    const res = await request(app).get('/api/health')
    expect([200, 503]).toContain(res.status)
    expect(res.body.success).toBeDefined()
    expect(res.body.meta?.requestId).toBeTruthy()
  })

  it('GET /api/version returns api v1', async () => {
    const res = await request(app).get('/api/version').expect(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data.api).toBe('v1')
  })

  it('GET /api/docs/json serves OpenAPI 3.1', async () => {
    const res = await request(app).get('/api/docs/json').expect(200)
    expect(res.body.openapi).toBe('3.1.0')
    expect(Object.keys(res.body.paths).length).toBeGreaterThan(100)
  })

  it('GET /api/openapi.json serves OpenAPI 3.1', async () => {
    const res = await request(app).get('/api/openapi.json').expect(200)
    expect(res.body.openapi).toBe('3.1.0')
    expect(Object.keys(res.body.paths).length).toBeGreaterThan(100)
  })

  it('GET /api/docs returns swagger html pointing at /api/openapi.json', async () => {
    const res = await request(app).get('/api/docs').expect(200)
    expect(res.text).toContain('swagger-ui')
    expect(res.text).toContain('/api/openapi.json')
    expect(res.text).toContain('/api/v1/csrf')
    expect(res.text).toContain('X-CSRF-Token')
    expect(res.text).toContain('requestInterceptor')
    expect(res.text).toContain('responseInterceptor')
    expect(res.text).toContain('mfx_csrf')
    expect(res.text).toContain('csrfToken')

    const setCookie = res.headers['set-cookie'] ?? []
    const csrfLine = setCookie.find((c: string) => c.startsWith('mfx_csrf='))
    expect(csrfLine).toBeTruthy()
    expect(csrfLine!.toLowerCase()).toMatch(/samesite=lax/)
    expect(csrfLine!.toLowerCase()).not.toMatch(/httponly/)
  })

  it('GET /api/v1/csrf issues readable mfx_csrf cookie and returns token', async () => {
    const res = await request(app).get('/api/v1/csrf').expect(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data.csrfToken).toMatch(/^[A-Za-z0-9_-]+$/)

    const setCookie = res.headers['set-cookie'] ?? []
    const csrfLine = setCookie.find((c: string) => c.startsWith('mfx_csrf='))
    expect(csrfLine).toBeTruthy()
    expect(csrfLine).toContain(`mfx_csrf=${res.body.data.csrfToken}`)
    expect(csrfLine!.toLowerCase()).toMatch(/samesite=lax/)
    expect(csrfLine!.toLowerCase()).not.toMatch(/httponly/)
  })

  it('GET /api/openapi.json also issues mfx_csrf cookie', async () => {
    const res = await request(app).get('/api/openapi.json').expect(200)
    expect(res.body.openapi).toBe('3.1.0')
    const setCookie = res.headers['set-cookie'] ?? []
    expect(setCookie.some((c: string) => c.startsWith('mfx_csrf='))).toBe(true)
  })

  it('GET /api/redoc returns redoc html pointing at /api/openapi.json', async () => {
    const res = await request(app).get('/api/redoc').expect(200)
    expect(res.text.toLowerCase()).toContain('redoc')
    expect(res.text).toContain('/api/openapi.json')
  })

  it('unknown route returns 404 envelope', async () => {
    const res = await request(app).get('/api/v1/does-not-exist').expect(404)
    expect(res.body.success).toBe(false)
    expect(res.body.error.code).toBe('NOT_FOUND')
  })
})
