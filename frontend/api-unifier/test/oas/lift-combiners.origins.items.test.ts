import { convertOriginToHumanReadable, normalize, NormalizeOptions } from '../../src'
import 'jest-extended'
import { commonOriginsCheck, createOas, TEST_ORIGINS_FLAG } from '../helpers'

describe('lift combiners', function () {
  const OPTIONS: NormalizeOptions = {
    liftCombiners: true,
    originsFlag: TEST_ORIGINS_FLAG,
  }

  it('oneOf > anyOf', () => {
    const source = createOas({
      description: 'root',
      readOnly: true,
      oneOf: [
        {
          minimum: 10,
          description: 'level1-1',
        },
        {
          maximum: 20,
          description: 'level1-2',
          anyOf: [
            {
              type: 'number',
              description: 'level2-1',
            },
            {
              minimum: 15,
              description: 'level2-2',
            },
          ],
        },
      ],
    })
    const result = normalize(source, OPTIONS)
    commonOriginsCheck(result, { source })

    expect(result).not.toHaveProperty(['components', 'schemas', 'Single', 'description'])
    expect(result).not.toHaveProperty(['components', 'schemas', 'Single', 'readOnly'])

    const resultWithHmr = convertOriginToHumanReadable(result, TEST_ORIGINS_FLAG)
    expect(resultWithHmr).toHaveProperty(['components', 'schemas', 'Single', TEST_ORIGINS_FLAG, 'oneOf'], ['components/schemas/Single/oneOf'])
    expect(resultWithHmr).toHaveProperty(['components', 'schemas', 'Single', 'oneOf', TEST_ORIGINS_FLAG, 0], expect.toIncludeSameMembers(['components/schemas/Single', 'components/schemas/Single/oneOf/0']))

    expect(resultWithHmr).toHaveProperty(['components', 'schemas', 'Single', 'oneOf', 0, TEST_ORIGINS_FLAG, 'description'], ['components/schemas/Single/oneOf/0/description'])
    expect(resultWithHmr).toHaveProperty(['components', 'schemas', 'Single', 'oneOf', 0, TEST_ORIGINS_FLAG, 'readOnly'], ['components/schemas/Single/readOnly'])
    expect(resultWithHmr).toHaveProperty(['components', 'schemas', 'Single', 'oneOf', 0, TEST_ORIGINS_FLAG, 'minimum'], ['components/schemas/Single/oneOf/0/minimum'])

    expect(resultWithHmr).toHaveProperty(['components', 'schemas', 'Single', 'oneOf', 1, TEST_ORIGINS_FLAG, 'anyOf'], ['components/schemas/Single/oneOf/1/anyOf'])

    expect(resultWithHmr).toHaveProperty(['components', 'schemas', 'Single', 'oneOf', 1, 'anyOf', TEST_ORIGINS_FLAG, 0], expect.toIncludeSameMembers(['components/schemas/Single', 'components/schemas/Single/oneOf/1', 'components/schemas/Single/oneOf/1/anyOf/0']))
    expect(resultWithHmr).toHaveProperty(['components', 'schemas', 'Single', 'oneOf', 1, 'anyOf', 0, TEST_ORIGINS_FLAG, 'description'], ['components/schemas/Single/oneOf/1/anyOf/0/description'])
    expect(resultWithHmr).toHaveProperty(['components', 'schemas', 'Single', 'oneOf', 1, 'anyOf', 0, TEST_ORIGINS_FLAG, 'readOnly'], ['components/schemas/Single/readOnly'])
    expect(resultWithHmr).toHaveProperty(['components', 'schemas', 'Single', 'oneOf', 1, 'anyOf', 0, TEST_ORIGINS_FLAG, 'maximum'], ['components/schemas/Single/oneOf/1/maximum'])
    expect(resultWithHmr).toHaveProperty(['components', 'schemas', 'Single', 'oneOf', 1, 'anyOf', 0, TEST_ORIGINS_FLAG, 'type'], ['components/schemas/Single/oneOf/1/anyOf/0/type'])

    expect(resultWithHmr).toHaveProperty(['components', 'schemas', 'Single', 'oneOf', 1, 'anyOf', TEST_ORIGINS_FLAG, 1], expect.toIncludeSameMembers(['components/schemas/Single', 'components/schemas/Single/oneOf/1', 'components/schemas/Single/oneOf/1/anyOf/1']))
    expect(resultWithHmr).toHaveProperty(['components', 'schemas', 'Single', 'oneOf', 1, 'anyOf', 1, TEST_ORIGINS_FLAG, 'description'], ['components/schemas/Single/oneOf/1/anyOf/1/description'])
    expect(resultWithHmr).toHaveProperty(['components', 'schemas', 'Single', 'oneOf', 1, 'anyOf', 1, TEST_ORIGINS_FLAG, 'readOnly'], ['components/schemas/Single/readOnly'])
    expect(resultWithHmr).toHaveProperty(['components', 'schemas', 'Single', 'oneOf', 1, 'anyOf', 1, TEST_ORIGINS_FLAG, 'maximum'], ['components/schemas/Single/oneOf/1/maximum'])
    expect(resultWithHmr).toHaveProperty(['components', 'schemas', 'Single', 'oneOf', 1, 'anyOf', 1, TEST_ORIGINS_FLAG, 'minimum'], ['components/schemas/Single/oneOf/1/anyOf/1/minimum'])
  })

  it('oneOf + anyOf', () => {
    const source = createOas({
      description: 'root',
      readOnly: true,
      oneOf: [
        {
          minimum: 10,
          description: 'level1-1',
        },
        {
          maximum: 20,
          description: 'level1-2',
        },
      ],
      anyOf: [
        {
          type: 'number',
          description: 'level2-1',
        },
        {
          minimum: 15,
          description: 'level2-2',
        },
      ],
    })
    const result = normalize(source, OPTIONS)
    commonOriginsCheck(result, { source })

    expect(result).not.toHaveProperty(['components', 'schemas', 'Single', 'description'])
    expect(result).not.toHaveProperty(['components', 'schemas', 'Single', 'readOnly'])

    const resultWithHmr = convertOriginToHumanReadable(result, TEST_ORIGINS_FLAG)
    expect(resultWithHmr).toHaveProperty(['components', 'schemas', 'Single', TEST_ORIGINS_FLAG, 'anyOf'], ['components/schemas/Single/anyOf'])
    expect(resultWithHmr).toHaveProperty(['components', 'schemas', 'Single', 'anyOf', TEST_ORIGINS_FLAG, 0], expect.toIncludeSameMembers(['components/schemas/Single/anyOf/0']))
    expect(resultWithHmr).toHaveProperty(['components', 'schemas', 'Single', 'anyOf', TEST_ORIGINS_FLAG, 1], expect.toIncludeSameMembers(['components/schemas/Single/anyOf/1']))

    expect(resultWithHmr).toHaveProperty(['components', 'schemas', 'Single', 'anyOf', 0, 'oneOf', TEST_ORIGINS_FLAG, 0], expect.toIncludeSameMembers(['components/schemas/Single/oneOf/0', 'components/schemas/Single/anyOf/0']))
    expect(resultWithHmr).toHaveProperty(['components', 'schemas', 'Single', 'anyOf', 0, 'oneOf', 0, TEST_ORIGINS_FLAG, 'description'], ['components/schemas/Single/anyOf/0/description'])
    expect(resultWithHmr).toHaveProperty(['components', 'schemas', 'Single', 'anyOf', 0, 'oneOf', 0, TEST_ORIGINS_FLAG, 'readOnly'], ['components/schemas/Single/readOnly'])
    expect(resultWithHmr).toHaveProperty(['components', 'schemas', 'Single', 'anyOf', 0, 'oneOf', 0, TEST_ORIGINS_FLAG, 'minimum'], ['components/schemas/Single/oneOf/0/minimum'])
    expect(resultWithHmr).toHaveProperty(['components', 'schemas', 'Single', 'anyOf', 0, 'oneOf', 0, TEST_ORIGINS_FLAG, 'type'], ['components/schemas/Single/anyOf/0/type'])

    expect(resultWithHmr).toHaveProperty(['components', 'schemas', 'Single', 'anyOf', 0, 'oneOf', TEST_ORIGINS_FLAG, 1], expect.toIncludeSameMembers(['components/schemas/Single/oneOf/1', 'components/schemas/Single/anyOf/0']))
    expect(resultWithHmr).toHaveProperty(['components', 'schemas', 'Single', 'anyOf', 0, 'oneOf', 1, TEST_ORIGINS_FLAG, 'description'], ['components/schemas/Single/anyOf/0/description'])
    expect(resultWithHmr).toHaveProperty(['components', 'schemas', 'Single', 'anyOf', 0, 'oneOf', 1, TEST_ORIGINS_FLAG, 'readOnly'], ['components/schemas/Single/readOnly'])
    expect(resultWithHmr).toHaveProperty(['components', 'schemas', 'Single', 'anyOf', 0, 'oneOf', 1, TEST_ORIGINS_FLAG, 'maximum'], ['components/schemas/Single/oneOf/1/maximum'])
    expect(resultWithHmr).toHaveProperty(['components', 'schemas', 'Single', 'anyOf', 0, 'oneOf', 1, TEST_ORIGINS_FLAG, 'type'], ['components/schemas/Single/anyOf/0/type'])

    expect(resultWithHmr).toHaveProperty(['components', 'schemas', 'Single', 'anyOf', 1, 'oneOf', TEST_ORIGINS_FLAG, 0], expect.toIncludeSameMembers(['components/schemas/Single/oneOf/0', 'components/schemas/Single/anyOf/1']))
    expect(resultWithHmr).toHaveProperty(['components', 'schemas', 'Single', 'anyOf', 1, 'oneOf', 0, TEST_ORIGINS_FLAG, 'description'], ['components/schemas/Single/anyOf/1/description'])
    expect(resultWithHmr).toHaveProperty(['components', 'schemas', 'Single', 'anyOf', 1, 'oneOf', 0, TEST_ORIGINS_FLAG, 'readOnly'], ['components/schemas/Single/readOnly'])
    expect(resultWithHmr).toHaveProperty(['components', 'schemas', 'Single', 'anyOf', 1, 'oneOf', 0, TEST_ORIGINS_FLAG, 'minimum'], ['components/schemas/Single/anyOf/1/minimum'])

    expect(resultWithHmr).toHaveProperty(['components', 'schemas', 'Single', 'anyOf', 1, 'oneOf', TEST_ORIGINS_FLAG, 1], expect.toIncludeSameMembers(['components/schemas/Single/oneOf/1', 'components/schemas/Single/anyOf/1']))
    expect(resultWithHmr).toHaveProperty(['components', 'schemas', 'Single', 'anyOf', 1, 'oneOf', 1, TEST_ORIGINS_FLAG, 'description'], ['components/schemas/Single/anyOf/1/description'])
    expect(resultWithHmr).toHaveProperty(['components', 'schemas', 'Single', 'anyOf', 1, 'oneOf', 1, TEST_ORIGINS_FLAG, 'readOnly'], ['components/schemas/Single/readOnly'])
    expect(resultWithHmr).toHaveProperty(['components', 'schemas', 'Single', 'anyOf', 1, 'oneOf', 1, TEST_ORIGINS_FLAG, 'maximum'], ['components/schemas/Single/oneOf/1/maximum'])
    expect(resultWithHmr).toHaveProperty(['components', 'schemas', 'Single', 'anyOf', 1, 'oneOf', 1, TEST_ORIGINS_FLAG, 'minimum'], ['components/schemas/Single/anyOf/1/minimum'])

  })
})
