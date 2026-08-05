import { readFileSync } from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'
import request from 'supertest'

import { createApp } from '../../src/app.js'

const app = createApp()

const openApi = JSON.parse(
  readFileSync(path.resolve(process.cwd(), 'openapi/openapi.json'), 'utf8'),
) as { paths: Record<string, unknown> }

describe('API contract coverage (smoke)', () => {
  it('OpenAPI documents at least 190 paths', () => {
    expect(Object.keys(openApi.paths).length).toBeGreaterThanOrEqual(190)
  })

  it('public CMS bootstrap responds', async () => {
    const res = await request(app).get('/api/v1/cms/public')
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data.landing || res.body.data.platform).toBeTruthy()
  })

  it('public settings respond', async () => {
    const res = await request(app).get('/api/v1/settings/public').expect(200)
    expect(res.body.data.companyName || res.body.data.defaultCurrency).toBeTruthy()
  })

  it('public trades respond', async () => {
    const res = await request(app).get('/api/v1/trades/public')
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
  })

  it('public performance respond', async () => {
    const res = await request(app).get('/api/v1/performance/public')
    expect(res.status).toBe(200)
  })

  it('notifications require auth', async () => {
    const res = await request(app).get('/api/v1/notifications')
    expect(res.status).toBe(401)
  })

  it('support tickets require auth', async () => {
    const res = await request(app).get('/api/v1/support/tickets')
    expect(res.status).toBe(401)
  })

  it('reports export require auth', async () => {
    const res = await request(app).post('/api/v1/reports/export').send({
      type: 'DAILY',
      format: 'JSON',
    })
    expect(res.status).toBe(401)
  })
})
