import { convertOriginToHumanReadable, normalize, NormalizeOptions } from '../../src'
import 'jest-extended'
import { commonOriginsCheck, createOas, TEST_ORIGINS_FLAG, TEST_ORIGINS_FOR_DEFAULTS } from '../helpers'

describe('unify origins', function () {
  const HMR_ORIGINS_FOR_DEFAULTS = [TEST_ORIGINS_FOR_DEFAULTS[0].value]
  const OPTIONS: NormalizeOptions = {
    originsFlag: TEST_ORIGINS_FLAG,
    createOriginsForDefaults: () => TEST_ORIGINS_FOR_DEFAULTS,
    unify: true,
  }

  it('unify empty schemas', () => {
    const source = createOas({})
    const result = normalize(source, OPTIONS)
    commonOriginsCheck(result, { source })
    const resultWithHmr = convertOriginToHumanReadable(result, TEST_ORIGINS_FLAG)
    expect(resultWithHmr).toHaveProperty(['components', 'schemas', TEST_ORIGINS_FLAG, 'Single'], ['components/schemas/Single'])
    expect(resultWithHmr).toHaveProperty(['components', 'schemas', 'Single', TEST_ORIGINS_FLAG, 'additionalProperties'], HMR_ORIGINS_FOR_DEFAULTS)
    expect(resultWithHmr).toHaveProperty(['components', 'schemas', 'Single', TEST_ORIGINS_FLAG, 'anyOf'], HMR_ORIGINS_FOR_DEFAULTS)
    expect(resultWithHmr).toHaveProperty(['components', 'schemas', 'Single', TEST_ORIGINS_FLAG, 'readOnly'], HMR_ORIGINS_FOR_DEFAULTS)
    expect(resultWithHmr).toHaveProperty(['components', 'schemas', 'Single', 'additionalProperties', TEST_ORIGINS_FLAG, 'additionalProperties'], HMR_ORIGINS_FOR_DEFAULTS)
    expect(resultWithHmr).toHaveProperty(['components', 'schemas', 'Single', 'additionalProperties', TEST_ORIGINS_FLAG, 'anyOf'], HMR_ORIGINS_FOR_DEFAULTS)
    expect(resultWithHmr).toHaveProperty(['components', 'schemas', 'Single', 'anyOf', TEST_ORIGINS_FLAG, 0], HMR_ORIGINS_FOR_DEFAULTS)
    expect(resultWithHmr).toHaveProperty(['components', 'schemas', 'Single', 'anyOf', 0, TEST_ORIGINS_FLAG, 'type'], HMR_ORIGINS_FOR_DEFAULTS)
    expect(resultWithHmr).toHaveProperty(['components', 'schemas', 'Single', 'anyOf', 0, TEST_ORIGINS_FLAG, 'readOnly'], HMR_ORIGINS_FOR_DEFAULTS)
  })

  it('unify empty schemas with liftCombiners', () => {
    const source = createOas({})
    const result = normalize(source, {
      ...OPTIONS,
      liftCombiners: true,
    })
    commonOriginsCheck(result, { source })
    const resultWithHmr = convertOriginToHumanReadable(result, TEST_ORIGINS_FLAG)
    expect(resultWithHmr).toHaveProperty(['components', 'schemas', TEST_ORIGINS_FLAG, 'Single'], ['components/schemas/Single'])
    expect(resultWithHmr).not.toHaveProperty(['components', 'schemas', 'Single', TEST_ORIGINS_FLAG, 'additionalProperties'], HMR_ORIGINS_FOR_DEFAULTS)
    expect(resultWithHmr).toHaveProperty(['components', 'schemas', 'Single', TEST_ORIGINS_FLAG, 'anyOf'], HMR_ORIGINS_FOR_DEFAULTS)
    expect(resultWithHmr).toHaveProperty(['components', 'schemas', 'Single', 'anyOf', TEST_ORIGINS_FLAG, 0], HMR_ORIGINS_FOR_DEFAULTS)
    expect(resultWithHmr).toHaveProperty(['components', 'schemas', 'Single', 'anyOf', 0, TEST_ORIGINS_FLAG, 'type'], HMR_ORIGINS_FOR_DEFAULTS)
    expect(resultWithHmr).toHaveProperty(['components', 'schemas', 'Single', 'anyOf', 0, TEST_ORIGINS_FLAG, 'readOnly'], HMR_ORIGINS_FOR_DEFAULTS)
    expect(resultWithHmr).toHaveProperty(['components', 'schemas', 'Single', 'anyOf', 4, TEST_ORIGINS_FLAG, 'additionalProperties'], HMR_ORIGINS_FOR_DEFAULTS)
    expect(resultWithHmr).toHaveProperty(['components', 'schemas', 'Single', 'anyOf', 4, 'additionalProperties', TEST_ORIGINS_FLAG, 'anyOf'], HMR_ORIGINS_FOR_DEFAULTS)
  })

  it('unify empty schemas with allowNotValidSyntheticChanges', () => {
    const source = createOas({})
    const result = normalize(source, {
      ...OPTIONS,
      allowNotValidSyntheticChanges: true,
      liftCombiners: true,
    })
    commonOriginsCheck(result, { source })
    const resultWithHmr = convertOriginToHumanReadable(result, TEST_ORIGINS_FLAG)
    expect(resultWithHmr).toHaveProperty(['components', 'schemas', TEST_ORIGINS_FLAG, 'Single'], ['components/schemas/Single'])
    expect(resultWithHmr).toHaveProperty(['components', 'schemas', 'Single', TEST_ORIGINS_FLAG, 'type'], HMR_ORIGINS_FOR_DEFAULTS)
    expect(resultWithHmr).toHaveProperty(['components', 'schemas', 'Single', TEST_ORIGINS_FLAG, 'additionalProperties'], HMR_ORIGINS_FOR_DEFAULTS)
    expect(resultWithHmr).toHaveProperty(['components', 'schemas', 'Single', 'additionalProperties', TEST_ORIGINS_FLAG, 'type'], HMR_ORIGINS_FOR_DEFAULTS)
    expect(resultWithHmr).toHaveProperty(['components', 'schemas', 'Single', 'additionalProperties', TEST_ORIGINS_FLAG, 'additionalProperties'], HMR_ORIGINS_FOR_DEFAULTS)
  })

  it('unify dirty empty schemas', () => {
    const source = createOas({
      readOnly: true,
    })
    const result = normalize(source, {
      ...OPTIONS,
      allowNotValidSyntheticChanges: true,
      liftCombiners: true,
    })
    commonOriginsCheck(result, { source })
    const resultWithHmr = convertOriginToHumanReadable(result, TEST_ORIGINS_FLAG)
    expect(resultWithHmr).toHaveProperty(['components', 'schemas', TEST_ORIGINS_FLAG, 'Single'], ['components/schemas/Single'])
    expect(resultWithHmr).toHaveProperty(['components', 'schemas', 'Single', TEST_ORIGINS_FLAG, 'readOnly'], ['components/schemas/Single/readOnly'])
    expect(resultWithHmr).toHaveProperty(['components', 'schemas', 'Single', TEST_ORIGINS_FLAG, 'type'], HMR_ORIGINS_FOR_DEFAULTS)
    expect(resultWithHmr).toHaveProperty(['components', 'schemas', 'Single', TEST_ORIGINS_FLAG, 'writeOnly'], HMR_ORIGINS_FOR_DEFAULTS)
  })

  it('unify type infer schemas', () => {
    const source = createOas({
      readOnly: true,
      additionalProperties: true,
    })
    const result = normalize(source, {
      ...OPTIONS,
      liftCombiners: true,
    })
    commonOriginsCheck(result, { source })
    const resultWithHmr = convertOriginToHumanReadable(result, TEST_ORIGINS_FLAG)
    expect(resultWithHmr).toHaveProperty(['components', 'schemas', TEST_ORIGINS_FLAG, 'Single'], ['components/schemas/Single'])
    expect(resultWithHmr).toHaveProperty(['components', 'schemas', 'Single', TEST_ORIGINS_FLAG, 'type'], ['components/schemas/Single/additionalProperties'])
    expect(resultWithHmr).toHaveProperty(['components', 'schemas', 'Single', TEST_ORIGINS_FLAG, 'minProperties'], HMR_ORIGINS_FOR_DEFAULTS)
    expect(resultWithHmr).toHaveProperty(['components', 'schemas', 'Single', TEST_ORIGINS_FLAG, 'readOnly'], ['components/schemas/Single/readOnly'])
    expect(resultWithHmr).toHaveProperty(['components', 'schemas', 'Single', TEST_ORIGINS_FLAG, 'additionalProperties'], ['components/schemas/Single/additionalProperties'])
    expect(resultWithHmr).toHaveProperty(['components', 'schemas', 'Single', 'additionalProperties', TEST_ORIGINS_FLAG, 'anyOf'], ['components/schemas/Single/additionalProperties'])
    expect(resultWithHmr).toHaveProperty(['components', 'schemas', 'Single', 'additionalProperties', 'anyOf', TEST_ORIGINS_FLAG, 0], ['components/schemas/Single/additionalProperties'])
    expect(resultWithHmr).toHaveProperty(['components', 'schemas', 'Single', 'additionalProperties', 'anyOf', 0, TEST_ORIGINS_FLAG, 'type'], ['components/schemas/Single/additionalProperties'])
    expect(resultWithHmr).toHaveProperty(['components', 'schemas', 'Single', 'additionalProperties', 'anyOf', 0, TEST_ORIGINS_FLAG, 'readOnly'], HMR_ORIGINS_FOR_DEFAULTS)
    expect(resultWithHmr).toHaveProperty(['components', 'schemas', 'Single', 'additionalProperties', 'anyOf', 4, 'additionalProperties', TEST_ORIGINS_FLAG, 'anyOf'], HMR_ORIGINS_FOR_DEFAULTS)
    expect(resultWithHmr).toHaveProperty(['components', 'schemas', 'Single', 'additionalProperties', 'anyOf', 4, 'additionalProperties', 'anyOf', TEST_ORIGINS_FLAG, 0], HMR_ORIGINS_FOR_DEFAULTS)
    expect(resultWithHmr).toHaveProperty(['components', 'schemas', 'Single', 'additionalProperties', 'anyOf', 4, 'additionalProperties', 'anyOf', 0, TEST_ORIGINS_FLAG, 'type'], HMR_ORIGINS_FOR_DEFAULTS)
  })

  it('unify type split', () => {
    const source = createOas({
      readOnly: true,
      format: 'email',
      minimum: 42,
      maximum: 42,
    })
    const result = normalize(source, {
      ...OPTIONS,
      liftCombiners: true,
    })
    commonOriginsCheck(result, { source })
    const resultWithHmr = convertOriginToHumanReadable(result, TEST_ORIGINS_FLAG)
    expect(resultWithHmr).toHaveProperty(['components', 'schemas', TEST_ORIGINS_FLAG, 'Single'], ['components/schemas/Single'])
    expect(resultWithHmr).toHaveProperty(['components', 'schemas', 'Single', TEST_ORIGINS_FLAG, 'anyOf'], expect.toIncludeSameMembers(['components/schemas/Single/format', 'components/schemas/Single/minimum', 'components/schemas/Single/maximum']))
    //todo if index changes just found correct index before and us it here
    expect(resultWithHmr).toHaveProperty(['components', 'schemas', 'Single', 'anyOf', TEST_ORIGINS_FLAG, 0], ['components/schemas/Single/format'])
    expect(resultWithHmr).toHaveProperty(['components', 'schemas', 'Single', 'anyOf', TEST_ORIGINS_FLAG, 1], expect.toIncludeSameMembers(['components/schemas/Single/format', 'components/schemas/Single/minimum', 'components/schemas/Single/maximum']))
    expect(resultWithHmr).toHaveProperty(['components', 'schemas', 'Single', 'anyOf', TEST_ORIGINS_FLAG, 2], expect.toIncludeSameMembers(['components/schemas/Single/format', 'components/schemas/Single/minimum', 'components/schemas/Single/maximum']))

    expect(resultWithHmr).toHaveProperty(['components', 'schemas', 'Single', 'anyOf', 0, TEST_ORIGINS_FLAG, 'type'], ['components/schemas/Single/format'])
    expect(resultWithHmr).toHaveProperty(['components', 'schemas', 'Single', 'anyOf', 0, TEST_ORIGINS_FLAG, 'readOnly'], ['components/schemas/Single/readOnly'])
    expect(resultWithHmr).toHaveProperty(['components', 'schemas', 'Single', 'anyOf', 0, TEST_ORIGINS_FLAG, 'writeOnly'], HMR_ORIGINS_FOR_DEFAULTS)
    expect(resultWithHmr).toHaveProperty(['components', 'schemas', 'Single', 'anyOf', 0, TEST_ORIGINS_FLAG, 'format'], ['components/schemas/Single/format'])
    expect(resultWithHmr).toHaveProperty(['components', 'schemas', 'Single', 'anyOf', 1, TEST_ORIGINS_FLAG, 'type'], expect.toIncludeSameMembers(['components/schemas/Single/format', 'components/schemas/Single/minimum', 'components/schemas/Single/maximum']))
    expect(resultWithHmr).toHaveProperty(['components', 'schemas', 'Single', 'anyOf', 1, TEST_ORIGINS_FLAG, 'readOnly'], ['components/schemas/Single/readOnly'])
    expect(resultWithHmr).toHaveProperty(['components', 'schemas', 'Single', 'anyOf', 1, TEST_ORIGINS_FLAG, 'writeOnly'], HMR_ORIGINS_FOR_DEFAULTS)
    expect(resultWithHmr).toHaveProperty(['components', 'schemas', 'Single', 'anyOf', 1, TEST_ORIGINS_FLAG, 'minimum'], ['components/schemas/Single/minimum'])
    expect(resultWithHmr).toHaveProperty(['components', 'schemas', 'Single', 'anyOf', 1, TEST_ORIGINS_FLAG, 'maximum'], ['components/schemas/Single/maximum'])
    expect(resultWithHmr).toHaveProperty(['components', 'schemas', 'Single', 'anyOf', 1, TEST_ORIGINS_FLAG, 'format'], ['components/schemas/Single/format'])
    expect(resultWithHmr).toHaveProperty(['components', 'schemas', 'Single', 'anyOf', 2, TEST_ORIGINS_FLAG, 'type'], expect.toIncludeSameMembers(['components/schemas/Single/format', 'components/schemas/Single/minimum', 'components/schemas/Single/maximum']))
    expect(resultWithHmr).toHaveProperty(['components', 'schemas', 'Single', 'anyOf', 2, TEST_ORIGINS_FLAG, 'readOnly'], ['components/schemas/Single/readOnly'])
    expect(resultWithHmr).toHaveProperty(['components', 'schemas', 'Single', 'anyOf', 2, TEST_ORIGINS_FLAG, 'writeOnly'], HMR_ORIGINS_FOR_DEFAULTS)
    expect(resultWithHmr).toHaveProperty(['components', 'schemas', 'Single', 'anyOf', 2, TEST_ORIGINS_FLAG, 'minimum'], ['components/schemas/Single/minimum'])
    expect(resultWithHmr).toHaveProperty(['components', 'schemas', 'Single', 'anyOf', 2, TEST_ORIGINS_FLAG, 'maximum'], ['components/schemas/Single/maximum'])
    expect(resultWithHmr).toHaveProperty(['components', 'schemas', 'Single', 'anyOf', 2, TEST_ORIGINS_FLAG, 'format'], ['components/schemas/Single/format'])
  })

  it('unify required', () => {
    const source = createOas({
      required: ['prop1', 'prop2', 'prop1', 'prop3'],
      type: 'object',
      properties: {
        prop1: { type: 'string' },
        prop2: { type: 'number' },
      },
    })

    const result = normalize(source, OPTIONS)
    commonOriginsCheck(result, { source })

    expect(result).toHaveProperty(['components', 'schemas', 'Single', 'required'], expect.toIncludeSameMembers(['prop1', 'prop2']))

    const resultWithHmr = convertOriginToHumanReadable(result, TEST_ORIGINS_FLAG)
    expect(resultWithHmr).toHaveProperty(['components', 'schemas', 'Single', TEST_ORIGINS_FLAG, 'required'], ['components/schemas/Single/required'])
    expect(resultWithHmr).toHaveProperty(['components', 'schemas', 'Single', 'required', TEST_ORIGINS_FLAG],
      expect.toContainAllValues([
        expect.toIncludeSameMembers([
          'components/schemas/Single/required/0',
          'components/schemas/Single/required/2',
        ]),
        ['components/schemas/Single/required/1'],
      ]),
    )
  })

  it('unify enums', () => {
    const source = createOas({
      enum: ['foo', 'bar', 'foo', [1], [1], null, { description: 'object' }, { description: 'object' }],
    })

    const result = normalize(source, OPTIONS)
    commonOriginsCheck(result, { source })

    const resultWithHmr = convertOriginToHumanReadable(result, TEST_ORIGINS_FLAG)
    expect(resultWithHmr).toHaveProperty(['components', 'schemas', 'Single', TEST_ORIGINS_FLAG, 'enum'], ['components/schemas/Single/enum'])
    expect(resultWithHmr).toHaveProperty(['components', 'schemas', 'Single', 'enum', TEST_ORIGINS_FLAG],
      expect.toContainAllValues([
        //foo
        expect.toIncludeSameMembers([
          'components/schemas/Single/enum/0',
          'components/schemas/Single/enum/2',
        ]),
        //bar
        ['components/schemas/Single/enum/1'],
        //[1]
        expect.toIncludeSameMembers([
          'components/schemas/Single/enum/3',
          'components/schemas/Single/enum/4',
        ]),
        //null
        ['components/schemas/Single/enum/5'],
        // object
        expect.toIncludeSameMembers([
          'components/schemas/Single/enum/6',
          'components/schemas/Single/enum/7',
        ]),
      ]),
    )
  })

  it('unify openapi.pathItems with origins', () => {
    const source: any = {
      openapi: '3.0.0',
      info: {
        title: 'Title',
        version: '0.0.0',
      },
      paths: {
        testPath: {
          summary: 'Common Summary',
          description: 'Common Description',
          'x-extension': true,
          parameters: [
            { name: 'common-parameter', in: 'path' },
          ],
          servers: [
            { url: 'http://common-server.com' },
          ],
          post: {
            summary: 'Post Summary',
            parameters: [
              { name: 'post-parameter', in: 'path' },
            ],
            servers: [
              { url: 'http://post-server.com' },
            ],
            responses: {},
          },
          get: {
            summary: 'Get Summary',
            parameters: [
              { name: 'get-parameter', in: 'path' },
            ],
            servers: [
              { url: 'http://get-server.com' },
            ],
            responses: {},
          },
        },
      },
    }

    const result = normalize(source, OPTIONS)
    commonOriginsCheck(result, { source })

    const resultWithHmr = convertOriginToHumanReadable(result, TEST_ORIGINS_FLAG)
    expect(resultWithHmr).not.toHaveProperty(['paths', 'testPath', TEST_ORIGINS_FLAG, 'summary'])
    expect(resultWithHmr).not.toHaveProperty(['paths', 'testPath', TEST_ORIGINS_FLAG, 'description'])
    expect(resultWithHmr).not.toHaveProperty(['paths', 'testPath', TEST_ORIGINS_FLAG, 'parameters'])
    expect(resultWithHmr).not.toHaveProperty(['paths', 'testPath', TEST_ORIGINS_FLAG, 'servers'])
    expect(resultWithHmr).not.toHaveProperty(['paths', 'testPath', TEST_ORIGINS_FLAG, 'x-extension'])

    const methods = ['post', 'get']
    methods.forEach(method => {
      expect(resultWithHmr).toHaveProperty(['paths', 'testPath', method, TEST_ORIGINS_FLAG, 'summary'], [`paths/testPath/${method}/summary`])
      expect(resultWithHmr).toHaveProperty(['paths', 'testPath', method, TEST_ORIGINS_FLAG, 'description'], [`paths/testPath/description`])
      expect(resultWithHmr).toHaveProperty(['paths', 'testPath', method, TEST_ORIGINS_FLAG, 'x-extension'], ['paths/testPath/x-extension'])
      expect(resultWithHmr).toHaveProperty(['paths', 'testPath', method, TEST_ORIGINS_FLAG, 'parameters'], [`paths/testPath/${method}/parameters`])
      expect(resultWithHmr).toHaveProperty(['paths', 'testPath', method, 'parameters', TEST_ORIGINS_FLAG], expect.toContainAllValues([
        ['paths/testPath/parameters/0'],
        [`paths/testPath/${method}/parameters/0`],
      ]))
      expect(resultWithHmr).toHaveProperty(['paths', 'testPath', method, TEST_ORIGINS_FLAG, 'servers'], [`paths/testPath/${method}/servers`])
      expect(resultWithHmr).toHaveProperty(['paths', 'testPath', method, 'servers', TEST_ORIGINS_FLAG], expect.toContainAllValues([
        ['paths/testPath/servers/0'],
        [`paths/testPath/${method}/servers/0`],
      ]))
    })

  })
})
