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
    const expected = '"Arg description"\nfoo: String'
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
      '"Arg description"\n' +
      'foo: String! @foo @bar'
    )
    expect(actual).toBe(expected)
  })
})