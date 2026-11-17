import { parseJavaExecutableSignature, parseJavaFieldSignature } from '../../src/shared/javaapi/member-signatures'

describe('parseJavaFieldSignature', () => {
  it('separates the field type and name', () => {
    expect(parseJavaFieldSignature('int count')).toEqual({ type: 'int', name: 'count' })
  })
})

// jdiff signatures use erased types, e.g. arrays and nested classes retain [] and $ without generic arguments
describe('parseJavaExecutableSignature', () => {
  it('preserves array and nested class types in a method with two parameters', () => {
    expect(parseJavaExecutableSignature('example.Mode$Entry[] entries(java.lang.String[], int)')).toEqual({
      returnType: 'example.Mode$Entry[]',
      name: 'entries',
      parameterTypes: ['java.lang.String[]', 'int'],
    })
  })

  it('returns an empty parameter list for a method without parameters', () => {
    expect(parseJavaExecutableSignature('void clear()')).toEqual({
      returnType: 'void',
      name: 'clear',
      parameterTypes: [],
    })
  })

  it('parses a constructor without a return type', () => {
    expect(parseJavaExecutableSignature('Mode(java.lang.String, int[])')).toEqual({
      returnType: undefined,
      name: 'Mode',
      parameterTypes: ['java.lang.String', 'int[]'],
    })
  })
})
