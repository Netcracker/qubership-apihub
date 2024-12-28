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
  PREDICATE_UNCLOSED_END
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
})
