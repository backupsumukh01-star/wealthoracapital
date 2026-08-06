import { describe, expect, it } from 'vitest'
import request from 'supertest'
import { createApp } from '../../src/app.js'

const app = createApp()

describe('CORS preflight', () => {
  it('allows cache-control on auth register OPTIONS', async () => {
    const res = await request(app)
      .options('/api/v1/auth/register')
      .set('Origin', 'http://localhost:3000')
      .set('Access-Control-Request-Method', 'POST')
      .set('Access-Control-Request-Headers', 'cache-control,content-type,x-csrf-token,pragma,expires')

    expect(res.status).toBe(204)
    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:3000')
    expect(res.headers['access-control-allow-credentials']).toBe('true')
    const allowed = String(res.headers['access-control-allow-headers'] ?? '').toLowerCase()
    expect(allowed).toContain('cache-control')
    expect(allowed).toContain('content-type')
    expect(allowed).toContain('pragma')
    expect(allowed).toContain('x-csrf-token')
  })

  it('allows cache-control on cms public and auth me OPTIONS', async () => {
    for (const path of ['/api/v1/cms/public', '/api/v1/auth/me']) {
      const res = await request(app)
        .options(path)
        .set('Origin', 'http://localhost:3000')
        .set('Access-Control-Request-Method', 'GET')
        .set('Access-Control-Request-Headers', 'cache-control,accept')
      expect(res.status).toBe(204)
      expect(String(res.headers['access-control-allow-headers'] ?? '').toLowerCase()).toContain('cache-control')
    }
  })
})
