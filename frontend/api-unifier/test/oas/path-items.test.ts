import { normalize } from '../../src'
import pathItemsOas30 from '../resources/pathitems/pathItems-oas-30.json'
import pathItemsOas31 from '../resources/pathitems/pathItems-oas-31.json'

const OPTIONS = { resolveRef: true, validate: true }
describe('OAS 3.1 Path Item Object', () => {
  it('validation must pass for the Item Object in components', () => {
    const result = normalize(pathItemsOas31, OPTIONS) as any

    expect(result.components.pathItems.componentsPathItem).not.toEqual({})
  })

  it('could define Path Item Object via ref', () => {
    const result = normalize(pathItemsOas31, OPTIONS) as any

    expect(result.paths['/path1'].post).toBe(result.components.pathItems.componentsPathItem.post)
  })
})

describe('OAS 3.0 Path Item Object', () => {
  let baseSpec: any

  beforeEach(() => {
    baseSpec = JSON.parse(JSON.stringify(pathItemsOas30))
  })

  it('validation should discard pathItems section in components', () => {
    const result = normalize(baseSpec, OPTIONS) as any

    expect(result).not.toHaveProperty(['components', 'pathItems'])
  })

  it('validation must raise error for the pathItem section in components', () => {
    const errors: string[] = []
    const result = normalize(baseSpec, {...OPTIONS, onValidateError: message => errors.push(message) }) as any

    expect(errors).toMatchObject([
      expect.stringMatching(/Invalid/),
      expect.stringMatching(/match/),
    ])
  })

  it('could not resolve Path Item from components via reference object', () => {
    const result = normalize(baseSpec, OPTIONS) as any

    expect(result).toHaveProperty(['paths', '/path1'], {})
  })
})
