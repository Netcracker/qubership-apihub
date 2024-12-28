import { MapKeysResult, MappingResolver } from '../types'

export const apihubCaseInsensitiveKeyMappingResolver: MappingResolver<string> = (before, after) => {
  const result: MapKeysResult<string> = { added: [], removed: [], mapped: {} }
  const afterKeys = [...new Set(Object.keys(after))]

  for (const _key of Object.keys(before)) {
    const key = _key.toLocaleLowerCase()
    const afterKeyIndex = afterKeys.findIndex(value => value.toLocaleLowerCase() === key)

    if (afterKeyIndex !== -1) {
      result.mapped[_key] = afterKeys[afterKeyIndex]
      afterKeys.splice(afterKeyIndex, 1)
    } else {
      result.removed.push(key)
    }
  }

  afterKeys.forEach((key) => result.added.push(key))

  return result
}
