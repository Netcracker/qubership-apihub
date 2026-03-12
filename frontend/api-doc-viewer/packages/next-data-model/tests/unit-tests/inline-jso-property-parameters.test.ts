import { simplifyConsole } from "../helpers/simplify-console"
import { inlineJsoPropertyParameters } from "../../src/building-service/jso/json-crawl-entities/transformers/inline-jso-property-params"
import { JsoPropertyValueTypes } from "../../src/model/jso/types/node-value-type"

describe('Inline JSO property parameters', () => {
  simplifyConsole()
  
  describe('Key handling', () => {
    describe('undefined key', () => {
      it('should return empty string as title', () => {
        const result = inlineJsoPropertyParameters(undefined, 'test')
        expect(result.title).toBe('')
      })
    })

    describe('null key', () => {
      it('should return empty string as title', () => {
        const result = inlineJsoPropertyParameters(null, 'test')
        expect(result.title).toBe('')
      })
    })

    describe('symbol key', () => {
      it('should return symbol toString() as title', () => {
        const symbol = Symbol('testSymbol')
        const result = inlineJsoPropertyParameters(symbol, 'test')
        expect(result.title).toBe(symbol.toString())
      })
    })

    describe('string key', () => {
      it('should return string as title', () => {
        const result = inlineJsoPropertyParameters('myProperty', 'test')
        expect(result.title).toBe('myProperty')
      })

      it('should convert empty string key to string', () => {
        const result = inlineJsoPropertyParameters('', 'test')
        expect(result.title).toBe('')
      })
    })

    describe('number key', () => {
      it('should convert positive number key to string', () => {
        const result = inlineJsoPropertyParameters(5, 'test')
        expect(result.title).toBe('5')
      })

      it('should convert zero key to string', () => {
        const result = inlineJsoPropertyParameters(0, 'test')
        expect(result.title).toBe('0')
      })

      it('should convert negative number key to string', () => {
        const result = inlineJsoPropertyParameters(-3, 'test')
        expect(result.title).toBe('-3')
      })

      it('should convert float number key to string', () => {
        const result = inlineJsoPropertyParameters(3.14, 'test')
        expect(result.title).toBe('3.14')
      })
    })
  })

  describe('isArrayItem property', () => {
    it('should be true for positive number keys', () => {
      const result = inlineJsoPropertyParameters(1, 'test')
      expect(result.isArrayItem).toBe(true)
    })

    it('should be true for zero key', () => {
      const result = inlineJsoPropertyParameters(0, 'test')
      expect(result.isArrayItem).toBe(true)
    })

    it('should be false for string keys', () => {
      const result = inlineJsoPropertyParameters('0', 'test')
      expect(result.isArrayItem).toBe(false)
    })

    it('should be false for undefined key', () => {
      const result = inlineJsoPropertyParameters(undefined, 'test')
      expect(result.isArrayItem).toBe(false)
    })

    it('should be false for null key', () => {
      const result = inlineJsoPropertyParameters(null, 'test')
      expect(result.isArrayItem).toBe(false)
    })
  })

  describe('Value type detection', () => {
    describe('STRING value type', () => {
      it('should detect string value', () => {
        const result = inlineJsoPropertyParameters('key', 'stringValue')
        expect(result.valueType).toBe(JsoPropertyValueTypes.STRING)
        expect(result.value).toBe('stringValue')
        expect(result.isPrimitive).toBe(true)
        expect(result.isPredefinedValueSet).toBe(false)
      })

      it('should detect empty string value', () => {
        const result = inlineJsoPropertyParameters('key', '')
        expect(result.valueType).toBe(JsoPropertyValueTypes.STRING)
        expect(result.isPrimitive).toBe(true)
      })
    })

    describe('NUMBER value type', () => {
      it('should detect positive number value', () => {
        const result = inlineJsoPropertyParameters('key', 42)
        expect(result.valueType).toBe(JsoPropertyValueTypes.NUMBER)
        expect(result.value).toBe(42)
        expect(result.isPrimitive).toBe(true)
        expect(result.isPredefinedValueSet).toBe(false)
      })

      it('should detect zero value', () => {
        const result = inlineJsoPropertyParameters('key', 0)
        expect(result.value).toBe(0)
        expect(result.valueType).toBe(JsoPropertyValueTypes.NUMBER)
        expect(result.isPrimitive).toBe(true)
      })

      it('should detect negative number value', () => {
        const result = inlineJsoPropertyParameters('key', -10)
        expect(result.value).toBe(-10)
        expect(result.valueType).toBe(JsoPropertyValueTypes.NUMBER)
        expect(result.isPrimitive).toBe(true)
      })

      it('should detect float number value', () => {
        const result = inlineJsoPropertyParameters('key', 3.14159)
        expect(result.value).toBe(3.14159)
        expect(result.valueType).toBe(JsoPropertyValueTypes.NUMBER)
        expect(result.isPrimitive).toBe(true)
      })

      it('should detect NaN value', () => {
        const result = inlineJsoPropertyParameters('key', NaN)
        expect(result.value).toBe(NaN)
        expect(result.valueType).toBe(JsoPropertyValueTypes.NUMBER)
        expect(result.isPrimitive).toBe(true)
      })

      it('should detect Infinity value', () => {
        const result = inlineJsoPropertyParameters('key', Infinity)
        expect(result.value).toBe(Infinity)
        expect(result.valueType).toBe(JsoPropertyValueTypes.NUMBER)
        expect(result.isPrimitive).toBe(true)
      })
    })

    describe('BOOLEAN value type', () => {
      it('should detect true value', () => {
        const result = inlineJsoPropertyParameters('key', true)
        expect(result.value).toBe(true)
        expect(result.valueType).toBe(JsoPropertyValueTypes.BOOLEAN)
        expect(result.isPrimitive).toBe(true)
        expect(result.isPredefinedValueSet).toBe(true)
      })

      it('should detect false value', () => {
        const result = inlineJsoPropertyParameters('key', false)
        expect(result.value).toBe(false)
        expect(result.valueType).toBe(JsoPropertyValueTypes.BOOLEAN)
        expect(result.isPrimitive).toBe(true)
        expect(result.isPredefinedValueSet).toBe(true)
      })
    })

    describe('NULL/UNKNOWN value type', () => {
      it('should detect null value as UNKNOWN', () => {
        const result = inlineJsoPropertyParameters('key', null)
        expect(result.value).toBe(null)
        expect(result.valueType).toBe(JsoPropertyValueTypes.NULL)
        expect(result.isPrimitive).toBe(true)
        expect(result.isPredefinedValueSet).toBe(true)
      })

      it('should detect undefined value as UNKNOWN', () => {
        const result = inlineJsoPropertyParameters('key', undefined)
        expect(result.value).toBe(undefined)
        expect(result.valueType).toBe(JsoPropertyValueTypes.UNKNOWN)
        expect(result.isPrimitive).toBe(true)
      })
    })

    describe('ARRAY value type', () => {
      it('should detect array value', () => {
        const arrayValue = [1, 2, 3]
        const result = inlineJsoPropertyParameters('key', arrayValue)
        expect(result.value).toBe(arrayValue)
        expect(result.valueType).toBe(JsoPropertyValueTypes.ARRAY)
        expect(result.isPrimitive).toBe(false)
        expect(result.isPredefinedValueSet).toBe(false)
      })

      it('should detect empty array value', () => {
        const result = inlineJsoPropertyParameters('key', [])
        expect(result.value).toEqual([])
        expect(result.valueType).toBe(JsoPropertyValueTypes.ARRAY)
        expect(result.isPrimitive).toBe(false)
      })

      it('should detect nested array value', () => {
        const result = inlineJsoPropertyParameters('key', [[1, 2], [3, 4]])
        expect(result.value).toEqual([[1, 2], [3, 4]])
        expect(result.valueType).toBe(JsoPropertyValueTypes.ARRAY)
        expect(result.isPrimitive).toBe(false)
      })
    })

    describe('OBJECT value type', () => {
      it('should detect plain object value', () => {
        const objValue = { foo: 'bar' }
        const result = inlineJsoPropertyParameters('key', objValue)
        expect(result.value).toBe(objValue)
        expect(result.valueType).toBe(JsoPropertyValueTypes.OBJECT)
        expect(result.isPrimitive).toBe(false)
        expect(result.isPredefinedValueSet).toBe(false)
      })

      it('should detect empty object value', () => {
        const result = inlineJsoPropertyParameters('key', {})
        expect(result.value).toEqual({})
        expect(result.valueType).toBe(JsoPropertyValueTypes.OBJECT)
        expect(result.isPrimitive).toBe(false)
      })

      it('should detect nested object value', () => {
        const result = inlineJsoPropertyParameters('key', { nested: { deep: 'value' } })
        expect(result.value).toEqual({ nested: { deep: 'value' } })
        expect(result.valueType).toBe(JsoPropertyValueTypes.OBJECT)
        expect(result.isPrimitive).toBe(false)
      })
    })

    describe('JSON_SCHEMA value type', () => {
      it('should detect object with type property as JSON_SCHEMA', () => {
        const jsonSchema = {
          type: 'string',
          description: 'A string field'
        }
        const result = inlineJsoPropertyParameters('key', jsonSchema)
        expect(result.value).toBe(jsonSchema)
        expect(result.valueType).toBe(JsoPropertyValueTypes.JSON_SCHEMA)
        expect(result.isPrimitive).toBe(false)
        expect(result.isPredefinedValueSet).toBe(false)
      })

      it('should detect complex JSON schema with multiple properties', () => {
        const jsonSchema = {
          type: 'object',
          properties: { name: { type: 'string' } },
          required: ['name']
        }
        const result = inlineJsoPropertyParameters('key', jsonSchema)
        expect(result.value).toBe(jsonSchema)
        expect(result.valueType).toBe(JsoPropertyValueTypes.JSON_SCHEMA)
        expect(result.isPrimitive).toBe(false)
      })

      it('should detect JSON schema with type array', () => {
        const jsonSchema = {
          type: 'array',
          items: { type: 'string' }
        }
        const result = inlineJsoPropertyParameters('key', jsonSchema)
        expect(result.value).toBe(jsonSchema)
        expect(result.valueType).toBe(JsoPropertyValueTypes.JSON_SCHEMA)
        expect(result.isPrimitive).toBe(false)
      })
    })

    describe('MULTI_SCHEMA value type', () => {
      it('should detect multi-schema with schemaFormat and schema', () => {
        const multiSchema = {
          schemaFormat: 'application/vnd.aai.asyncapi;version=2.0.0',
          schema: { type: 'string' }
        }
        const result = inlineJsoPropertyParameters('key', multiSchema)
        expect(result.value).toBe(multiSchema)
        expect(result.valueType).toBe(JsoPropertyValueTypes.MULTI_SCHEMA)
        expect(result.isPrimitive).toBe(false)
        expect(result.isPredefinedValueSet).toBe(false)
      })

      it('should detect multi-schema with complex schema', () => {
        const multiSchema = {
          schemaFormat: 'application/vnd.oai.openapi;version=3.0.0',
          schema: { 
            type: 'object',
            properties: { id: { type: 'integer' } }
          }
        }
        const result = inlineJsoPropertyParameters('key', multiSchema)
        expect(result.value).toBe(multiSchema)
        expect(result.valueType).toBe(JsoPropertyValueTypes.MULTI_SCHEMA)
        expect(result.isPrimitive).toBe(false)
      })
    })
  })

  describe('isPredefinedValueSet property', () => {
    it('should be true for boolean true', () => {
      const result = inlineJsoPropertyParameters('key', true)
      expect(result.isPredefinedValueSet).toBe(true)
    })

    it('should be true for boolean false', () => {
      const result = inlineJsoPropertyParameters('key', false)
      expect(result.isPredefinedValueSet).toBe(true)
    })

    it('should be true for null (UNKNOWN type)', () => {
      const result = inlineJsoPropertyParameters('key', null)
      expect(result.isPredefinedValueSet).toBe(true)
    })

    it('should be false for string values', () => {
      const result = inlineJsoPropertyParameters('key', 'test')
      expect(result.isPredefinedValueSet).toBe(false)
    })

    it('should be false for number values', () => {
      const result = inlineJsoPropertyParameters('key', 42)
      expect(result.isPredefinedValueSet).toBe(false)
    })

    it('should be false for object values', () => {
      const result = inlineJsoPropertyParameters('key', {})
      expect(result.isPredefinedValueSet).toBe(false)
    })

    it('should be false for array values', () => {
      const result = inlineJsoPropertyParameters('key', [])
      expect(result.isPredefinedValueSet).toBe(false)
    })
  })

  describe('isPrimitive property', () => {
    it('should be true for string values', () => {
      const result = inlineJsoPropertyParameters('key', 'string')
      expect(result.isPrimitive).toBe(true)
    })

    it('should be true for number values', () => {
      const result = inlineJsoPropertyParameters('key', 123)
      expect(result.isPrimitive).toBe(true)
    })

    it('should be true for boolean values', () => {
      const result = inlineJsoPropertyParameters('key', true)
      expect(result.isPrimitive).toBe(true)
    })

    it('should be true for null values (UNKNOWN type)', () => {
      const result = inlineJsoPropertyParameters('key', null)
      expect(result.isPrimitive).toBe(true)
    })

    it('should be true for undefined values (UNKNOWN type)', () => {
      const result = inlineJsoPropertyParameters('key', undefined)
      expect(result.isPrimitive).toBe(true)
    })

    it('should be false for plain object values', () => {
      const result = inlineJsoPropertyParameters('key', { foo: 'bar' })
      expect(result.isPrimitive).toBe(false)
    })

    it('should be false for array values', () => {
      const result = inlineJsoPropertyParameters('key', [1, 2, 3])
      expect(result.isPrimitive).toBe(false)
    })

    it('should be false for JSON_SCHEMA values', () => {
      const result = inlineJsoPropertyParameters('key', { type: 'string' })
      expect(result.isPrimitive).toBe(false)
    })

    it('should be false for MULTI_SCHEMA values', () => {
      const result = inlineJsoPropertyParameters('key', {
        schemaFormat: 'test',
        schema: {}
      })
      expect(result.isPrimitive).toBe(false)
    })
  })

  describe('Complete result structure', () => {
    it('should return all properties with correct values for a primitive', () => {
      const result = inlineJsoPropertyParameters('testKey', 'testValue')
      
      expect(result).toEqual({
        title: 'testKey',
        value: 'testValue',
        valueType: JsoPropertyValueTypes.STRING,
        isPrimitive: true,
        isArrayItem: false,
        isPredefinedValueSet: false,
      })
    })

    it('should return all properties with correct values for an array item', () => {
      const arrayValue = { nested: 'object' }
      const result = inlineJsoPropertyParameters(0, arrayValue)
      
      expect(result).toEqual({
        title: '0',
        value: arrayValue,
        valueType: JsoPropertyValueTypes.OBJECT,
        isPrimitive: false,
        isArrayItem: true,
        isPredefinedValueSet: false,
      })
    })

    it('should return all properties with correct values for a boolean', () => {
      const result = inlineJsoPropertyParameters('isActive', true)
      
      expect(result).toEqual({
        title: 'isActive',
        value: true,
        valueType: JsoPropertyValueTypes.BOOLEAN,
        isPrimitive: true,
        isArrayItem: false,
        isPredefinedValueSet: true,
      })
    })

    it('should return all properties with correct values for a complex object', () => {
      const complexObj = { 
        nested: { 
          deep: 'value' 
        },
        array: [1, 2, 3]
      }
      const result = inlineJsoPropertyParameters('complexKey', complexObj)
      
      expect(result).toEqual({
        title: 'complexKey',
        value: complexObj,
        valueType: JsoPropertyValueTypes.OBJECT,
        isPrimitive: false,
        isArrayItem: false,
        isPredefinedValueSet: false,
      })
    })
  })

  describe('Edge cases', () => {
    it('should handle large numbers', () => {
      const largeNumber = Number.MAX_SAFE_INTEGER
      const result = inlineJsoPropertyParameters('key', largeNumber)
      expect(result.valueType).toBe(JsoPropertyValueTypes.NUMBER)
      expect(result.value).toBe(largeNumber)
    })

    it('should handle special string characters', () => {
      const specialString = '\\n\\t\\r\\\\'
      const result = inlineJsoPropertyParameters('key', specialString)
      expect(result.valueType).toBe(JsoPropertyValueTypes.STRING)
      expect(result.value).toBe(specialString)
    })

    it('should handle objects with null prototype', () => {
      const objWithNullProto = Object.create(null)
      objWithNullProto.foo = 'bar'
      const result = inlineJsoPropertyParameters('key', objWithNullProto)
      expect(result.valueType).toBe(JsoPropertyValueTypes.OBJECT)
      expect(result.isPrimitive).toBe(false)
    })

    it('should handle date objects as plain objects', () => {
      const dateValue = new Date()
      const result = inlineJsoPropertyParameters('key', dateValue)
      expect(result.valueType).toBe(JsoPropertyValueTypes.OBJECT)
      expect(result.isPrimitive).toBe(false)
    })

    it('should handle regex objects as plain objects', () => {
      const regexValue = /test/
      const result = inlineJsoPropertyParameters('key', regexValue)
      expect(result.valueType).toBe(JsoPropertyValueTypes.OBJECT)
      expect(result.isPrimitive).toBe(false)
    })
  })
})