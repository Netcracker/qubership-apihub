import { isArray, isObject, JSON_ROOT_KEY, syncClone } from '../src'

interface OddEven {
  value: number
  even: {
    value: number
    odd: OddEven
  }
}

interface ACycle {
  value: string
  b: BCycle;
}

interface BCycle {
  value: string
  a: ACycle;
}

interface Cycle {
  a: ACycle;
  b: BCycle;
}

const $lazyClone = Symbol('$lazyClone')

interface MyCloneState {
  readonly sourceInProgress: Map<unknown, ((copy: unknown) => void)[] | Record<PropertyKey, unknown>>
}

describe('clone test', () => {
  it('should clone object', () => {
    const source = {
      name: 'John',
      age: 30,
      address: {
        street: '123 Main St',
        city: 'New York',
      },
    }

    const data = syncClone(source)

    expect(data).toEqual(source)
    expect(data === source).toEqual(false)
  })

  it('should clone symbols', () => {
    const sym = Symbol('sym')
    const source = {
      name: 'John',
      [sym]: true,
      address: {
        street: '123 Main St',
        [sym]: [{
          copyToo: 'yes',
        }],
      },
    }

    const data = syncClone(source)

    expect(data).toEqual({
      name: 'John',
      [sym]: true,
      address: {
        street: '123 Main St',
        [sym]: [{
          copyToo: 'yes',
        }],
      },
    })
    expect(data === source).toEqual(false)
  })

  it('should allow to control cycle ref during clone', () => {
    const odd: any = {
      value: 1,
      even: {
        value: 2,
        odd: {},
      },
    }
    odd.even.odd = odd

    const oddResult = syncClone(odd, ({ key, value, state }) => {
      const { cloneTimes, cloneCounter, depth } = state
      if (key === 'value' && typeof value === 'number') {
        return { value: depth }
      }
      state.depth++
      let currentCloneCount = cloneCounter.get(value)
      if (currentCloneCount === undefined) {
        currentCloneCount = -1
      }
      currentCloneCount++
      cloneCounter.set(value, currentCloneCount)

      return { value: value, done: cloneTimes <= currentCloneCount }
    }, {
      state: { cloneTimes: 3, cloneCounter: new Map<unknown, number>(), depth: 0 },
    }) as OddEven
    expect(oddResult.value).toBe(1)
    expect(oddResult.even.value).toBe(2)
    expect(oddResult.even.odd.value).toBe(3)
    expect(oddResult.even.odd.even.value).toBe(4)
    expect(oddResult.even.odd.even.odd.value).toBe(5)
    expect(oddResult.even.odd.even.odd.even.value).toBe(6)
    expect(oddResult.even.odd.even.odd.even.odd).toBeUndefined()

    expect(odd.value).toBe(1)
    expect(odd.even.value).toBe(2)
    expect(odd.even.odd).toBe(odd)
  })

  it('should allow to dereferencing logical cycles to physical', () => {
    const root: any = {
      a: {
        value: 'a',
        b: '#b', //-> {} 2
      },
      b: { //1
        value: 'b',
        a: '#a',
      },
    }

    const rootCopy = syncClone<MyCloneState>(root, ({ key, value, state }) => {
      const safeKey = key ?? JSON_ROOT_KEY
      if (typeof value === 'string') {
        if (value.startsWith('#')) {
          const ref = value.substring(1)
          const referenceObject = state.root[JSON_ROOT_KEY][ref]
          if (referenceObject) {
            state.node[safeKey] = referenceObject
            return { done: true }
          }
          const sourceObject = root[ref]
          if (sourceObject) {
            const deferredListOrCopiedObject = state.sourceInProgress.get(sourceObject)
            if (deferredListOrCopiedObject) {
              if (isArray(deferredListOrCopiedObject)) {
                deferredListOrCopiedObject.push(copy => state.node[safeKey] = copy)
                return { done: true }
              } else {
                state.node[safeKey] = deferredListOrCopiedObject
                return { done: true }
              }
            } else {
              const list: ((copy: unknown) => void)[] = []
              state.sourceInProgress.set(sourceObject, list)
              return {
                value: sourceObject,
                afterHooksHook: () => {
                  while (list.length) list.pop()!(state.node[safeKey])
                  state.sourceInProgress.set(sourceObject, state.node[safeKey] as Record<PropertyKey, unknown>)
                },
              }
            }
          }
          return { terminate: true }
        }
      }
      if (isObject(value)) {
        const deferredListOrCopiedObject = state.sourceInProgress.get(value)
        if (deferredListOrCopiedObject) {
          if (isArray(deferredListOrCopiedObject)) {
            deferredListOrCopiedObject.push(copy => state.node[safeKey] = copy)
            return { done: true }
          } else {
            state.node[safeKey] = deferredListOrCopiedObject
            return { done: true }
          }
        }
      }
      return { value }
    }, { state: { sourceInProgress: new Map<unknown, ((copy: unknown) => void)[]>() } }) as Cycle

    expect(rootCopy.a).not.toBe(root.a)
    expect(rootCopy.b).not.toBe(root.b)
    expect(rootCopy.a.b).not.toBe(root.b)
    expect(rootCopy.b.a).not.toBe(root.a)

    expect(rootCopy.a).toBe(rootCopy.b.a)
    expect(rootCopy.b).toBe(rootCopy.a.b)
    expect(rootCopy.a.b.a).toBe(rootCopy.a)
    expect(rootCopy.b.a.b).toBe(rootCopy.b)
  })
})
