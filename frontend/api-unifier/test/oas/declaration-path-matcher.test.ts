import {
  grepValue,
  matchPaths,
  OPEN_API_PROPERTY_COMPONENTS,
  OPEN_API_PROPERTY_CONTENT,
  OPEN_API_PROPERTY_DESCRIPTION,
  OPEN_API_PROPERTY_EXAMPLE,
  OPEN_API_PROPERTY_HEADERS,
  OPEN_API_PROPERTY_PARAMETERS,
  OPEN_API_PROPERTY_PATHS,
  OPEN_API_PROPERTY_RESPONSES,
  PREDICATE_ANY_VALUE,
  PREDICATE_UNCLOSED_END,
  PREDICATE_NOT_OAS_EXTENSION,
  validateValuePredicate
} from '../../src'

describe('Declaration Path Matcher', () => {
  it('Not matched', () => {
    const matchResult = matchPaths(
      [
        [OPEN_API_PROPERTY_PATHS, PREDICATE_ANY_VALUE, OPEN_API_PROPERTY_PARAMETERS, 'two', OPEN_API_PROPERTY_DESCRIPTION],
        [OPEN_API_PROPERTY_COMPONENTS, OPEN_API_PROPERTY_PARAMETERS, 'one', OPEN_API_PROPERTY_DESCRIPTION],
      ],
      [
        [OPEN_API_PROPERTY_COMPONENTS, OPEN_API_PROPERTY_HEADERS, grepValue('parameterName'), OPEN_API_PROPERTY_DESCRIPTION]
      ]
    )
    expect(matchResult).toBe(undefined)
  })

  it('Matched', () => {
    const matchResult = matchPaths(
      [
        [OPEN_API_PROPERTY_PATHS, PREDICATE_ANY_VALUE, OPEN_API_PROPERTY_PARAMETERS, 'two', OPEN_API_PROPERTY_DESCRIPTION],
        [OPEN_API_PROPERTY_COMPONENTS, OPEN_API_PROPERTY_PARAMETERS, 'one', OPEN_API_PROPERTY_DESCRIPTION],
      ],
      [
        [OPEN_API_PROPERTY_COMPONENTS, OPEN_API_PROPERTY_PARAMETERS, grepValue('parameterName'), OPEN_API_PROPERTY_DESCRIPTION]
      ]
    )
    expect(matchResult).toHaveProperty('grepValues.parameterName', 'one')
  })

  it('Any value matched', () => {
    const matchResult = matchPaths(
      [
        [OPEN_API_PROPERTY_PATHS, PREDICATE_ANY_VALUE, OPEN_API_PROPERTY_HEADERS, 'two', OPEN_API_PROPERTY_CONTENT],
        [OPEN_API_PROPERTY_COMPONENTS, OPEN_API_PROPERTY_PARAMETERS, 'one', OPEN_API_PROPERTY_DESCRIPTION],
      ],
      [
        [PREDICATE_ANY_VALUE, OPEN_API_PROPERTY_PARAMETERS, PREDICATE_ANY_VALUE, grepValue('parameterName')]
      ]
    )
    expect(matchResult).toHaveProperty('grepValues.parameterName', 'description')
  })

  it('Many Property Matching', () => {
    const matchResult = matchPaths(
      [
        [OPEN_API_PROPERTY_PATHS, PREDICATE_ANY_VALUE, OPEN_API_PROPERTY_RESPONSES, '404', OPEN_API_PROPERTY_CONTENT, 'jsonType', OPEN_API_PROPERTY_EXAMPLE, 'param1'],
      ],
      [
        [OPEN_API_PROPERTY_PATHS, PREDICATE_ANY_VALUE, OPEN_API_PROPERTY_RESPONSES, PREDICATE_ANY_VALUE, PREDICATE_ANY_VALUE, grepValue('mediaType'), OPEN_API_PROPERTY_EXAMPLE, grepValue('example')],
        [OPEN_API_PROPERTY_PATHS, PREDICATE_ANY_VALUE, grepValue('scope')],
      ]
    )
    expect(matchResult).toHaveProperty('grepValues.scope', 'responses')
    expect(matchResult).toHaveProperty('grepValues.mediaType', 'jsonType')
    expect(matchResult).toHaveProperty('grepValues.example', 'param1')
  })

  it('True predicate after matching', () => {
    const suitablePredicate = [OPEN_API_PROPERTY_COMPONENTS, OPEN_API_PROPERTY_PARAMETERS, PREDICATE_ANY_VALUE, OPEN_API_PROPERTY_EXAMPLE, PREDICATE_UNCLOSED_END]
    const matchResult = matchPaths(
      [
        [OPEN_API_PROPERTY_COMPONENTS, OPEN_API_PROPERTY_PARAMETERS, PREDICATE_ANY_VALUE, OPEN_API_PROPERTY_EXAMPLE, PREDICATE_ANY_VALUE, PREDICATE_ANY_VALUE],
      ],
      [
        [OPEN_API_PROPERTY_PATHS, OPEN_API_PROPERTY_PARAMETERS, PREDICATE_ANY_VALUE, OPEN_API_PROPERTY_EXAMPLE, PREDICATE_ANY_VALUE, PREDICATE_ANY_VALUE],
        suitablePredicate,
        [OPEN_API_PROPERTY_COMPONENTS, OPEN_API_PROPERTY_PARAMETERS, PREDICATE_ANY_VALUE, OPEN_API_PROPERTY_EXAMPLE, PREDICATE_ANY_VALUE, PREDICATE_ANY_VALUE]
      ]
    )
    expect(matchResult).toHaveProperty('predicate', suitablePredicate)
  })

  it('ValidateValue predicate matches non-extension properties', () => {
    const matchResult = matchPaths(
      [
        [OPEN_API_PROPERTY_COMPONENTS, OPEN_API_PROPERTY_PARAMETERS, 'myParam', OPEN_API_PROPERTY_DESCRIPTION],
      ],
      [
        [OPEN_API_PROPERTY_COMPONENTS, OPEN_API_PROPERTY_PARAMETERS, PREDICATE_NOT_OAS_EXTENSION, OPEN_API_PROPERTY_DESCRIPTION]
      ]
    )
    expect(matchResult).toBeDefined()
    expect(matchResult?.path).toEqual([OPEN_API_PROPERTY_COMPONENTS, OPEN_API_PROPERTY_PARAMETERS, 'myParam', OPEN_API_PROPERTY_DESCRIPTION])
  })

  it('ValidateValue predicate filters out OAS extensions', () => {
    const matchResult = matchPaths(
      [
        [OPEN_API_PROPERTY_COMPONENTS, OPEN_API_PROPERTY_PARAMETERS, 'x-custom-extension', OPEN_API_PROPERTY_DESCRIPTION],
      ],
      [
        [OPEN_API_PROPERTY_COMPONENTS, OPEN_API_PROPERTY_PARAMETERS, PREDICATE_NOT_OAS_EXTENSION, OPEN_API_PROPERTY_DESCRIPTION]
      ]
    )
    expect(matchResult).toBeUndefined()
  })

  it('ValidateValue predicate combined with grepValue', () => {
    const matchResult = matchPaths(
      [
        [OPEN_API_PROPERTY_COMPONENTS, OPEN_API_PROPERTY_PARAMETERS, 'x-extension', OPEN_API_PROPERTY_DESCRIPTION],
        [OPEN_API_PROPERTY_COMPONENTS, OPEN_API_PROPERTY_PARAMETERS, 'normalParam', OPEN_API_PROPERTY_DESCRIPTION],
      ],
      [
        [OPEN_API_PROPERTY_COMPONENTS, OPEN_API_PROPERTY_PARAMETERS, PREDICATE_NOT_OAS_EXTENSION, grepValue('property')]
      ]
    )
    expect(matchResult).toBeDefined()
    expect(matchResult).toHaveProperty('grepValues.property', OPEN_API_PROPERTY_DESCRIPTION)
  })

  it('ValidateValue predicate with ANY_VALUE and UNCLOSED_END', () => {
    const pathWithoutOASExtension  = [OPEN_API_PROPERTY_PATHS, '/api/users', OPEN_API_PROPERTY_RESPONSES, '200', OPEN_API_PROPERTY_CONTENT, 'application/json', 'schema', 'properties', 'id'];
    const pathWithOASExtension = [OPEN_API_PROPERTY_PATHS, '/api/users', OPEN_API_PROPERTY_RESPONSES, '200', OPEN_API_PROPERTY_CONTENT, 'x-documentation-extension'];
    const matchResult = matchPaths(
      [
        pathWithOASExtension,
        pathWithoutOASExtension,
      ],
      [
        [PREDICATE_ANY_VALUE, PREDICATE_ANY_VALUE, OPEN_API_PROPERTY_RESPONSES, PREDICATE_ANY_VALUE, OPEN_API_PROPERTY_CONTENT, PREDICATE_NOT_OAS_EXTENSION, PREDICATE_UNCLOSED_END]
      ]
    )
    expect(matchResult).toBeDefined()
    expect(matchResult?.path).toEqual(pathWithoutOASExtension)
  })

  it('ValidateValue predicate rejects extension in complex path', () => {
    const matchResult = matchPaths(
      [
        [OPEN_API_PROPERTY_PATHS, '/api/users', OPEN_API_PROPERTY_RESPONSES, '200', OPEN_API_PROPERTY_CONTENT, 'x-custom-media', 'schema'],
      ],
      [
        [PREDICATE_ANY_VALUE, PREDICATE_ANY_VALUE, OPEN_API_PROPERTY_RESPONSES, PREDICATE_ANY_VALUE, OPEN_API_PROPERTY_CONTENT, PREDICATE_NOT_OAS_EXTENSION, PREDICATE_UNCLOSED_END]
      ]
    )
    expect(matchResult).toBeUndefined()
  })

  it('Custom ValidateValue predicate with numeric filter', () => {
    const numericCodePredicate = validateValuePredicate((value) => /^\d+$/.test(value.toString()))
    const matchResult = matchPaths(
      [
        [OPEN_API_PROPERTY_PATHS, '/api/users', OPEN_API_PROPERTY_RESPONSES, '200', OPEN_API_PROPERTY_CONTENT],
        [OPEN_API_PROPERTY_PATHS, '/api/users', OPEN_API_PROPERTY_RESPONSES, 'default', OPEN_API_PROPERTY_CONTENT],
      ],
      [
        [PREDICATE_ANY_VALUE, PREDICATE_ANY_VALUE, OPEN_API_PROPERTY_RESPONSES, numericCodePredicate, OPEN_API_PROPERTY_CONTENT]
      ]
    )
    expect(matchResult).toBeDefined()
    expect(matchResult?.path).toEqual([OPEN_API_PROPERTY_PATHS, '/api/users', OPEN_API_PROPERTY_RESPONSES, '200', OPEN_API_PROPERTY_CONTENT])
  })
})
