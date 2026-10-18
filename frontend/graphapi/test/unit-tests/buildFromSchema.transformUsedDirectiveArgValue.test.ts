import { Kind } from "graphql"
import { transformUsedDirectiveArgValue } from "../../src/build-graph-api/of-schema/definition-parts.transformer"

describe('transformUsedDirectiveArgValue', () => {
  it('string', () => {
    const actual = transformUsedDirectiveArgValue({ kind: Kind.STRING, value: 'hello world' })
    expect(actual).toBe('hello world')
  })

  it('enum value', () => {
    const actual = transformUsedDirectiveArgValue({ kind: Kind.ENUM, value: 'ORANGE' })
    expect(actual).toBe('ORANGE')
  })

  it('integer positive', () => {
    const actual = transformUsedDirectiveArgValue({ kind: Kind.INT, value: '777' })
    expect(actual).toBe(777)
  })

  it('integer zero', () => {
    const actual = transformUsedDirectiveArgValue({ kind: Kind.INT, value: '0' })
    expect(actual).toBe(0)
  })

  it('integer negative', () => {
    const actual = transformUsedDirectiveArgValue({ kind: Kind.INT, value: '-777' })
    expect(actual).toBe(-777)
  })

  it('float positive', () => {
    const actual = transformUsedDirectiveArgValue({ kind: Kind.FLOAT, value: '7.77' })
    expect(actual).toBe(7.77)
  })

  it('float zero', () => {
    const actual = transformUsedDirectiveArgValue({ kind: Kind.FLOAT, value: '0.00' })
    expect(actual).toBe(0)
  })

  it('float negative', () => {
    const actual = transformUsedDirectiveArgValue({ kind: Kind.FLOAT, value: '-7.77' })
    expect(actual).toBe(-7.77)
  })

  it('boolean true', () => {
    const actual = transformUsedDirectiveArgValue({ kind: Kind.BOOLEAN, value: true })
    expect(actual).toBe(true)
  })

  it('boolean false', () => {
    const actual = transformUsedDirectiveArgValue({ kind: Kind.BOOLEAN, value: false })
    expect(actual).toBe(false)
  })

  it('null', () => {
    const actual = transformUsedDirectiveArgValue({ kind: Kind.NULL })
    expect(actual).toBe(null)
  })

  it('list', () => {
    const actual = transformUsedDirectiveArgValue({
      kind: Kind.LIST,
      values: [
        { kind: Kind.STRING, value: 'hello' },
        { kind: Kind.INT, value: '123' },
        { kind: Kind.INT, value: '0' },
        { kind: Kind.INT, value: '-123' },
        { kind: Kind.FLOAT, value: '1.23' },
        { kind: Kind.FLOAT, value: '0.00' },
        { kind: Kind.FLOAT, value: '-1.23' },
        { kind: Kind.BOOLEAN, value: true },
        { kind: Kind.BOOLEAN, value: false },
        { kind: Kind.ENUM, value: 'ORANGE' },
        { kind: Kind.NULL },
      ]
    })
    expect(actual).toEqual(['hello', 123, 0, -123, 1.23, 0.00, -1.23, true, false, 'ORANGE', null])
  })

  it('object', () => {
    const actual = transformUsedDirectiveArgValue({
      kind: Kind.OBJECT,
      fields: [
        { 
          kind: Kind.OBJECT_FIELD,
          name: { kind: Kind.NAME, value: 'string' }, 
          value: { kind: Kind.STRING, value: 'hello' } 
        },
        { 
          kind: Kind.OBJECT_FIELD,
          name: { kind: Kind.NAME, value: 'intPos' }, 
          value: { kind: Kind.INT, value: '1234' } 
        },
        { 
          kind: Kind.OBJECT_FIELD,
          name: { kind: Kind.NAME, value: 'intZ' }, 
          value: { kind: Kind.INT, value: '0' } 
        },
        { 
          kind: Kind.OBJECT_FIELD,
          name: { kind: Kind.NAME, value: 'intNeg' }, 
          value: { kind: Kind.INT, value: '-1234' } 
        },
        { 
          kind: Kind.OBJECT_FIELD,
          name: { kind: Kind.NAME, value: 'floatPos' }, 
          value: { kind: Kind.FLOAT, value: '12.34' } 
        },
        { 
          kind: Kind.OBJECT_FIELD,
          name: { kind: Kind.NAME, value: 'floatZ' }, 
          value: { kind: Kind.FLOAT, value: '0.00' } 
        },
        { 
          kind: Kind.OBJECT_FIELD,
          name: { kind: Kind.NAME, value: 'floatNeg' }, 
          value: { kind: Kind.FLOAT, value: '-12.34' } 
        },
        { 
          kind: Kind.OBJECT_FIELD,
          name: { kind: Kind.NAME, value: 'booleanTrue' }, 
          value: { kind: Kind.BOOLEAN, value: true } 
        },
        { 
          kind: Kind.OBJECT_FIELD,
          name: { kind: Kind.NAME, value: 'booleanFalse' }, 
          value: { kind: Kind.BOOLEAN, value: false } 
        },
        { 
          kind: Kind.OBJECT_FIELD,
          name: { kind: Kind.NAME, value: 'enumValue' }, 
          value: { kind: Kind.ENUM, value: 'ORANGE' } 
        },
        { 
          kind: Kind.OBJECT_FIELD,
          name: { kind: Kind.NAME, value: 'null' }, 
          value: { kind: Kind.NULL } 
        },
      ]
    })
    expect(actual).toEqual({
      string: 'hello',
      intPos: 1234,
      intZ: 0,
      intNeg: -1234,
      floatPos: 12.34,
      floatZ: 0.00,
      floatNeg: -12.34,
      booleanTrue: true,
      booleanFalse: false,
      enumValue: 'ORANGE',
      null: null
    })
  })
})