import { serialize, deserialize } from '../../src/serialize.utils'
import { parse } from 'flatted'

describe('Serialize/Deserialize Utils', () => {
  describe('serialize', () => {
    it('should serialize simple objects without symbols', () => {
      const obj = { a: 1, b: 'test', c: true }
      const symbolMapping = new Map<symbol, string>()
      
      const result = serialize(obj, symbolMapping)
      
      expect(typeof result).toBe('string')
      expect(parse(result)).toEqual(obj)
    })

    it('should serialize objects with symbol keys', () => {
      const sym1 = Symbol('test1')
      const sym2 = Symbol('test2')
      const obj = {
        regularKey: 'value',
        [sym1]: 'symbol1Value',
        [sym2]: 'symbol2Value'
      }
      
      const symbolMapping = new Map<symbol, string>([
        [sym1, 'stringKey1'],
        [sym2, 'stringKey2']
      ])
      
      const result = serialize(obj, symbolMapping)
      const parsed = parse(result)
      
      expect(parsed).toEqual({
        regularKey: 'value',
        stringKey1: 'symbol1Value',
        stringKey2: 'symbol2Value'
      })
    })

    it('should omit symbol keys not in mapping', () => {
      const sym1 = Symbol('mapped')
      const sym2 = Symbol('unmapped')
      const obj = {
        regular: 'value',
        [sym1]: 'mappedValue',
        [sym2]: 'unmappedValue'
      }
      
      const symbolMapping = new Map<symbol, string>([
        [sym1, 'mappedKey']
      ])
      
      const result = serialize(obj, symbolMapping)
      const parsed = parse(result)
      
      expect(parsed).toEqual({
        regular: 'value',
        mappedKey: 'mappedValue'
      })
      expect(parsed).not.toHaveProperty('unmappedValue')
    })

    it('should handle nested objects with symbols', () => {
      const sym = Symbol('nested')
      const obj = {
        level1: {
          level2: {
            [sym]: 'deepValue',
            regular: 'normalValue'
          }
        }
      }
      
      const symbolMapping = new Map<symbol, string>([
        [sym, 'deepSymbol']
      ])
      
      const result = serialize(obj, symbolMapping)
      const parsed = parse(result)
      
      expect(parsed).toEqual({
        level1: {
          level2: {
            deepSymbol: 'deepValue',
            regular: 'normalValue'
          }
        }
      })
    })

    it('should handle arrays with objects containing symbols', () => {
      const sym = Symbol('arrayItem')
      const obj = {
        items: [
          { [sym]: 'item1', id: 1 },
          { [sym]: 'item2', id: 2 },
          { regular: 'item3', id: 3 }
        ]
      }
      
      const symbolMapping = new Map<symbol, string>([
        [sym, 'symbolProp']
      ])
      
      const result = serialize(obj, symbolMapping)
      const parsed = parse(result)
      
      expect(parsed).toEqual({
        items: [
          { symbolProp: 'item1', id: 1 },
          { symbolProp: 'item2', id: 2 },
          { regular: 'item3', id: 3 }
        ]
      })
    })

    it('should handle circular references', () => {
      const sym = Symbol('circular')
      const obj: any = {
        name: 'root',
        [sym]: 'symbolValue'
      }
      obj.self = obj
      obj.nested = { parent: obj }
      
      const symbolMapping = new Map<symbol, string>([
        [sym, 'circularSymbol']
      ])
      
      const result = serialize(obj, symbolMapping)
      
      // Should not throw and should produce a valid string
      expect(typeof result).toBe('string')
      expect(result.length).toBeGreaterThan(0)
      
      // The result should be parseable by flatted
      const parsed = parse(result)
      expect(parsed).toBeDefined()
    })

    it('should handle complex circular references with symbols', () => {
      const sym1 = Symbol('node')
      const sym2 = Symbol('ref')
      
      const nodeA: any = { name: 'A', [sym1]: 'nodeA' }
      const nodeB: any = { name: 'B', [sym1]: 'nodeB' }
      const nodeC: any = { name: 'C', [sym1]: 'nodeC' }
      
      nodeA[sym2] = nodeB
      nodeB[sym2] = nodeC
      nodeC[sym2] = nodeA // Create cycle
      
      const root = { nodes: [nodeA, nodeB, nodeC] }
      
      const symbolMapping = new Map<symbol, string>([
        [sym1, 'nodeType'],
        [sym2, 'reference']
      ])
      
      const result = serialize(root, symbolMapping)
      
      expect(typeof result).toBe('string')
      expect(result.length).toBeGreaterThan(0)
    })

    it('should handle empty objects and arrays', () => {
      const obj = {
        empty: {},
        emptyArray: [],
        nested: { empty: {} }
      }
      
      const symbolMapping = new Map<symbol, string>()
      const result = serialize(obj, symbolMapping)
      const parsed = parse(result)
      
      expect(parsed).toEqual(obj)
    })

    it('should handle primitive values', () => {
      const primitives = [
        null,
        undefined,
        42,
        'string',
        true,
        false
      ]
      
      const symbolMapping = new Map<symbol, string>()
      
      for (const primitive of primitives) {
        const result = serialize(primitive, symbolMapping)
        expect(typeof result).toBe('string')
      }
    })
  })

  describe('deserialize', () => {
    it('should deserialize simple objects', () => {
      const original = { a: 1, b: 'test', c: true }
      const symbolMapping = new Map<symbol, string>()
      const serialized = serialize(original, symbolMapping)
      const stringMapping = new Map<string, symbol>()
      
      const result = deserialize(serialized, stringMapping)
      
      expect(result).toEqual(original)
    })

    it('should restore symbol keys from string keys', () => {
      const sym1 = Symbol('test1')
      const sym2 = Symbol('test2')
      const original = {
        regularKey: 'value',
        [sym1]: 'symbol1Value',
        [sym2]: 'symbol2Value'
      }
      
      const symbolToStringMapping = new Map<symbol, string>([
        [sym1, 'stringKey1'],
        [sym2, 'stringKey2']
      ])
      
      const serializedObj = serialize(original, symbolToStringMapping)
      
      const stringToSymbolMapping = new Map<string, symbol>([
        ['stringKey1', sym1],
        ['stringKey2', sym2]
      ])
      
      const result = deserialize(serializedObj, stringToSymbolMapping) as any
      
      expect(result.regularKey).toEqual('value')
      expect(result[sym1]).toEqual('symbol1Value')
      expect(result[sym2]).toEqual('symbol2Value')
      expect(result.stringKey1).toBeUndefined()
      expect(result.stringKey2).toBeUndefined()
    })

    it('should handle nested objects with symbol restoration', () => {
      const sym = Symbol('nested')
      const original = {
        level1: {
          level2: {
            [sym]: 'deepValue',
            regular: 'normalValue'
          }
        }
      }
      
      const symbolToStringMapping = new Map<symbol, string>([
        [sym, 'deepSymbol']
      ])
      
      const serializedObj = serialize(original, symbolToStringMapping)
      
      const stringToSymbolMapping = new Map<string, symbol>([
        ['deepSymbol', sym]
      ])
      
      const result = deserialize(serializedObj, stringToSymbolMapping) as any
      
      expect(result.level1.level2.regular).toEqual('normalValue')
      expect(result.level1.level2[sym]).toEqual('deepValue')
      expect(result.level1.level2.deepSymbol).toBeUndefined()
    })

    it('should handle arrays with symbol restoration', () => {
      const sym = Symbol('arrayItem')
      const original = {
        items: [
          { [sym]: 'item1', id: 1 },
          { [sym]: 'item2', id: 2 },
          { regular: 'item3', id: 3 }
        ]
      }
      
      const symbolToStringMapping = new Map<symbol, string>([
        [sym, 'symbolProp']
      ])
      
      const serializedObj = serialize(original, symbolToStringMapping)
      
      const stringToSymbolMapping = new Map<string, symbol>([
        ['symbolProp', sym]
      ])
      
      const result = deserialize(serializedObj, stringToSymbolMapping) as any
      
      expect(result.items[0][sym]).toEqual('item1')
      expect(result.items[0].id).toEqual(1)
      expect(result.items[1][sym]).toEqual('item2')
      expect(result.items[2].regular).toEqual('item3')
      expect(result.items[0].symbolProp).toBeUndefined()
    })

    it('should preserve keys not in mapping', () => {
      const sym = Symbol('mapped')
      const original = {
        [sym]: 'mappedValue',
        unmappedKey: 'unmappedValue',
        regular: 'regularValue'
      }
      
      const symbolToStringMapping = new Map<symbol, string>([
        [sym, 'mappedKey']
      ])
      
      const serializedObj = serialize(original, symbolToStringMapping)
      
      const stringToSymbolMapping = new Map<string, symbol>([
        ['mappedKey', sym]
      ])
      
      const result = deserialize(serializedObj, stringToSymbolMapping) as any
      
      expect(result[sym]).toEqual('mappedValue')
      expect(result.unmappedKey).toEqual('unmappedValue')
      expect(result.regular).toEqual('regularValue')
      expect(result.mappedKey).toBeUndefined()
    })
  })

  describe('serialize/deserialize roundtrip', () => {
    it('should maintain object integrity through roundtrip', () => {
      const sym1 = Symbol('key1')
      const sym2 = Symbol('key2')
      const original = {
        regular: 'value',
        number: 42,
        boolean: true,
        [sym1]: 'symbolValue1',
        [sym2]: { nested: 'nestedValue' },
        array: [1, 2, { [sym1]: 'arraySymbol' }]
      }
      
      const symbolToString = new Map<symbol, string>([
        [sym1, 'str1'],
        [sym2, 'str2']
      ])
      
      const stringToSymbol = new Map<string, symbol>([
        ['str1', sym1],
        ['str2', sym2]
      ])
      
      const serialized = serialize(original, symbolToString)
      const deserialized = deserialize(serialized, stringToSymbol) as any
      
      expect(deserialized.regular).toEqual(original.regular)
      expect(deserialized.number).toEqual(original.number)
      expect(deserialized.boolean).toEqual(original.boolean)
      expect(deserialized[sym1]).toEqual('symbolValue1')
      expect(deserialized[sym2]).toEqual({ nested: 'nestedValue' })
      expect(deserialized.array[2][sym1]).toEqual('arraySymbol')
    })

    it('should handle circular references in roundtrip', () => {
      const sym = Symbol('circular')
      const original: any = {
        name: 'root',
        [sym]: 'symbolValue'
      }
      original.self = original
      
      const symbolToString = new Map<symbol, string>([[sym, 'circularKey']])
      const stringToSymbol = new Map<string, symbol>([['circularKey', sym]])
      
      const serialized = serialize(original, symbolToString)
      const deserialized = deserialize(serialized, stringToSymbol) as any
      
      expect(deserialized.name).toEqual('root')
      expect(deserialized[sym]).toEqual('symbolValue')
      expect(deserialized.self).toBe(deserialized) // Circular reference preserved
    })

    it('should handle empty mappings', () => {
      const original = { a: 1, b: { c: 2 }, d: [3, 4] }
      const emptyMapping = new Map()
      
      const serialized = serialize(original, emptyMapping)
      const deserialized = deserialize(serialized, emptyMapping)
      
      expect(deserialized).toEqual(original)
    })

    it('should handle arrays with symbol properties', () => {
      const sym1 = Symbol('arrayProp1')
      const sym2 = Symbol('arrayProp2')
      const original = [1, 2, 3] as any
      original[sym1] = 'symbolValue1'
      original[sym2] = { nested: 'objectValue' }
      
      const symbolToString = new Map<symbol, string>([
        [sym1, 'str1'],
        [sym2, 'str2']
      ])
      
      const stringToSymbol = new Map<string, symbol>([
        ['str1', sym1],
        ['str2', sym2]
      ])
      
      const serialized = serialize(original, symbolToString)
      const deserialized = deserialize(serialized, stringToSymbol) as any
      
      // Check that it's still an array
      expect(Array.isArray(deserialized)).toEqual(true)
      expect(deserialized.length).toEqual(3)
      
      // Check array elements
      expect(deserialized[0]).toEqual(1)
      expect(deserialized[1]).toEqual(2)
      expect(deserialized[2]).toEqual(3)
      
      // Check symbol properties are restored
      expect(deserialized[sym1]).toEqual('symbolValue1')
      expect(deserialized[sym2]).toEqual({ nested: 'objectValue' })
      
      // Check that string keys are removed
      expect(deserialized.str1).toBeUndefined()
      expect(deserialized.str2).toBeUndefined()
    })

    it('should handle nested arrays with symbol properties', () => {
      const sym = Symbol('nestedArrayProp')
      const original = {
        data: [1, 2, 3] as any
      }
      original.data[sym] = 'nestedSymbolValue'
      
      const symbolToString = new Map<symbol, string>([[sym, 'nestedStr']])
      const stringToSymbol = new Map<string, symbol>([['nestedStr', sym]])
      
      const serialized = serialize(original, symbolToString)
      const deserialized = deserialize(serialized, stringToSymbol) as any
      
      expect(Array.isArray(deserialized.data)).toEqual(true)
      expect(deserialized.data.length).toEqual(3)
      expect(deserialized.data[0]).toEqual(1)
      expect(deserialized.data[sym]).toEqual('nestedSymbolValue')
      expect(deserialized.data.nestedStr).toBeUndefined()
    })
  })

  it('should keep undefined data', () => {
    const original = { data: undefined }

    const serialized = serialize(original, new Map())
    const deserialized = deserialize(serialized, new Map()) as any

    expect(deserialized).toHaveProperty(['data'], undefined)
  })


  it('should keep undefined array data', () => {
    const original = [1, 2, undefined, 4]

    const serialized = serialize(original, new Map())
    const deserialized = deserialize(serialized, new Map()) as any

    expect(deserialized).toHaveLength(4)
    expect(deserialized[2]).toEqual(undefined)
  })
}) 
