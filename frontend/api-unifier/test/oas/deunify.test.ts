import { deUnify, unify } from '../../src/unify'
import {
  DEFAULT_TYPE_FLAG_PURE,
  DEFAULT_TYPE_FLAG_SYNTHETIC,
  DenormalizeOptions,
  JSON_SCHEMA_PROPERTY_ADDITIONAL_PROPERTIES,
  JSON_SCHEMA_PROPERTY_DEPRECATED,
  JSON_SCHEMA_PROPERTY_MIN_LENGTH,
  JSON_SCHEMA_PROPERTY_PROPERTIES,
  JSON_SCHEMA_PROPERTY_READ_ONLY,
  JSON_SCHEMA_PROPERTY_WRITE_ONLY,
  NormalizeOptions,
} from '../../src'
import { jsoValueByPath } from '../helpers'

describe('deunify', () => {
  it('defaults', () => {
    const options: NormalizeOptions = { unify: true }
    const initial = {
      type: 'object',
      description: 'description',
    }
    const intermediate = unify(initial, options)
    const result = deUnify(intermediate, options)

    expect(result).toEqual(initial)
  })

  it('additionalProperties:false', () => {
    const skip = jest.fn().mockReturnValue(false)
    const options: NormalizeOptions & DenormalizeOptions = { unify: true, skip }
    const initial = {
      type: 'object',
      additionalProperties: false,
    }
    const intermediate = unify(initial, options)
    const result = deUnify(intermediate, options)

    expect(result).toEqual(initial)
    const skipPaths = [...skip.mock.calls.reduce((set, [v, p]) => set.add(p.join('/')), new Set<string>())]
    expect(skipPaths).toContain('additionalProperties')
    expect(skipPaths).toContain('additionalProperties/not')
    expect(skipPaths).toContain('additionalProperties/not/anyOf')
    expect(skipPaths).toContain('additionalProperties/not/anyOf/0')
    expect(skipPaths).toContain('additionalProperties/not/anyOf/0/type')
    expect(skipPaths).toContain('additionalProperties/not/anyOf/0/readOnly')
    //not need to check all defaults and intermediate values cause it ~60
    expect(skipPaths).toContain('additionalProperties/not/anyOf/6/type')
    expect(skipPaths).toContain('additionalProperties/not/anyOf/6/readOnly')
  })

  it('additionalProperties:true', () => {
    const skip = jest.fn().mockReturnValue(false)
    const options: NormalizeOptions & DenormalizeOptions = { unify: true, skip }
    const initial = {
      type: 'object',
      additionalProperties: true,
    }
    const intermediate = unify(initial, options)
    const result = deUnify(intermediate, options)

    expect(result).toEqual({
      type: 'object',
    })

    const skipPaths = [...skip.mock.calls.reduce((set, [v, p]) => set.add(p.join('/')), new Set<string>())]
    expect(skipPaths).toContain('additionalProperties')
    expect(skipPaths).toContain('additionalProperties/anyOf')
    expect(skipPaths).toContain('additionalProperties/anyOf/0')
    expect(skipPaths).toContain('additionalProperties/anyOf/0/type')
    expect(skipPaths).toContain('additionalProperties/anyOf/0/readOnly')
    //not need to check all defaults and intermediate values cause it ~60
    expect(skipPaths).toContain('additionalProperties/anyOf/6/type')
    expect(skipPaths).toContain('additionalProperties/anyOf/6/readOnly')
  })

  it('emulate $diff in denormalized values', () => {
    const diff = Symbol('diff')
    const source = {
      description: 'desc',
      type: 'object',
      writeOnly: false,
      readOnly: false,
      additionalProperties: true,
      [diff]: {
        readOnly: {},
        additionalProperties: {},
      },
    }
    const options: DenormalizeOptions = {
      unify: true, skip: (value, path) => {
        if (path.length === 0) {
          return false
        }
        const key = path[path.length - 1]
        const containerJsonPath = path.slice(0, path.length - 2)
        const jso = jsoValueByPath(source, containerJsonPath) as Record<PropertyKey, unknown> | undefined
        if (jso === undefined) {
          return false
        }
        const diffs = jso[diff] as Record<PropertyKey, unknown> | undefined
        if (diffs === undefined) {
          return false
        }
        return key in diffs
      },
    }
    const result = deUnify(source, options)

    expect(result).toEqual({
      description: 'desc',
      type: 'object',
      readOnly: false,
      additionalProperties: true,
      [diff]: {
        readOnly: {},
        additionalProperties: {},
      },
    })
  })

  it('flag for defaults', () => {
    const defaultsFlag = Symbol('def')
    const options: NormalizeOptions = { unify: true, defaultsFlag: defaultsFlag }
    const initial = {
      type: 'object',
      properties: {
        hasNonDefault: {
          type: 'string',
          minLength: 42,
        },
        hasDefault: {
          type: 'string',
          minLength: 0,
        },
        noDefault: {
          type: 'string',
        },
      },
    }
    const intermediate = unify(initial, options)
    expect(intermediate).toHaveProperty([defaultsFlag, JSON_SCHEMA_PROPERTY_ADDITIONAL_PROPERTIES], DEFAULT_TYPE_FLAG_SYNTHETIC)
    expect(intermediate).toHaveProperty([defaultsFlag, JSON_SCHEMA_PROPERTY_WRITE_ONLY], DEFAULT_TYPE_FLAG_SYNTHETIC)
    expect(intermediate).toHaveProperty([defaultsFlag, JSON_SCHEMA_PROPERTY_READ_ONLY], DEFAULT_TYPE_FLAG_SYNTHETIC)
    expect(intermediate).toHaveProperty([defaultsFlag, JSON_SCHEMA_PROPERTY_DEPRECATED], DEFAULT_TYPE_FLAG_SYNTHETIC)

    expect(intermediate).toHaveProperty([JSON_SCHEMA_PROPERTY_PROPERTIES, 'hasNonDefault', defaultsFlag, JSON_SCHEMA_PROPERTY_WRITE_ONLY], DEFAULT_TYPE_FLAG_SYNTHETIC)
    expect(intermediate).toHaveProperty([JSON_SCHEMA_PROPERTY_PROPERTIES, 'hasNonDefault', defaultsFlag, JSON_SCHEMA_PROPERTY_READ_ONLY], DEFAULT_TYPE_FLAG_SYNTHETIC)
    expect(intermediate).toHaveProperty([JSON_SCHEMA_PROPERTY_PROPERTIES, 'hasNonDefault', defaultsFlag, JSON_SCHEMA_PROPERTY_DEPRECATED], DEFAULT_TYPE_FLAG_SYNTHETIC)

    expect(intermediate).toHaveProperty([JSON_SCHEMA_PROPERTY_PROPERTIES, 'hasDefault', defaultsFlag, JSON_SCHEMA_PROPERTY_MIN_LENGTH], DEFAULT_TYPE_FLAG_PURE)
    expect(intermediate).toHaveProperty([JSON_SCHEMA_PROPERTY_PROPERTIES, 'hasDefault', defaultsFlag, JSON_SCHEMA_PROPERTY_WRITE_ONLY], DEFAULT_TYPE_FLAG_SYNTHETIC)
    expect(intermediate).toHaveProperty([JSON_SCHEMA_PROPERTY_PROPERTIES, 'hasDefault', defaultsFlag, JSON_SCHEMA_PROPERTY_READ_ONLY], DEFAULT_TYPE_FLAG_SYNTHETIC)
    expect(intermediate).toHaveProperty([JSON_SCHEMA_PROPERTY_PROPERTIES, 'hasDefault', defaultsFlag, JSON_SCHEMA_PROPERTY_DEPRECATED], DEFAULT_TYPE_FLAG_SYNTHETIC)

    expect(intermediate).toHaveProperty([JSON_SCHEMA_PROPERTY_PROPERTIES, 'noDefault', defaultsFlag, JSON_SCHEMA_PROPERTY_MIN_LENGTH], DEFAULT_TYPE_FLAG_SYNTHETIC)
    expect(intermediate).toHaveProperty([JSON_SCHEMA_PROPERTY_PROPERTIES, 'noDefault', defaultsFlag, JSON_SCHEMA_PROPERTY_WRITE_ONLY], DEFAULT_TYPE_FLAG_SYNTHETIC)
    expect(intermediate).toHaveProperty([JSON_SCHEMA_PROPERTY_PROPERTIES, 'noDefault', defaultsFlag, JSON_SCHEMA_PROPERTY_READ_ONLY], DEFAULT_TYPE_FLAG_SYNTHETIC)
    expect(intermediate).toHaveProperty([JSON_SCHEMA_PROPERTY_PROPERTIES, 'noDefault', defaultsFlag, JSON_SCHEMA_PROPERTY_DEPRECATED], DEFAULT_TYPE_FLAG_SYNTHETIC)

    const result = deUnify(intermediate, options)

    expect(result).not.toHaveProperty([defaultsFlag])
    expect(result).not.toHaveProperty([JSON_SCHEMA_PROPERTY_PROPERTIES, 'hasNonDefault', defaultsFlag])
    expect(result).not.toHaveProperty([JSON_SCHEMA_PROPERTY_PROPERTIES, 'hasDefault', defaultsFlag])
    expect(result).not.toHaveProperty([JSON_SCHEMA_PROPERTY_PROPERTIES, 'noDefault', defaultsFlag])

    expect(result).toEqual({
      type: 'object',
      properties: {
        hasNonDefault: {
          type: 'string',
          minLength: 42,
        },
        hasDefault: {
          type: 'string',
        },
        noDefault: {
          type: 'string',
        },
      },
    })
  })
})