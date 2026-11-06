import type { Express } from 'express'
import request from 'supertest'

import { createApp } from '../createApp'

let app: Express

beforeEach(() => {
  app = createApp()
  delete process.env.MOCK_ANONYMOUS
})

const counts = (body: { packages: Array<{ favoritesCount: number }> }): number[] =>
  body.packages.map(({ favoritesCount }) => favoritesCount)

describe('popular packages', () => {
  it('returns packages ordered by favoritesCount desc', async () => {
    const res = await request(app).get('/api/v2/packages/popular?kind=package,dashboard&limit=12&showParents=true&lastReleaseVersionDetails=true')
    expect(res.status).toBe(200)
    const values = counts(res.body)
    expect(values.length).toBeGreaterThan(1)
    values.forEach(value => expect(value).toBeGreaterThan(0))
    for (let i = 1; i < values.length; i++) {
      expect(values[i]).toBeLessThanOrEqual(values[i - 1])
    }
  })

  it('respects limit', async () => {
    const res = await request(app).get('/api/v2/packages/popular?limit=3')
    expect(res.status).toBe(200)
    expect(res.body.packages).toHaveLength(3)
  })

  it('filters by kind', async () => {
    const res = await request(app).get('/api/v2/packages/popular?kind=dashboard')
    expect(res.status).toBe(200)
    expect(res.body.packages.length).toBeGreaterThan(0)
    res.body.packages.forEach((item: { kind: string }) => expect(item.kind).toBe('dashboard'))
  })

  it('works for an anonymous visitor', async () => {
    process.env.MOCK_ANONYMOUS = 'true'
    const res = await request(app).get('/api/v2/packages/popular')
    expect(res.status).toBe(200)
    expect(res.body.packages.length).toBeGreaterThan(0)
  })
})
