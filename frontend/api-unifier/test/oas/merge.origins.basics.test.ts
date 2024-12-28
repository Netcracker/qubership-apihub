import { convertOriginToHumanReadable, normalize, NormalizeOptions } from '../../src'
import 'jest-extended'
import { commonOriginsCheck, createOas, TEST_ORIGINS_FLAG } from '../helpers'

describe('merge origins basic', () => {
  const OPTIONS: NormalizeOptions = {
    originsFlag: TEST_ORIGINS_FLAG,
  }

  it('merges description', () => {
    const source = createOas({
      allOf: [
        { description: 'first' },
        { description: 'last' },
        { description: 'last' },
      ],
    })
    const result: any = normalize(source, OPTIONS)
    commonOriginsCheck(result, { source })

    expect(result).toHaveProperty(['components', 'schemas', 'Single', 'description'], 'last')
    const resultWithHmr = convertOriginToHumanReadable(result, TEST_ORIGINS_FLAG)
    expect(resultWithHmr).toHaveProperty(['components', 'schemas', TEST_ORIGINS_FLAG, 'Single'], ['components/schemas/Single'])
    expect(resultWithHmr).toHaveProperty(['components', 'schemas', 'Single', TEST_ORIGINS_FLAG, 'description'], ['components/schemas/Single/allOf/2/description'])
  })

  it('merges format', () => {
    const source = createOas({
      allOf: [
        { format: 'uri' },
        { format: 'ip' },
        { format: 'ip' },
      ],
    })
    const result: any = normalize(source, OPTIONS)
    commonOriginsCheck(result, { source })

    expect(result).toHaveProperty(['components', 'schemas', 'Single', 'format'], 'ip')
    const resultWithHmr = convertOriginToHumanReadable(result, TEST_ORIGINS_FLAG)
    expect(resultWithHmr).toHaveProperty(['components', 'schemas', TEST_ORIGINS_FLAG, 'Single'], ['components/schemas/Single'])
    expect(resultWithHmr).toHaveProperty(['components', 'schemas', 'Single', TEST_ORIGINS_FLAG, 'format'], ['components/schemas/Single/allOf/2/format'])
  })

  it('merges default (primitive)', () => {
    const source = createOas({
      allOf: [
        { default: 'first sample' },
        { default: 'last sample' },
        { default: 'last sample' },
      ],
    })
    const result: any = normalize(source, OPTIONS)
    commonOriginsCheck(result, { source })

    expect(result).toHaveProperty(['components', 'schemas', 'Single', 'default'], 'last sample')
    const resultWithHmr = convertOriginToHumanReadable(result, TEST_ORIGINS_FLAG)
    expect(resultWithHmr).toHaveProperty(['components', 'schemas', TEST_ORIGINS_FLAG, 'Single'], ['components/schemas/Single'])
    expect(resultWithHmr).toHaveProperty(['components', 'schemas', 'Single', TEST_ORIGINS_FLAG, 'default'], ['components/schemas/Single/allOf/2/default'])
  })

  it('merges default (object)', () => {
    const source = createOas({
      allOf: [
        { default: { description: 'first object' } },
        { default: { description: 'last object' } },
        { default: { description: 'last object' } },
      ],
    })
    const result: any = normalize(source, OPTIONS)
    commonOriginsCheck(result, { source })

    expect(result).toHaveProperty(['components', 'schemas', 'Single', 'default', 'description'], 'last object')
    const resultWithHmr = convertOriginToHumanReadable(result, TEST_ORIGINS_FLAG)
    expect(resultWithHmr).toHaveProperty(['components', 'schemas', TEST_ORIGINS_FLAG, 'Single'], ['components/schemas/Single'])
    expect(resultWithHmr).toHaveProperty(['components', 'schemas', 'Single', TEST_ORIGINS_FLAG, 'default'], ['components/schemas/Single/allOf/2/default'])
    expect(resultWithHmr).toHaveProperty(['components', 'schemas', 'Single', 'default', TEST_ORIGINS_FLAG, 'description'], ['components/schemas/Single/allOf/2/default/description'])
  })

  it('merges default (array)', () => {
    const source = createOas({
      allOf: [
        { default: ['first'] },
        { default: ['last'] },
        { default: ['last'] },
      ],
    })
    const result: any = normalize(source, OPTIONS)
    commonOriginsCheck(result, { source })

    expect(result).toHaveProperty(['components', 'schemas', 'Single', 'default', 0], 'last')
    const resultWithHmr = convertOriginToHumanReadable(result, TEST_ORIGINS_FLAG)
    expect(resultWithHmr).toHaveProperty(['components', 'schemas', TEST_ORIGINS_FLAG, 'Single'], ['components/schemas/Single'])
    expect(resultWithHmr).toHaveProperty(['components', 'schemas', 'Single', TEST_ORIGINS_FLAG, 'default'], ['components/schemas/Single/allOf/2/default'])
    expect(resultWithHmr).toHaveProperty(['components', 'schemas', 'Single', 'default', TEST_ORIGINS_FLAG, 0], ['components/schemas/Single/allOf/2/default/0'])
  })

  it('merges examples (primitive)', () => {
    const source = createOas({
      allOf: [
        { examples: ['first', 'same'] },
        { examples: ['last', 'same'] },
        { examples: ['last', 'same'] },
      ],
    })
    const result: any = normalize(source, OPTIONS)
    commonOriginsCheck(result, { source })

    expect(result).toHaveProperty(['components', 'schemas', 'Single', 'examples', 0], 'last')
    expect(result).toHaveProperty(['components', 'schemas', 'Single', 'examples', 1], 'same')
    const resultWithHmr = convertOriginToHumanReadable(result, TEST_ORIGINS_FLAG)
    expect(resultWithHmr).toHaveProperty(['components', 'schemas', TEST_ORIGINS_FLAG, 'Single'], ['components/schemas/Single'])
    expect(resultWithHmr).toHaveProperty(['components', 'schemas', 'Single', TEST_ORIGINS_FLAG, 'examples'], ['components/schemas/Single/allOf/2/examples'])
    expect(resultWithHmr).toHaveProperty(['components', 'schemas', 'Single', 'examples', TEST_ORIGINS_FLAG, 0], ['components/schemas/Single/allOf/2/examples/0'])
    expect(resultWithHmr).toHaveProperty(['components', 'schemas', 'Single', 'examples', TEST_ORIGINS_FLAG, 1], ['components/schemas/Single/allOf/2/examples/1'])
  })

  it('merges examples (object) ', () => {
    const source = createOas({
      allOf: [
        {
          examples: [{ prop1: 'first' }],
        },
        {
          examples: [{ prop1: 'last', prop2: 'lol' }],
        },
        {
          examples: [{ prop1: 'last', prop2: 'lol' }],
        },
      ],
    })
    const result: any = normalize(source, OPTIONS)
    commonOriginsCheck(result, { source })

    expect(result).toHaveProperty(['components', 'schemas', 'Single', 'examples', 0, 'prop1'], 'last')
    expect(result).toHaveProperty(['components', 'schemas', 'Single', 'examples', 0, 'prop2'], 'lol')
    const resultWithHmr = convertOriginToHumanReadable(result, TEST_ORIGINS_FLAG)
    expect(resultWithHmr).toHaveProperty(['components', 'schemas', TEST_ORIGINS_FLAG, 'Single'], ['components/schemas/Single'])
    expect(resultWithHmr).toHaveProperty(['components', 'schemas', 'Single', TEST_ORIGINS_FLAG, 'examples'], ['components/schemas/Single/allOf/2/examples'])
    expect(resultWithHmr).toHaveProperty(['components', 'schemas', 'Single', 'examples', TEST_ORIGINS_FLAG, 0], ['components/schemas/Single/allOf/2/examples/0'])
    expect(resultWithHmr).toHaveProperty(['components', 'schemas', 'Single', 'examples', 0, TEST_ORIGINS_FLAG, 'prop1'], ['components/schemas/Single/allOf/2/examples/0/prop1'])
    expect(resultWithHmr).toHaveProperty(['components', 'schemas', 'Single', 'examples', 0, TEST_ORIGINS_FLAG, 'prop2'], ['components/schemas/Single/allOf/2/examples/0/prop2'])
  })

  it('merges maximum', () => {
    const source = createOas({
      allOf: [
        { maximum: 10 },
        { maximum: 5 },
        { maximum: 5 },
      ],
    })
    const result: any = normalize(source, OPTIONS)
    commonOriginsCheck(result, { source })

    expect(result).toHaveProperty(['components', 'schemas', 'Single', 'maximum'], 5)
    const resultWithHmr = convertOriginToHumanReadable(result, TEST_ORIGINS_FLAG)
    expect(resultWithHmr).toHaveProperty(['components', 'schemas', TEST_ORIGINS_FLAG, 'Single'], ['components/schemas/Single'])
    expect(resultWithHmr).toHaveProperty(['components', 'schemas', 'Single', TEST_ORIGINS_FLAG, 'maximum'],
      expect.toIncludeSameMembers([
        'components/schemas/Single/allOf/1/maximum',
        'components/schemas/Single/allOf/2/maximum',
      ]),
    )
  })

  it('merges minimum', () => {
    const source = createOas({
      allOf: [
        { minimum: 10 },
        { minimum: 10 },
        { minimum: 5 },
      ],
    })
    const result: any = normalize(source, OPTIONS)
    commonOriginsCheck(result, { source })

    expect(result).toHaveProperty(['components', 'schemas', 'Single', 'minimum'], 10)
    const resultWithHmr = convertOriginToHumanReadable(result, TEST_ORIGINS_FLAG)
    expect(resultWithHmr).toHaveProperty(['components', 'schemas', TEST_ORIGINS_FLAG, 'Single'], ['components/schemas/Single'])
    expect(resultWithHmr).toHaveProperty(['components', 'schemas', 'Single', TEST_ORIGINS_FLAG, 'minimum'],
      expect.toIncludeSameMembers([
        'components/schemas/Single/allOf/0/minimum',
        'components/schemas/Single/allOf/1/minimum',
      ]),
    )
  })

  it('merges exclusiveMaximum', () => {
    const source = createOas({
      allOf: [
        { exclusiveMaximum: true },
        { exclusiveMaximum: false },
        { exclusiveMaximum: true },
      ],
    })
    const result: any = normalize(source, OPTIONS)
    commonOriginsCheck(result, { source })

    expect(result).toHaveProperty(['components', 'schemas', 'Single', 'exclusiveMaximum'], true)
    const resultWithHmr = convertOriginToHumanReadable(result, TEST_ORIGINS_FLAG)
    expect(resultWithHmr).toHaveProperty(['components', 'schemas', TEST_ORIGINS_FLAG, 'Single'], ['components/schemas/Single'])
    expect(resultWithHmr).toHaveProperty(['components', 'schemas', 'Single', TEST_ORIGINS_FLAG, 'exclusiveMaximum'],
      expect.toIncludeSameMembers([
        'components/schemas/Single/allOf/0/exclusiveMaximum',
        'components/schemas/Single/allOf/2/exclusiveMaximum',
      ]),
    )
  })

  it('merges exclusiveMaximum (same values)', () => {
    const source = createOas({
      allOf: [
        { exclusiveMaximum: false },
        { exclusiveMaximum: false },
        { exclusiveMaximum: false },
      ],
    })
    const result: any = normalize(source, OPTIONS)
    commonOriginsCheck(result, { source })

    expect(result).toHaveProperty(['components', 'schemas', 'Single', 'exclusiveMaximum'], false)
    const resultWithHmr = convertOriginToHumanReadable(result, TEST_ORIGINS_FLAG)
    expect(resultWithHmr).toHaveProperty(['components', 'schemas', TEST_ORIGINS_FLAG, 'Single'], ['components/schemas/Single'])
    expect(resultWithHmr).toHaveProperty(['components', 'schemas', 'Single', TEST_ORIGINS_FLAG, 'exclusiveMaximum'],
      expect.toIncludeSameMembers([
        'components/schemas/Single/allOf/0/exclusiveMaximum',
        'components/schemas/Single/allOf/1/exclusiveMaximum',
        'components/schemas/Single/allOf/2/exclusiveMaximum',
      ]),
    )
  })

  it('merges exclusiveMinimum', () => {
    const source = createOas({
      allOf: [
        { exclusiveMinimum: true },
        { exclusiveMinimum: false },
        { exclusiveMinimum: true },
      ],
    })
    const result: any = normalize(source, OPTIONS)
    commonOriginsCheck(result, { source })

    expect(result).toHaveProperty(['components', 'schemas', 'Single', 'exclusiveMinimum'], true)
    const resultWithHmr = convertOriginToHumanReadable(result, TEST_ORIGINS_FLAG)
    expect(resultWithHmr).toHaveProperty(['components', 'schemas', TEST_ORIGINS_FLAG, 'Single'], ['components/schemas/Single'])
    expect(resultWithHmr).toHaveProperty(['components', 'schemas', 'Single', TEST_ORIGINS_FLAG, 'exclusiveMinimum'],
      expect.toIncludeSameMembers([
        'components/schemas/Single/allOf/0/exclusiveMinimum',
        'components/schemas/Single/allOf/2/exclusiveMinimum',
      ]),
    )
  })

  it('merges exclusiveMinimum (same values)', () => {
    const source = createOas({
      allOf: [
        { exclusiveMinimum: false },
        { exclusiveMinimum: false },
        { exclusiveMinimum: false },
      ],
    })
    const result: any = normalize(source, OPTIONS)
    commonOriginsCheck(result, { source })

    expect(result).toHaveProperty(['components', 'schemas', 'Single', 'exclusiveMinimum'], false)
    const resultWithHmr = convertOriginToHumanReadable(result, TEST_ORIGINS_FLAG)
    expect(resultWithHmr).toHaveProperty(['components', 'schemas', TEST_ORIGINS_FLAG, 'Single'], ['components/schemas/Single'])
    expect(resultWithHmr).toHaveProperty(['components', 'schemas', 'Single', TEST_ORIGINS_FLAG, 'exclusiveMinimum'],
      expect.toIncludeSameMembers([
        'components/schemas/Single/allOf/0/exclusiveMinimum',
        'components/schemas/Single/allOf/1/exclusiveMinimum',
        'components/schemas/Single/allOf/2/exclusiveMinimum',
      ]),
    )
  })

  it('merges minLength', () => {
    const source = createOas({
      allOf: [
        { minLength: 10 },
        { minLength: 5 },
        { minLength: 10 },
      ],
    })
    const result: any = normalize(source, OPTIONS)
    commonOriginsCheck(result, { source })

    expect(result).toHaveProperty(['components', 'schemas', 'Single', 'minLength'], 10)
    const resultWithHmr = convertOriginToHumanReadable(result, TEST_ORIGINS_FLAG)
    expect(resultWithHmr).toHaveProperty(['components', 'schemas', TEST_ORIGINS_FLAG, 'Single'], ['components/schemas/Single'])
    expect(resultWithHmr).toHaveProperty(['components', 'schemas', 'Single', TEST_ORIGINS_FLAG, 'minLength'],
      expect.toIncludeSameMembers([
        'components/schemas/Single/allOf/0/minLength',
        'components/schemas/Single/allOf/2/minLength',
      ]),
    )
  })

  it('merges maxLength', () => {
    const source = createOas({
      allOf: [
        { maxLength: 10 },
        { maxLength: 5 },
        { maxLength: 5 },
      ],
    })
    const result: any = normalize(source, OPTIONS)
    commonOriginsCheck(result, { source })

    expect(result).toHaveProperty(['components', 'schemas', 'Single', 'maxLength'], 5)
    const resultWithHmr = convertOriginToHumanReadable(result, TEST_ORIGINS_FLAG)
    expect(resultWithHmr).toHaveProperty(['components', 'schemas', TEST_ORIGINS_FLAG, 'Single'], ['components/schemas/Single'])
    expect(resultWithHmr).toHaveProperty(['components', 'schemas', 'Single', TEST_ORIGINS_FLAG, 'maxLength'],
      expect.toIncludeSameMembers([
        'components/schemas/Single/allOf/1/maxLength',
        'components/schemas/Single/allOf/2/maxLength',
      ]),
    )
  })

  it('merges minItems', () => {
    const source = createOas({
      allOf: [
        { minItems: 10 },
        { minItems: 5 },
        { minItems: 10 },
      ],
    })
    const result: any = normalize(source, OPTIONS)
    commonOriginsCheck(result, { source })

    expect(result).toHaveProperty(['components', 'schemas', 'Single', 'minItems'], 10)
    const resultWithHmr = convertOriginToHumanReadable(result, TEST_ORIGINS_FLAG)
    expect(resultWithHmr).toHaveProperty(['components', 'schemas', TEST_ORIGINS_FLAG, 'Single'], ['components/schemas/Single'])
    expect(resultWithHmr).toHaveProperty(['components', 'schemas', 'Single', TEST_ORIGINS_FLAG, 'minItems'],
      expect.toIncludeSameMembers([
        'components/schemas/Single/allOf/0/minItems',
        'components/schemas/Single/allOf/2/minItems',
      ]),
    )
  })

  it('merges maxItems', () => {
    const source = createOas({
      allOf: [
        { maxItems: 10 },
        { maxItems: 5 },
        { maxItems: 5 },
      ],
    })
    const result: any = normalize(source, OPTIONS)
    commonOriginsCheck(result, { source })

    expect(result).toHaveProperty(['components', 'schemas', 'Single', 'maxItems'], 5)
    const resultWithHmr = convertOriginToHumanReadable(result, TEST_ORIGINS_FLAG)
    expect(resultWithHmr).toHaveProperty(['components', 'schemas', TEST_ORIGINS_FLAG, 'Single'], ['components/schemas/Single'])
    expect(resultWithHmr).toHaveProperty(['components', 'schemas', 'Single', TEST_ORIGINS_FLAG, 'maxItems'],
      expect.toIncludeSameMembers([
        'components/schemas/Single/allOf/1/maxItems',
        'components/schemas/Single/allOf/2/maxItems',
      ]),
    )
  })

  it('merges minProperties', () => {
    const source = createOas({
      allOf: [
        { minProperties: 10 },
        { minProperties: 5 },
        { minProperties: 10 },
      ],
    })
    const result: any = normalize(source, OPTIONS)
    commonOriginsCheck(result, { source })

    expect(result).toHaveProperty(['components', 'schemas', 'Single', 'minProperties'], 10)
    const resultWithHmr = convertOriginToHumanReadable(result, TEST_ORIGINS_FLAG)
    expect(resultWithHmr).toHaveProperty(['components', 'schemas', TEST_ORIGINS_FLAG, 'Single'], ['components/schemas/Single'])
    expect(resultWithHmr).toHaveProperty(['components', 'schemas', 'Single', TEST_ORIGINS_FLAG, 'minProperties'],
      expect.toIncludeSameMembers([
        'components/schemas/Single/allOf/0/minProperties',
        'components/schemas/Single/allOf/2/minProperties',
      ]),
    )
  })

  it('merges maxItems', () => {
    const source = createOas({
      allOf: [
        { maxItems: 10 },
        { maxItems: 5 },
        { maxItems: 5 },
      ],
    })
    const result: any = normalize(source, OPTIONS)
    commonOriginsCheck(result, { source })

    expect(result).toHaveProperty(['components', 'schemas', 'Single', 'maxItems'], 5)
    const resultWithHmr = convertOriginToHumanReadable(result, TEST_ORIGINS_FLAG)
    expect(resultWithHmr).toHaveProperty(['components', 'schemas', TEST_ORIGINS_FLAG, 'Single'], ['components/schemas/Single'])
    expect(resultWithHmr).toHaveProperty(['components', 'schemas', 'Single', TEST_ORIGINS_FLAG, 'maxItems'],
      expect.toIncludeSameMembers([
        'components/schemas/Single/allOf/1/maxItems',
        'components/schemas/Single/allOf/2/maxItems',
      ]),
    )
  })

  it('merges multipleOf', () => {
    const source = createOas({
      allOf: [
        { multipleOf: 2 },
        { multipleOf: 5 },
        { multipleOf: 5 },
        { multipleOf: 0.3 },
      ],
    })
    const result: any = normalize(source, OPTIONS)
    commonOriginsCheck(result, { source })

    expect(result).toHaveProperty(['components', 'schemas', 'Single', 'multipleOf'], 30)
    const resultWithHmr = convertOriginToHumanReadable(result, TEST_ORIGINS_FLAG)
    expect(resultWithHmr).toHaveProperty(['components', 'schemas', TEST_ORIGINS_FLAG, 'Single'], ['components/schemas/Single'])
    expect(resultWithHmr).toHaveProperty(['components', 'schemas', 'Single', TEST_ORIGINS_FLAG, 'multipleOf'],
      expect.toIncludeSameMembers([
        'components/schemas/Single/allOf/0/multipleOf',
        'components/schemas/Single/allOf/1/multipleOf',
        'components/schemas/Single/allOf/2/multipleOf',
        'components/schemas/Single/allOf/3/multipleOf',
      ]),
    )
  })

  it('merges types (nothing types)', () => {
    const source = {
      allOf: [
        { type: [] },
        { type: 'string' },
      ],
    }

    const result: any = normalize(source, OPTIONS)
    commonOriginsCheck(result, { source })
  })

  it('merges types (one type)', () => {
    const source = {
      allOf: [
        { type: 'string' },
        { type: ['string', 'string'] },
        { type: ['string'] },
      ],
    }

    const result: any = normalize(source, OPTIONS)
    commonOriginsCheck(result, { source })

    expect(result).toHaveProperty(['type'], 'string')
    const resultWithHmr = convertOriginToHumanReadable(result, TEST_ORIGINS_FLAG)
    expect(resultWithHmr).toHaveProperty([TEST_ORIGINS_FLAG, 'type'],
      expect.toIncludeSameMembers(['allOf/0/type', 'allOf/1/type', 'allOf/2/type']),
    )
  })

  it('merges types (intersection of types, array in result)', () => {
    const source = {
      allOf: [
        { type: ['string', 'boolean', 'array'] },
        { type: ['integer', 'string', 'boolean'] },
        { type: ['string', 'boolean'] },
      ],
    }

    const result: any = normalize(source, OPTIONS)
    commonOriginsCheck(result, { source })

    //todo think about order of result values
    expect(result).toHaveProperty(['type', 0], 'string')
    expect(result).toHaveProperty(['type', 1], 'boolean')
    const resultWithHmr = convertOriginToHumanReadable(result, TEST_ORIGINS_FLAG)
    expect(resultWithHmr).toHaveProperty([TEST_ORIGINS_FLAG, 'type'],
      expect.toIncludeSameMembers(['allOf/0/type', 'allOf/1/type', 'allOf/2/type']),
    )
    // 'string' result
    expect(resultWithHmr).toHaveProperty(['type', TEST_ORIGINS_FLAG, 0],
      expect.toIncludeSameMembers(['allOf/0/type/0', 'allOf/1/type/1', 'allOf/2/type/0']),
    )
    // 'boolean' result
    expect(resultWithHmr).toHaveProperty(['type', TEST_ORIGINS_FLAG, 1],
      expect.toIncludeSameMembers(['allOf/0/type/1', 'allOf/1/type/2', 'allOf/2/type/1']),
    )
  })

  it('merges types (intersection of types, one type in result)', () => {
    const source = {
      allOf: [
        { type: ['string', 'boolean', 'array'] },
        { type: ['integer', 'string', 'boolean'] },
        { type: ['string'] },
      ],
    }

    const result: any = normalize(source, OPTIONS)
    commonOriginsCheck(result, { source })

    expect(result).toHaveProperty('type', 'string')
    const resultWithHmr = convertOriginToHumanReadable(result, TEST_ORIGINS_FLAG)
    expect(resultWithHmr).toHaveProperty([TEST_ORIGINS_FLAG, 'type'],
      expect.toIncludeSameMembers(['allOf/0/type/0', 'allOf/1/type/1', 'allOf/2/type/0']),
    )
  })

  it('merges types (empty intersection of types)', () => {
    const source = {
      allOf: [
        { type: ['string', 'boolean'] },
        { type: ['integer', 'boolean'] },
        { type: 'array' },
      ],
    }

    const result: any = normalize(source, OPTIONS)
    commonOriginsCheck(result, { source })
  })

  it('merges types (classic OAS case)', () => {
    const source = createOas({
      allOf: [
        true,
        { type: 'integer' },
        { type: 'integer' },
      ],
    })

    const result: any = normalize(source, OPTIONS)
    commonOriginsCheck(result, { source })

    expect(result).toHaveProperty(['components', 'schemas', 'Single', 'type'], 'integer')
    const resultWithHmr = convertOriginToHumanReadable(result, TEST_ORIGINS_FLAG)
    expect(resultWithHmr).toHaveProperty(['components', 'schemas', 'Single', TEST_ORIGINS_FLAG, 'type'],
      expect.toIncludeSameMembers([
        'components/schemas/Single/allOf/0',
        'components/schemas/Single/allOf/1/type',
        'components/schemas/Single/allOf/2/type',
      ]),
    )
  })

  it('merge combiners', () => {
    const source = createOas({
      allOf: [
        { oneOf: [{ multipleOf: 2 }, { multipleOf: 3 }] },
        { oneOf: [{ multipleOf: 5 }, { multipleOf: 7 }] },
      ],
    })

    const result = normalize(source, OPTIONS)
    commonOriginsCheck(result, { source })
    expect(result).toHaveProperty(['components', 'schemas', 'Single', 'oneOf', 0, 'multipleOf'], 10)
    expect(result).toHaveProperty(['components', 'schemas', 'Single', 'oneOf', 1, 'multipleOf'], 14)
    expect(result).toHaveProperty(['components', 'schemas', 'Single', 'oneOf', 2, 'multipleOf'], 15)
    expect(result).toHaveProperty(['components', 'schemas', 'Single', 'oneOf', 3, 'multipleOf'], 21)
    const resultWithHmr = convertOriginToHumanReadable(result, TEST_ORIGINS_FLAG)
    expect(resultWithHmr).toHaveProperty(['components', 'schemas', 'Single', TEST_ORIGINS_FLAG, 'oneOf'], expect.toIncludeSameMembers(['components/schemas/Single/allOf/0/oneOf', 'components/schemas/Single/allOf/1/oneOf']))

    expect(resultWithHmr).toHaveProperty(['components', 'schemas', 'Single', 'oneOf', TEST_ORIGINS_FLAG, 0], expect.toIncludeSameMembers(['components/schemas/Single/allOf/0/oneOf/0', 'components/schemas/Single/allOf/1/oneOf/0']))
    expect(resultWithHmr).toHaveProperty(['components', 'schemas', 'Single', 'oneOf', TEST_ORIGINS_FLAG, 1], expect.toIncludeSameMembers(['components/schemas/Single/allOf/0/oneOf/0', 'components/schemas/Single/allOf/1/oneOf/1']))
    expect(resultWithHmr).toHaveProperty(['components', 'schemas', 'Single', 'oneOf', TEST_ORIGINS_FLAG, 2], expect.toIncludeSameMembers(['components/schemas/Single/allOf/0/oneOf/1', 'components/schemas/Single/allOf/1/oneOf/0']))
    expect(resultWithHmr).toHaveProperty(['components', 'schemas', 'Single', 'oneOf', TEST_ORIGINS_FLAG, 3], expect.toIncludeSameMembers(['components/schemas/Single/allOf/0/oneOf/1', 'components/schemas/Single/allOf/1/oneOf/1']))

    expect(resultWithHmr).toHaveProperty(['components', 'schemas', 'Single', 'oneOf', 0, TEST_ORIGINS_FLAG, 'multipleOf'], expect.toIncludeSameMembers(['components/schemas/Single/allOf/0/oneOf/0/multipleOf', 'components/schemas/Single/allOf/1/oneOf/0/multipleOf']))
    expect(resultWithHmr).toHaveProperty(['components', 'schemas', 'Single', 'oneOf', 1, TEST_ORIGINS_FLAG, 'multipleOf'], expect.toIncludeSameMembers(['components/schemas/Single/allOf/0/oneOf/0/multipleOf', 'components/schemas/Single/allOf/1/oneOf/1/multipleOf']))
    expect(resultWithHmr).toHaveProperty(['components', 'schemas', 'Single', 'oneOf', 2, TEST_ORIGINS_FLAG, 'multipleOf'], expect.toIncludeSameMembers(['components/schemas/Single/allOf/0/oneOf/1/multipleOf', 'components/schemas/Single/allOf/1/oneOf/0/multipleOf']))
    expect(resultWithHmr).toHaveProperty(['components', 'schemas', 'Single', 'oneOf', 3, TEST_ORIGINS_FLAG, 'multipleOf'], expect.toIncludeSameMembers(['components/schemas/Single/allOf/0/oneOf/1/multipleOf', 'components/schemas/Single/allOf/1/oneOf/1/multipleOf']))
  })

  it('merges enum', () => {
    const source = createOas({
      allOf: [
        {},
        {
          enum: ['foo', 'bar', 'lol', [2], [1], null, { description: 'object' }, { description: 'object' }],
        },
        {
          enum: ['foo', [1], [1], { description: 'object' }],
        },
        {
          enum: ['lol', 'foo', [3], [1], null, { description: 'object' }],
        },
      ],
    })

    const result: any = normalize(source, OPTIONS)
    commonOriginsCheck(result, { source })

    expect(result).toHaveProperty(['components', 'schemas', 'Single', 'enum'], expect.toIncludeSameMembers([
      expect.objectContaining([1]),
      expect.objectContaining({ description: 'object' }),
      'foo',
    ]))

    const resultWithHmr = convertOriginToHumanReadable(result, TEST_ORIGINS_FLAG)
    expect(resultWithHmr).toHaveProperty(['components', 'schemas', 'Single', TEST_ORIGINS_FLAG, 'enum'],
      expect.toIncludeSameMembers([
        'components/schemas/Single/allOf/1/enum',
        'components/schemas/Single/allOf/2/enum',
        'components/schemas/Single/allOf/3/enum',
      ]),
    )

    expect(resultWithHmr).toHaveProperty(['components', 'schemas', 'Single', 'enum', TEST_ORIGINS_FLAG],
      expect.toContainAllValues([
        // 'foo'
        [
          'components/schemas/Single/allOf/1/enum/0',
          'components/schemas/Single/allOf/2/enum/0',
          'components/schemas/Single/allOf/3/enum/1',
        ],
        // [1] //todo should be 4 origins for [1]
        [
          'components/schemas/Single/allOf/1/enum/4',
          'components/schemas/Single/allOf/2/enum/1',
          'components/schemas/Single/allOf/3/enum/3',
        ],
        // object
        [
          'components/schemas/Single/allOf/1/enum/6',
          'components/schemas/Single/allOf/2/enum/3',
          'components/schemas/Single/allOf/1/enum/7',
          'components/schemas/Single/allOf/3/enum/5',
        ],
      ]),
    )
  })

  it('merges not', () => {
    const source = {
      allOf: [
        {
          not: {
            type: 'string',
          },
        },
        {
          not: {
            type: 'number',
          },
        },
      ],
    }
    const result = normalize(source, OPTIONS)

    commonOriginsCheck(result, { source })
  })

  it('merges required', () => {
    const source = createOas({
      required: ['prop1'],
      allOf: [
        {
          required: ['prop2', 'prop1'],
        },
        {
          required: ['prop3', 'prop3'],
        },
      ],
    })

    const result: any = normalize(source, OPTIONS)
    commonOriginsCheck(result, { source })

    expect(result).toHaveProperty(['components', 'schemas', 'Single', 'required'], expect.toIncludeSameMembers(['prop1', 'prop2', 'prop3']))

    const resultWithHmr = convertOriginToHumanReadable(result, TEST_ORIGINS_FLAG)
    expect(resultWithHmr).toHaveProperty(['components', 'schemas', 'Single', TEST_ORIGINS_FLAG, 'required'],
      expect.toIncludeSameMembers([
        'components/schemas/Single/required',
        'components/schemas/Single/allOf/0/required',
        'components/schemas/Single/allOf/1/required',
      ]),
    )

    expect(resultWithHmr).toHaveProperty(['components', 'schemas', 'Single', 'required', TEST_ORIGINS_FLAG],
      expect.toContainAllValues([
        // prop1
        expect.toIncludeSameMembers(['components/schemas/Single/required/0', 'components/schemas/Single/allOf/0/required/1']),
        // prop2
        expect.toIncludeSameMembers(['components/schemas/Single/allOf/0/required/0']),
        // prop3
        expect.toIncludeSameMembers(['components/schemas/Single/allOf/1/required/0', 'components/schemas/Single/allOf/1/required/1']),
      ]),
    )
  })
})
