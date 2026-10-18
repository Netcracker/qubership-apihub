import { safeParse } from '@stoplight/json'
import { atom, WritableAtom } from 'jotai'

/**
 * @deprecated use `import { atomWithStorage } from 'jotai/utils'` instead
 */
export const persistAtom = <T>(key: string, atomInstance: WritableAtom<T, [T], void>): WritableAtom<T, [T], void> => {
  if (typeof window === 'undefined' || window.localStorage === undefined) {
    return atomInstance
  }

  return atom<T, [T], void>(
    get => {
      const localStorageValue = window.localStorage.getItem(key)
      const atomValue = get(atomInstance)

      if (localStorageValue === null) return atomValue

      const parsed = safeParse(localStorageValue)
      return parsed !== undefined ? (parsed as T) : atomValue
    },
    (_, set, update) => {
      try {
        /* setItem can throw when storage is full */
        window.localStorage.setItem(key, JSON.stringify(update))
      } catch (error) {
        console.error(error)
      }
      set(atomInstance, update)
    },
  )
}
