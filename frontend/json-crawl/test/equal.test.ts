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
})
