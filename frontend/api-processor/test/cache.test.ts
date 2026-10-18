import * as hashes from '../src/utils/hashes'
import { calculateHash, ObjectHashCache } from '../src/utils/hashes'
import { LocalRegistry } from './helpers'

describe('Hash cache tests', () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('Hash deprecated tests', () => {
    test('should publish OAS with deprecated items uses object hash cache', async () => {
      const getHashWithCacheSpy = jest.spyOn(hashes, 'calculateHash')
      const calculateObjectHashSpy = jest.spyOn(hashes, '_calculateMd5Hash')
      const portal = new LocalRegistry('deprecated')

      await portal.publish('deprecated', {
        packageId: 'deprecated',
        version: 'v1',
        files: [{ fileId: 'PublicRegistry API(4).yaml' }],
      })

      expect(getHashWithCacheSpy).toHaveBeenCalledTimes(12)
      expect(calculateObjectHashSpy).toHaveBeenCalledTimes(10)
    })

    test('should publish graphql with deprecated items uses object hash cache', async () => {
      const calculateObjectHashSpy = jest.spyOn(hashes, '_calculateMd5Hash')
      const getHashWithCacheSpy = jest.spyOn(hashes, 'calculateHash')
      const portal = new LocalRegistry('graphql')

      const result = await portal.publish(portal.packageId, {
        version: 'v1',
        packageId: portal.packageId,
      })

      expect(getHashWithCacheSpy).toHaveBeenCalledTimes(6)
      expect(calculateObjectHashSpy).toHaveBeenCalledTimes(4)

      const [operation1, operation2] = Array.from(result.operations.values())
      const deprecatedItems1 = operation1?.deprecatedItems || []
      const deprecatedItems2 = operation2?.deprecatedItems || []
      expect(deprecatedItems1[0]?.hash).toBe(deprecatedItems2[0]?.hash)
    })
  })

  describe('Normalized specification fragments hash cash tests', () => {
    test('uses existing cache entry without recalculating hash', () => {
      const cache: ObjectHashCache = new WeakMap()
      const spec = { info: { title: 'cached spec' } }
      cache.set(spec, 'cached-hash')

      const calculateSpy = jest.spyOn(hashes, '_calculateMd5Hash')

      const hash = hashes.calculateHash(spec, cache)

      expect(hash).toBe('cached-hash')
      expect(calculateSpy).not.toHaveBeenCalled()
    })

    test('returns cached hash for same object reference', () => {
      const cache: ObjectHashCache = new WeakMap()
      const spec = { paths: { '/users': { get: { summary: 'list users' } } } }
      const calculateSpy = jest.spyOn(hashes, '_calculateMd5Hash')

      const firstHash = hashes.calculateHash(spec, cache)
      const secondHash = hashes.calculateHash(spec, cache)

      expect(secondHash).toBe(firstHash)
      expect(calculateSpy).toHaveBeenCalledTimes(1)
      expect(cache.get(spec)).toBe(firstHash)
    })
  })
})
