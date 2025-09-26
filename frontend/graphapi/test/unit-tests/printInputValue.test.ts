import { DirectiveLocation } from 'graphql'
import { printArgDefinition } from '../../src/print-graph-api/definition-parts.printer'

describe('printInputValue', () => {
  it('simple arg', () => {
    const actual = printArgDefinition('foo', {
      typeDef: { type: { kind: 'string' } },
    })
    const expected = 'foo: String'
    expect(actual).toBe(expected)
  })

  it('simple arg with default', () => {
    const actual = printArgDefinition('foo', {
      typeDef: { type: { kind: 'string' } },
      default: 'Test'
    })
    const expected = 'foo: String = "Test"'
    expect(actual).toBe(expected)
  })

  it('simple not string arg with default', () => {
    const actual = printArgDefinition('foo', {
      typeDef: { type: { kind: 'float' } },
      default: 12.34
    })
    const expected = 'foo: Float = 12.34'
    expect(actual).toBe(expected)
  })

  it('simple arg, not nullable', () => {
    const actual = printArgDefinition('foo', {
      typeDef: { type: { kind: 'string' } },
      nullable: false,
    })
    const expected = 'foo: String!'
    expect(actual).toBe(expected)
  })

  it('simple arg, not nullable, with default', () => {
    const actual = printArgDefinition('foo', {
      typeDef: { type: { kind: 'float' } },
      default: 12.34,
      nullable: false
    })
    const expected = 'foo: Float! = 12.34'
    expect(actual).toBe(expected)
  })

  it('arg with simple description', () => {
    const actual = printArgDefinition('foo', {
      typeDef: { type: { kind: 'string' } },
      description: 'Arg description'
    })
    const expected = '"""Arg description"""\nfoo: String'
    expect(actual).toBe(expected)
  })

  it('arg with multiline description', () => {
    const actual = printArgDefinition('foo', {
      typeDef: { type: { kind: 'string' } },
      description: (
        'MULTI\n\tLINE DESCRIPTION\n' +
        '\t\t\tFOR THE\n' +
        '           ARGUMENT!\n'
      )
    })
    const expected = (
      '"""\n' +
      'MULTI\n\tLINE DESCRIPTION\n' +
      '\t\t\tFOR THE\n' +
      '           ARGUMENT!\n' +
      '\n' +
      '"""\n' +
      'foo: String'
    )
    expect(actual).toBe(expected)
  })

  it('arg with directives', () => {
    const actual = printArgDefinition('foo', {
      typeDef: { type: { kind: 'string' } },
      directives: {
        foo: { definition: { title: 'foo', locations: [DirectiveLocation.ARGUMENT_DEFINITION] } },
        bar: { definition: { title: 'bar', locations: [DirectiveLocation.ARGUMENT_DEFINITION] } },
      }
    })
    const expected = 'foo: String @foo @bar'
    expect(actual).toBe(expected)
  })

  it('arg, not nullable, with directives', () => {
    const actual = printArgDefinition('foo', {
      typeDef: { type: { kind: 'string' } },
      nullable: false,
      directives: {
        foo: { definition: { title: 'foo', locations: [DirectiveLocation.ARGUMENT_DEFINITION] } },
        bar: { definition: { title: 'bar', locations: [DirectiveLocation.ARGUMENT_DEFINITION] } },
      }
    })
    const expected = 'foo: String! @foo @bar'
    expect(actual).toBe(expected)
  })

  it('arg, e2e', () => {
    const actual = printArgDefinition('foo', {
      typeDef: { type: { kind: 'string' } },
      nullable: false,
      description: 'Arg description',
      directives: {
        foo: { definition: { title: 'foo', locations: [DirectiveLocation.ARGUMENT_DEFINITION] } },
        bar: { definition: { title: 'bar', locations: [DirectiveLocation.ARGUMENT_DEFINITION] } },
      }
    })
    const expected = (
      '"""Arg description"""\n' +
      'foo: String! @foo @bar'
    )
    expect(actual).toBe(expected)
  })

  describe('default values for non-string types', () => {
    it('boolean default value true', () => {
      const actual = printArgDefinition('isEnabled', {
        typeDef: { type: { kind: 'boolean' } },
        default: true
      })
      const expected = 'isEnabled: Boolean = true'
      expect(actual).toBe(expected)
    })
    
    it('integer default value', () => {
      const actual = printArgDefinition('count', {
        typeDef: { type: { kind: 'integer' } },
        default: 42
      })
      const expected = 'count: Int = 42'
      expect(actual).toBe(expected)
    })

    it('float default value', () => {
      const actual = printArgDefinition('rate', {
        typeDef: { type: { kind: 'float' } },
        default: 3.14159
      })
      const expected = 'rate: Float = 3.14159'
      expect(actual).toBe(expected)
    })

    it('null default value', () => {
      const actual = printArgDefinition('optional', {
        typeDef: { type: { kind: 'string' } },
        default: null
      })
      const expected = 'optional: String = null'
      expect(actual).toBe(expected)
    })

    it('empty array default value', () => {
      const actual = printArgDefinition('metafields', {
        typeDef: { 
          type: {
            kind: 'list',
            items: { 
              typeDef: { $ref: '#/components/inputObjects/MetafieldInput' },
              nullable: false 
            }
          }
        } as any, // Using 'as any' for test simplicity since this matches the actual usage pattern
        default: []
      })
      const expected = 'metafields: [MetafieldInput!] = []'
      expect(actual).toBe(expected)
    })

    it('array with string values default', () => {
      const actual = printArgDefinition('tags', {
        typeDef: { 
          type: {
            kind: 'list',
            items: { 
              typeDef: { type: { kind: 'string' } },
              nullable: false 
            }
          }
        } as any, // Using 'as any' for test simplicity
        default: ['tag1', 'tag2', 'tag3']
      })
      const expected = 'tags: [String!] = ["tag1", "tag2", "tag3"]'
      expect(actual).toBe(expected)
    })

    it('array with number values default', () => {
      const actual = printArgDefinition('numbers', {
        typeDef: { 
          type: {
            kind: 'list',
            items: { 
              typeDef: { type: { kind: 'integer' } },
              nullable: false 
            }
          }
        } as any, // Using 'as any' for test simplicity
        default: [1, 2, 3]
      })
      const expected = 'numbers: [Int!] = [1, 2, 3]'
      expect(actual).toBe(expected)
    })        
  })
})