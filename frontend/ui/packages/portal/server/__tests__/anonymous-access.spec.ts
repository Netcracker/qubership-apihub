import type { Express } from 'express'
import request from 'supertest'

import { createApp } from '../createApp'

let app: Express

beforeEach(() => {
  app = createApp()
  delete process.env.MOCK_ANONYMOUS
  delete process.env.MOCK_ANONYMOUS_ACCESS
})

describe('system configuration', () => {
  it('reports anonymous access enabled by default', async () => {
    const res = await request(app).get('/api/v2/system/configuration')
    expect(res.status).toBe(200)
    expect(res.body.anonymousAccess).toBe(true)
    expect(res.body.defaultWorkspaceId).toBeTruthy()
    expect(res.body.authConfig.identityProviders.length).toBeGreaterThan(0)
  })

  it('reports anonymous access disabled when MOCK_ANONYMOUS_ACCESS=false', async () => {
    process.env.MOCK_ANONYMOUS_ACCESS = 'false'
    const res = await request(app).get('/api/v2/system/configuration')
    expect(res.body.anonymousAccess).toBe(false)
  })
})

describe('system stats', () => {
  it('returns numeric versions and operations counts', async () => {
    const res = await request(app).get('/api/v2/system/stats')
    expect(res.status).toBe(200)
    expect(typeof res.body.versions).toBe('number')
    expect(typeof res.body.operations).toBe('number')
  })
})

describe('current user', () => {
  it('returns the mock user when logged in', async () => {
    const res = await request(app).get('/api/v1/user')
    expect(res.status).toBe(200)
    expect(res.body.id).toBeTruthy()
    expect(res.body.systemRole).toBeTruthy()
  })

  it('returns 401 for an anonymous visitor', async () => {
    process.env.MOCK_ANONYMOUS = 'true'
    const res = await request(app).get('/api/v1/user')
    expect(res.status).toBe(401)
  })
})
