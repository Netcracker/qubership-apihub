import { CrawlRules, syncClone, SyncCloneHook } from '../src'

interface TestState {
  counter: number
}

type TestRule = { $?: (value: any, state: TestState) => any, $$?: number }
type TestRules = CrawlRules<TestRule>

describe('rules test', () => {
  it('should execute function for each node base on rules', () => {
    const testRules: TestRules = {
      $: (v, s) => v.test = 'test',
      '/address': {
        $: (v, s) => {
          for (const key of Object.keys(v)) {
            v[key] = v[key].toUpperCase() + ` ${s.counter++}`
          }
        },
      },
    }

    const source = {
      name: 'John',
      age: 30,
      address: {
        street: '123 Main St',
        city: 'New York',
      },
    }

    const hook: SyncCloneHook<TestState, TestRule> = ({ value, state, rules }) => {
      if (rules && '$' in rules) {
        rules.$?.(value, state)
      }
    }

    const state: TestState = { counter: 0 }

    const data = syncClone(source, hook, { rules: testRules, state })

    expect(data).toEqual({
      name: 'John',
      age: 30,
      address: {
        street: '123 MAIN ST 0',
        city: 'NEW YORK 1',
      },
      test: 'test',
    })
  })

  it('should execute function for each node base on common rule', () => {
    const testRules: TestRules = {
      '/**': {
        $: (v) => typeof v === 'string',
      },
    }

    const source = {
      name: 'John',
      age: 30,
      address: {
        street: '123 Main St',
        city: 'New York',
      },
    }

    const hook: SyncCloneHook<TestState, TestRule> = ({ value, rules, state }) => {
      if (rules && '$' in rules && rules.$?.(value, state)) {
        return { value: (value as string).toUpperCase() }
      }
    }

    const data = syncClone(source, hook, { rules: testRules })

    expect(data).toEqual({
      name: 'JOHN',
      age: 30,
      address: {
        street: '123 MAIN ST',
        city: 'NEW YORK',
      },
    })
  })

  it('should execute function for each node base on common rule', () => {
    const testRules1: TestRules = {
      '/name': { $: () => true },
      '/age': () => ({ $: () => false }),
    }

    const testRules2: TestRules = {
      '/age': {
        $$: 2,
      },
      '/address': {
        '/*': { $: (v) => typeof v === 'string' },
      },
    }

    const source = {
      name: 'John',
      age: 30,
      address: {
        street: '123 Main St',
        city: 'New York',
      },
    }

    const hook: SyncCloneHook<TestState, TestRule> = ({ value, rules, state }) => {
      if (!rules) { return }
      if ('$$' in rules) {
        const m = rules['$$']!
        return { value: <number>value * m }
      }
      if ('$' in rules && rules.$?.(value, state)) {
        return { value: (value as string).toUpperCase() }
      }
    }

    const data = syncClone(source, hook, { rules: [testRules1, testRules2] })

    expect(data).toEqual({
      name: 'JOHN',
      age: 60,
      address: {
        street: '123 MAIN ST',
        city: 'NEW YORK',
      },
    })
  })

  it('should pass global rule to each child nodes', () => {
    const testRules: TestRules = {
      '/name': { $: () => false },
      '/**': { $$: 1, $: () => true },
    }

    const source = {
      name: 'John',
      age: 30,
      address: {
        street: '123 Main St',
        city: 'New York',
        building: 5,
      },
    }

    const hook: SyncCloneHook<TestState, TestRule> = ({ value, rules, state }) => {
      if (!rules) { return }
      if ('$$' in rules && typeof value === 'number') {
        const m = rules['$$']!
        return { value: value + m }
      }
      if ('$' in rules && rules.$?.(value, state) && typeof value === 'string') {
        return { value: value.toUpperCase() }
      }
    }

    const data = syncClone(source, hook, { rules: [testRules] })

    expect(data).toEqual({
      name: 'John',
      age: 31,
      address: {
        street: '123 MAIN ST',
        city: 'NEW YORK',
        building: 6,
      },
    })
  })
})
