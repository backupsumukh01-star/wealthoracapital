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
    expect(res.text).toContain('X-CSRF-Token')
    expect(res.text).toContain('requestInterceptor')
    expect(res.text).toContain('mfx_csrf')
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
