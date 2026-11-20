import objectHash, { NotUndefined } from 'object-hash'
import { isObject } from './objects'

const objectHashCache = new WeakMap<object, string>()

export type ObjectHashCache = WeakMap<object, string>

export const _calculateMd5Hash = (value: NotUndefined): string => {
  // object hash works only with object keys available in Object.keys() method

  // cache by reference for objects and functions
  //TODO: think of proper way/place to implement caching
  if (isObject(value)) {
    const cached = objectHashCache.get(value as object)
    if (cached !== undefined) {
      return cached
    }

    const hash = objectHash(value, { algorithm: 'md5' })
    objectHashCache.set(value as object, hash)
    return hash
  }

  return objectHash(value, { algorithm: 'md5' })
}

export const calculateHash = (
  value: unknown,
  objectHashCache?: ObjectHashCache,
): string => {
  if (value === undefined) return ''

  if (!objectHashCache || !isObject(value)) {
    return _calculateMd5Hash(value)
  }

  const cachedHash = objectHashCache.get(value)
  if (cachedHash) {
    return cachedHash
  }

  const hash = _calculateMd5Hash(value)
  objectHashCache.set(value, hash)
  return hash
}
