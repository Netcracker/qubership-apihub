import { convertOriginToHumanReadable, normalize, NormalizeOptions } from '../../src'
import 'jest-extended'
import { commonOriginsCheck, createOas, TEST_ORIGINS_FLAG } from '../helpers'

describe('merge origins properties', function () {
  const OPTIONS: NormalizeOptions = {
    originsFlag: TEST_ORIGINS_FLAG,
  }

  it('merges uncommon properties', () => {
    const source = createOas({
      properties: {
        one: { description: 'one' },
      },
      allOf: [
        {
          properties: {
            two: { description: 'two' },
          },
        },
        {
          properties: {
            three: { description: 'three' },
          },
        },
      ],
    })
    const result = normalize(source, OPTIONS)

    commonOriginsCheck(result, { source })

    expect(result).toHaveProperty(['components', 'schemas', 'Single', 'properties', 'one', 'description'], 'one')
    expect(result).toHaveProperty(['components', 'schemas', 'Single', 'properties', 'two', 'description'], 'two')
    expect(result).toHaveProperty(['components', 'schemas', 'Single', 'properties', 'three', 'description'], 'three')
    const resultWithHmr = convertOriginToHumanReadable(result, TEST_ORIGINS_FLAG)
    expect(resultWithHmr).toHaveProperty(['components', 'schemas', TEST_ORIGINS_FLAG, 'Single'], ['components/schemas/Single'])
    expect(resultWithHmr).toHaveProperty(['components', 'schemas', 'Single', TEST_ORIGINS_FLAG, 'properties'],
      expect.toIncludeSameMembers([
        'components/schemas/Single/properties',
        'components/schemas/Single/allOf/0/properties',
        'components/schemas/Single/allOf/1/properties',
      ]),
    )
    expect(resultWithHmr).toHaveProperty(['components', 'schemas', 'Single', 'properties', TEST_ORIGINS_FLAG, 'one'], ['components/schemas/Single/properties/one'])
    expect(resultWithHmr).toHaveProperty(['components', 'schemas', 'Single', 'properties', TEST_ORIGINS_FLAG, 'two'], ['components/schemas/Single/allOf/0/properties/two'])
    expect(resultWithHmr).toHaveProperty(['components', 'schemas', 'Single', 'properties', TEST_ORIGINS_FLAG, 'three'], ['components/schemas/Single/allOf/1/properties/three'])

    expect(resultWithHmr).toHaveProperty(['components', 'schemas', 'Single', 'properties', 'one', TEST_ORIGINS_FLAG, 'description'], ['components/schemas/Single/properties/one/description'])
    expect(resultWithHmr).toHaveProperty(['components', 'schemas', 'Single', 'properties', 'two', TEST_ORIGINS_FLAG, 'description'], ['components/schemas/Single/allOf/0/properties/two/description'])
    expect(resultWithHmr).toHaveProperty(['components', 'schemas', 'Single', 'properties', 'three', TEST_ORIGINS_FLAG, 'description'], ['components/schemas/Single/allOf/1/properties/three/description'])
  })

  it('merges common properties', () => {
    const source = createOas({
      properties: {
        same: { description: 'one' },
      },
      allOf: [
        {
          properties: {
            same: { description: 'two' },
          },
        },
        {
          allOf: [
            {
              description: 'three',
            },
            {
              properties: {
                same: { description: 'third' },
              },
            },
          ],
        },
      ],
    })
    const result = normalize(source, OPTIONS)
    commonOriginsCheck(result, { source })

    expect(result).toHaveProperty(['components', 'schemas', 'Single', 'properties', 'same', 'description'], 'one')
    expect(result).toHaveProperty(['components', 'schemas', 'Single', 'description'], 'three')
    const resultWithHmr = convertOriginToHumanReadable(result, TEST_ORIGINS_FLAG)
    expect(resultWithHmr).toHaveProperty(['components', 'schemas', TEST_ORIGINS_FLAG, 'Single'], ['components/schemas/Single'])
    expect(resultWithHmr).toHaveProperty(['components', 'schemas', 'Single', TEST_ORIGINS_FLAG, 'properties'],
      expect.toIncludeSameMembers([
        'components/schemas/Single/properties',
        'components/schemas/Single/allOf/0/properties',
        'components/schemas/Single/allOf/1/allOf/1/properties',
      ]),
    )
    expect(resultWithHmr).toHaveProperty(['components', 'schemas', 'Single', TEST_ORIGINS_FLAG, 'description'], ['components/schemas/Single/allOf/1/allOf/0/description'])
    expect(resultWithHmr).toHaveProperty(['components', 'schemas', 'Single', 'properties', TEST_ORIGINS_FLAG, 'same'], expect.toIncludeSameMembers([
      'components/schemas/Single/properties/same',
      'components/schemas/Single/allOf/0/properties/same',
      'components/schemas/Single/allOf/1/allOf/1/properties/same',
    ]))

    expect(resultWithHmr).toHaveProperty(['components', 'schemas', 'Single', 'properties', 'same', TEST_ORIGINS_FLAG, 'description'], ['components/schemas/Single/properties/same/description'])
  })

  it('merges simple additional properties', () => {
    const source = createOas({
      additionalProperties: true,
      allOf: [
        {
          additionalProperties: false,
        },
        {
          allOf: [
            {
              additionalProperties: false,
            },
            {
              additionalProperties: true,
            },
          ],
        },
      ],
    })
    const result = normalize(source, OPTIONS)
    commonOriginsCheck(result, { source })

    expect(result).toHaveProperty(['components', 'schemas', 'Single', 'additionalProperties'], false)
    const resultWithHmr = convertOriginToHumanReadable(result, TEST_ORIGINS_FLAG)
    expect(resultWithHmr).toHaveProperty(['components', 'schemas', TEST_ORIGINS_FLAG, 'Single'], ['components/schemas/Single'])
    expect(resultWithHmr).toHaveProperty(['components', 'schemas', 'Single', TEST_ORIGINS_FLAG, 'additionalProperties'],
      expect.toIncludeSameMembers([
        'components/schemas/Single/allOf/0/additionalProperties',
        'components/schemas/Single/allOf/1/allOf/0/additionalProperties',
      ]),
    )
  })

  it('merges complex additional properties. true', () => {
    const source = createOas({
      additionalProperties: true,
      allOf: [
        {
          additionalProperties: {
            description: 'one',
          },
        },
        {
          allOf: [
            {
              additionalProperties: {
                description: 'two',
              },
            },
            {
              additionalProperties: {
                description: 'three',
              },
            },
          ],
        },
      ],
    })
    const result = normalize(source, OPTIONS)

    commonOriginsCheck(result, { source })

    expect(result).toHaveProperty(['components', 'schemas', 'Single', 'additionalProperties', 'description'], 'three')
    const resultWithHmr = convertOriginToHumanReadable(result, TEST_ORIGINS_FLAG)
    expect(resultWithHmr).toHaveProperty(['components', 'schemas', TEST_ORIGINS_FLAG, 'Single'], ['components/schemas/Single'])
    expect(resultWithHmr).toHaveProperty(['components', 'schemas', 'Single', TEST_ORIGINS_FLAG, 'additionalProperties'],
      expect.toIncludeSameMembers([
        'components/schemas/Single/additionalProperties',
        'components/schemas/Single/allOf/0/additionalProperties',
        'components/schemas/Single/allOf/1/allOf/0/additionalProperties',
        'components/schemas/Single/allOf/1/allOf/1/additionalProperties',
      ]),
    )
    expect(resultWithHmr).toHaveProperty(['components', 'schemas', 'Single', 'additionalProperties', TEST_ORIGINS_FLAG, 'description'], ['components/schemas/Single/allOf/1/allOf/1/additionalProperties/description'])

  })

  it('merges complex additional properties. false', () => {
    const source = createOas({
      additionalProperties: true,
      allOf: [
        {
          additionalProperties: {
            description: 'one',
          },
        },
        {
          allOf: [
            {
              additionalProperties: false,
            },
            {
              additionalProperties: {
                description: 'three',
              },
            },
          ],
        },
      ],
    })
    const result = normalize(source, OPTIONS)
    commonOriginsCheck(result, { source })

    expect(result).toHaveProperty(['components', 'schemas', 'Single', 'additionalProperties', 'description'], 'three')
    const resultWithHmr = convertOriginToHumanReadable(result, TEST_ORIGINS_FLAG)
    expect(resultWithHmr).toHaveProperty(['components', 'schemas', TEST_ORIGINS_FLAG, 'Single'], ['components/schemas/Single'])
    expect(resultWithHmr).toHaveProperty(['components', 'schemas', 'Single', TEST_ORIGINS_FLAG, 'additionalProperties'],
      expect.toIncludeSameMembers([
        'components/schemas/Single/additionalProperties',
        'components/schemas/Single/allOf/0/additionalProperties',
        'components/schemas/Single/allOf/1/allOf/0/additionalProperties',
        'components/schemas/Single/allOf/1/allOf/1/additionalProperties',
      ]),
    )
    expect(resultWithHmr).toHaveProperty(['components', 'schemas', 'Single', 'additionalProperties', TEST_ORIGINS_FLAG, 'description'], ['components/schemas/Single/allOf/1/allOf/1/additionalProperties/description'])

  })

  it('merges properties with additional properties', () => {
    const source = {
      properties: {
        p0: { description: 'unique' },
      },
      additionalProperties: false,
      allOf: [
        {
          properties: {
            p1: {
              description: '1-common',
              type: 'string',
            },
          },
          additionalProperties: {
            description: '1-additionalProperties',
            minimum: 10,
            type: 'number',
          },
        },
        {
          properties: {
            p1: {
              description: '2-common',
            },
          },
          patternProperties: {
            '^p\\d$': {
              description: '1-patternProperties',
              maximum: 20,
              type: 'number',
            },
          },
        },
        {
          properties: {
            p1: {
              description: '3-common',
              type: 'string',
              minimum: 15,
              maximum: 15,
            },
            p2n: {
              type: 'string',
              description: 'not match by 1-additionalProperties only',
            },
            p3: {
              type: 'number',
              description: 'match by 1-additionalProperties and 1-patternProperties',
            },
            p4: {
              type: 'string',
              description: 'not match by 1-patternProperties',
            },
          },
        },
      ],
    }
    const result = normalize(source, OPTIONS)
    commonOriginsCheck(result, { source })

    expect(result).toHaveProperty(['properties', 'p0', 'description'], '1-patternProperties')
    expect(result).toHaveProperty(['properties', 'p0', 'minimum'], 10)
    expect(result).toHaveProperty(['properties', 'p0', 'maximum'], 20)
    expect(result).toHaveProperty(['properties', 'p0', 'type'], 'number')

    expect(result).toHaveProperty(['properties', 'p1', 'description'], '3-common')
    expect(result).toHaveProperty(['properties', 'p1', 'minimum'], 15)
    expect(result).toHaveProperty(['properties', 'p1', 'maximum'], 15)

    expect(result).toHaveProperty(['properties', 'p2n', 'description'], '1-additionalProperties')
    expect(result).toHaveProperty(['properties', 'p2n', 'minimum'], 10)

    expect(result).toHaveProperty(['properties', 'p3', 'description'], '1-patternProperties')
    expect(result).toHaveProperty(['properties', 'p3', 'minimum'], 10)
    expect(result).toHaveProperty(['properties', 'p3', 'maximum'], 20)

    expect(result).toHaveProperty(['properties', 'p4', 'description'], '1-patternProperties')
    expect(result).toHaveProperty(['properties', 'p4', 'minimum'], 10)
    expect(result).toHaveProperty(['properties', 'p4', 'maximum'], 20)

    expect(result).toHaveProperty(['additionalProperties', 'description'], '1-additionalProperties')
    expect(result).toHaveProperty(['additionalProperties', 'minimum'], 10)

    expect(result).toHaveProperty(['patternProperties', '^p\\d$', 'description'], '1-patternProperties')
    expect(result).toHaveProperty(['patternProperties', '^p\\d$', 'maximum'], 20)
    expect(result).toHaveProperty(['patternProperties', '^p\\d$', 'type'], 'number')

    const resultWithHmr = convertOriginToHumanReadable(result, TEST_ORIGINS_FLAG)
    expect(resultWithHmr).toHaveProperty(['properties', TEST_ORIGINS_FLAG, 'p0'], ['properties/p0'])
    expect(resultWithHmr).toHaveProperty(['properties', 'p0', TEST_ORIGINS_FLAG, 'description'], ['allOf/1/patternProperties/^p\\d$/description'])
    expect(resultWithHmr).toHaveProperty(['properties', 'p0', TEST_ORIGINS_FLAG, 'minimum'], ['allOf/0/additionalProperties/minimum'])
    expect(resultWithHmr).toHaveProperty(['properties', 'p0', TEST_ORIGINS_FLAG, 'maximum'], ['allOf/1/patternProperties/^p\\d$/maximum'])
    expect(resultWithHmr).toHaveProperty(['properties', 'p0', TEST_ORIGINS_FLAG, 'type'], expect.toIncludeSameMembers(['allOf/0/additionalProperties/type', 'allOf/1/patternProperties/^p\\d$/type']))

    expect(resultWithHmr).toHaveProperty(['properties', TEST_ORIGINS_FLAG, 'p1'], expect.toIncludeSameMembers(['allOf/0/properties/p1', 'allOf/1/properties/p1', 'allOf/2/properties/p1']))
    expect(resultWithHmr).toHaveProperty(['properties', 'p1', TEST_ORIGINS_FLAG, 'description'], ['allOf/2/properties/p1/description'])
    expect(resultWithHmr).toHaveProperty(['properties', 'p1', TEST_ORIGINS_FLAG, 'minimum'], ['allOf/2/properties/p1/minimum'])
    expect(resultWithHmr).toHaveProperty(['properties', 'p1', TEST_ORIGINS_FLAG, 'maximum'], ['allOf/2/properties/p1/maximum'])
    expect(resultWithHmr).toHaveProperty(['properties', 'p1', TEST_ORIGINS_FLAG, 'not'], ['additionalProperties']) 

    expect(resultWithHmr).toHaveProperty(['properties', TEST_ORIGINS_FLAG, 'p2n'], ['allOf/2/properties/p2n'])
    expect(resultWithHmr).toHaveProperty(['properties', 'p2n', TEST_ORIGINS_FLAG, 'description'], ['allOf/0/additionalProperties/description'])
    expect(resultWithHmr).toHaveProperty(['properties', 'p2n', TEST_ORIGINS_FLAG, 'minimum'], ['allOf/0/additionalProperties/minimum'])
    expect(resultWithHmr).not.toHaveProperty(['properties', 'p2n', TEST_ORIGINS_FLAG, 'maximum'])
    expect(resultWithHmr).toHaveProperty(['properties', 'p2n', TEST_ORIGINS_FLAG, 'not'], ['additionalProperties','allOf/1/patternProperties']) 

    expect(resultWithHmr).toHaveProperty(['properties', TEST_ORIGINS_FLAG, 'p3'], ['allOf/2/properties/p3'])
    expect(resultWithHmr).toHaveProperty(['properties', 'p3', TEST_ORIGINS_FLAG, 'description'], ['allOf/1/patternProperties/^p\\d$/description'])
    expect(resultWithHmr).toHaveProperty(['properties', 'p3', TEST_ORIGINS_FLAG, 'minimum'], ['allOf/0/additionalProperties/minimum'])
    expect(resultWithHmr).toHaveProperty(['properties', 'p3', TEST_ORIGINS_FLAG, 'maximum'], ['allOf/1/patternProperties/^p\\d$/maximum'])
    expect(resultWithHmr).toHaveProperty(['properties', 'p3', TEST_ORIGINS_FLAG, 'not'], ['additionalProperties']) 

    expect(resultWithHmr).toHaveProperty(['properties', TEST_ORIGINS_FLAG, 'p4'], ['allOf/2/properties/p4'])
    expect(resultWithHmr).toHaveProperty(['properties', 'p4', TEST_ORIGINS_FLAG, 'description'], ['allOf/1/patternProperties/^p\\d$/description'])
    expect(resultWithHmr).toHaveProperty(['properties', 'p4', TEST_ORIGINS_FLAG, 'minimum'], ['allOf/0/additionalProperties/minimum'])
    expect(resultWithHmr).toHaveProperty(['properties', 'p4', TEST_ORIGINS_FLAG, 'maximum'], ['allOf/1/patternProperties/^p\\d$/maximum'])
    expect(resultWithHmr).toHaveProperty(['properties', 'p4', TEST_ORIGINS_FLAG, 'not'], ['additionalProperties']) 

    expect(result).toHaveProperty(['additionalProperties', TEST_ORIGINS_FLAG, 'description'], ['allOf/0/additionalProperties/description'])
    expect(result).toHaveProperty(['additionalProperties', TEST_ORIGINS_FLAG, 'minimum'], ['allOf/0/additionalProperties/minimum'])
    expect(result).toHaveProperty(['additionalProperties',TEST_ORIGINS_FLAG, 'not'], ['additionalProperties']) 

    expect(result).toHaveProperty(['patternProperties', '^p\\d$', TEST_ORIGINS_FLAG, 'description'], ['allOf/1/patternProperties/^p\\d$/description'])
    expect(result).toHaveProperty(['patternProperties', '^p\\d$', TEST_ORIGINS_FLAG, 'maximum'], ['allOf/1/patternProperties/^p\\d$/maximum'])
    expect(result).toHaveProperty(['patternProperties', '^p\\d$', TEST_ORIGINS_FLAG, 'type'], ['allOf/1/patternProperties/^p\\d$/type'])

    expect(resultWithHmr).toHaveProperty(['patternProperties', TEST_ORIGINS_FLAG, '^p\\d$'], ['allOf/1/patternProperties/^p\\d$'])
    expect(resultWithHmr).toHaveProperty([TEST_ORIGINS_FLAG, 'properties'], expect.toIncludeSameMembers(['properties', 'allOf/0/properties', 'allOf/1/properties', 'allOf/2/properties']))
    expect(resultWithHmr).toHaveProperty([TEST_ORIGINS_FLAG, 'additionalProperties'], expect.toIncludeSameMembers(['additionalProperties', 'allOf/0/additionalProperties']))
    expect(resultWithHmr).toHaveProperty([TEST_ORIGINS_FLAG, 'patternProperties'], ['allOf/1/patternProperties'])
  })
})
