import { randomUUID } from 'node:crypto'

import { describe, expect, it } from 'vitest'
import request from 'supertest'

import { createApp } from '../../src/app.js'

const app = createApp()

describe('USD-only withdrawal HTTP auth', () => {
  it('rejects unauthenticated withdrawal create', async () => {
    const res = await request(app).post('/api/v1/withdrawals').send({
      amount: '40.00',
      payoutMethodId: randomUUID(),
      otp: '424242',
      idempotencyKey: `usd-wd-http-${randomUUID()}`,
    })
    expect(res.status).toBe(401)
  })
})
