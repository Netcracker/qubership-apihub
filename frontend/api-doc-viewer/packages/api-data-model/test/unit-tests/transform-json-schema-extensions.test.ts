import { transformJsonSchemaExtensions } from "../../src/json-schema/transformers"
import { simplifyConsole } from "../helpers/simplify-console"

describe('Transform JSON schema extensions', () => {
  simplifyConsole()

  describe('Non-object values', () => {
    it('should return non-object values as-is', () => {
      const numberValue = 42
      const stringValue = 'value'
      const nullValue = null

      expect(transformJsonSchemaExtensions(numberValue)).toBe(numberValue)
      expect(transformJsonSchemaExtensions(stringValue)).toBe(stringValue)
      expect(transformJsonSchemaExtensions(nullValue)).toBe(nullValue)
    })

    it('should return arrays as-is', () => {
      const arrayValue = [1, 2, 3]

      expect(transformJsonSchemaExtensions(arrayValue)).toBe(arrayValue)
    })
  })

  describe('Objects without extension keys', () => {
    it('should return object as-is when there are no x- keys', () => {
      const value = { a: 1, nested: { ok: true } }

      expect(transformJsonSchemaExtensions(value)).toBe(value)
    })
  })

  describe('Objects with extension keys', () => {
    it('should aggregate x- keys under extensions and remove them', () => {
      const value = { 'x-a': 1, 'x-b': { nested: true }, keep: 'ok' }

      expect(transformJsonSchemaExtensions(value)).toEqual({
        keep: 'ok',
        extensions: [
          { 'x-a': 1 },
          { 'x-b': { nested: true } }
        ],
      })
      expect(value).toEqual({ 'x-a': 1, 'x-b': { nested: true }, keep: 'ok' })
    })

    it('should create extensions object when only x- keys exist', () => {
      const value = { 'x-a': 1, 'x-b': 2 }

      expect(transformJsonSchemaExtensions(value)).toEqual({
        extensions: [
          { 'x-a': 1 },
          { 'x-b': 2 }
        ],
      })
    })

    it('should keep properties with symbolic keys as-is', () => {
      const symbolA = Symbol('a')
      const symbolB = Symbol('b')
      const value = { 'x-a': 777, 'x-b': "hello world", [symbolA]: 1, [symbolB]: 2 }

      expect(transformJsonSchemaExtensions(value)).toEqual({
        [symbolA]: 1,
        [symbolB]: 2,
        extensions: [
          { 'x-a': 777 },
          { 'x-b': "hello world" }
        ],
      })
    })
  })
})