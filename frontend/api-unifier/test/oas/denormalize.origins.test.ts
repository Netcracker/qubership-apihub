import { denormalize, normalize, NormalizeOptions } from '../../src'
import 'jest-extended'
import { createOas, TEST_ORIGINS_FLAG, TEST_ORIGINS_FOR_DEFAULTS } from '../helpers'

describe('denormalize origins', function () {
  const OPTIONS: NormalizeOptions = {
    originsFlag: TEST_ORIGINS_FLAG,
    createOriginsForDefaults: () => TEST_ORIGINS_FOR_DEFAULTS,
    unify: true,
    liftCombiners: true,
  }

  it('additionalProperties: true', () => {
    const source = createOas({
      readOnly: true,
      additionalProperties: true,
    })
    const result = denormalize(normalize(source, OPTIONS), OPTIONS)
    expect(result).toEqual(createOas({
      readOnly: true,
      type: 'object',
    }))
  })

  it('additionalProperties: false', () => {
    const source = createOas({
      readOnly: true,
      additionalProperties: false,
    })
    const result = denormalize(normalize(source, OPTIONS), OPTIONS)
    expect(result).toEqual(createOas({
      readOnly: true,
      additionalProperties: false,
      type: 'object',
    }))
  })

  it('any', () => {
    const source = createOas({
      readOnly: true,
    })
    const result = denormalize(normalize(source, OPTIONS), OPTIONS)
    expect(result).toEqual(createOas({
      readOnly: true,
    }))
  })

  it('never', () => {
    const source = createOas({
      readOnly: true,
      allOf: [
        { type: 'string' },
        { type: 'number' },
      ],
    })
    const result = denormalize(normalize(source, OPTIONS), OPTIONS)
    expect(result).toEqual(createOas({
      not: {},
    }))
  })
})
