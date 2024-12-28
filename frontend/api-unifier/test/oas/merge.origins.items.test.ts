import { convertOriginToHumanReadable, normalize, NormalizeOptions } from '../../src'
import 'jest-extended'
import { commonOriginsCheck, createOas, TEST_ORIGINS_FLAG } from '../helpers'

describe('merge origins items', function () {
  const OPTIONS: NormalizeOptions = {
    originsFlag: TEST_ORIGINS_FLAG,
  }

  it('merges simple items', () => {
    const source = createOas({
      items: {
        description: 'one',
      },
      allOf: [
        {
          items: {
            description: 'two',
            minimum: 10,
          },
        },
        {
          items: {
            description: 'three',
            minimum: 20,
          },
        },
      ],
    })
    const result = normalize(source, OPTIONS)
    commonOriginsCheck(result, { source })

    expect(result).toHaveProperty(['components', 'schemas', 'Single', 'items', 'description'], 'one')
    expect(result).toHaveProperty(['components', 'schemas', 'Single', 'items', 'minimum'], 20)
    const resultWithHmr = convertOriginToHumanReadable(result, TEST_ORIGINS_FLAG)
    expect(resultWithHmr).toHaveProperty(['components', 'schemas', TEST_ORIGINS_FLAG, 'Single'], ['components/schemas/Single'])
    expect(resultWithHmr).toHaveProperty(['components', 'schemas', 'Single', TEST_ORIGINS_FLAG, 'items'],
      expect.toIncludeSameMembers([
        'components/schemas/Single/items',
        'components/schemas/Single/allOf/0/items',
        'components/schemas/Single/allOf/1/items',
      ]),
    )
    expect(resultWithHmr).toHaveProperty(['components', 'schemas', 'Single', 'items', TEST_ORIGINS_FLAG, 'description'], ['components/schemas/Single/items/description'])
    expect(resultWithHmr).toHaveProperty(['components', 'schemas', 'Single', 'items', TEST_ORIGINS_FLAG, 'minimum'], ['components/schemas/Single/allOf/1/items/minimum'])
  })
})
