import { denormalize, normalize } from '../../src'
import { commonOriginsCheck, TEST_ORIGINS_FLAG } from '../helpers'

describe('JSON Schema specification extensions', () => {
  const baseOptions = {
    validate: true,
    unify: true,
    originsFlag: TEST_ORIGINS_FLAG,
  }
  const source = {
    type: 'object',
    'x-root-extension': { nested: ['value'] },
    properties: {
      child: {
        type: 'string',
        'x-property-extension': { nested: true },
      },
    },
  }

  it('preserves extensions and their origins through normalization', () => {
    const result = normalize(source, baseOptions)

    commonOriginsCheck(result)
    expect(result).toHaveProperty(['x-root-extension', 'nested', 0], 'value')
    expect(result).toHaveProperty(['properties', 'child', 'x-property-extension', 'nested'], true)
  })

  it('restores extensions during denormalization', () => {
    const normalized = normalize(source, baseOptions)
    const result = denormalize(normalized, baseOptions)

    expect(result).toMatchObject(source)
  })
})
