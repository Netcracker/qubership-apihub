import { equal } from '../src'

describe('equal test', () => {
  it('deep equal objects', () => {
    const source1 = {
      name: 'John',
      age: 30,
      address: {
        street: '123 Main St',
        city: 'New York',
      },
    }
    const source2 = {
      name: 'John',
      age: 30,
      address: {
        street: '123 Main St',
        city: 'New York',
      },
    }

    expect(equal(source1, source2)).toEqual(true)
  })

  // Negative cases. Until these existed this suite asserted only that equal() returns true
  // for two identical objects — which an implementation hard-coded to `return true` also
  // passes. A check that cannot fail is not a check.
  it('differing scalar', () => {
    expect(equal({ a: 1 }, { a: 2 })).toEqual(false)
  })

  it('differing scalar nested below the root', () => {
    expect(equal({ a: { b: 1 } }, { a: { b: 2 } })).toEqual(false)
  })

  it('extra key on one side', () => {
    expect(equal({ a: 1 }, { a: 1, b: 2 })).toEqual(false)
  })

  it('arrays of different length', () => {
    expect(equal([1, 2, 3], [1, 2])).toEqual(false)
  })

  it('same value, different type', () => {
    expect(equal({ a: 1 }, { a: '1' })).toEqual(false)
  })

  it('the same reference is equal to itself', () => {
    const source = { a: { b: 1 } }
    expect(equal(source, source)).toEqual(true)
  })
})
