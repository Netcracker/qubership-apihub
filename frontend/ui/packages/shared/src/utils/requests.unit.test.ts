import { HttpError } from './responses'
import { isUnauthorizedError, requestJson, UNAUTHORIZED_STATUS } from './requests'

describe('requestJson with skipAuthHandling', () => {
  const originalFetch = global.fetch

  afterEach(() => {
    global.fetch = originalFetch
  })

  it('throws HttpError(401) instead of starting the login flow', async () => {
    global.fetch = jest.fn().mockResolvedValue(new Response(null, { status: UNAUTHORIZED_STATUS })) as typeof fetch

    const promise = requestJson('/user', { method: 'GET' }, { basePath: '/api/v1', skipAuthHandling: true })

    await expect(promise).rejects.toBeInstanceOf(HttpError)
    await promise.catch(error => {
      expect(isUnauthorizedError(error)).toBe(true)
      expect((error as HttpError).status).toBe(UNAUTHORIZED_STATUS)
    })
  })

  it('returns the payload for a successful response', async () => {
    global.fetch = jest.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: 'user-1' }), { status: 200, headers: { 'content-type': 'application/json' } }),
    ) as typeof fetch

    const user = await requestJson<{ id: string }>('/user', { method: 'GET' }, { basePath: '/api/v1', skipAuthHandling: true })
    expect(user.id).toBe('user-1')
  })

  it('isUnauthorizedError is false for other errors', () => {
    expect(isUnauthorizedError(new HttpError('Not found', '', 404))).toBe(false)
    expect(isUnauthorizedError(new Error('boom'))).toBe(false)
  })
})
