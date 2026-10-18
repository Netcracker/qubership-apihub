import { DirectiveLocation } from 'graphql'
import { printUsedDirectives } from '../../src/print-graph-api/definition-parts.printer'

describe('printUsedDirectives', () => {
  it('no directives', () => {
    const actual = printUsedDirectives({})
    expect(actual).toBe('')
  })

  it('one directive', () => {
    const actual = printUsedDirectives({
      foo: {
        definition: {
          title: 'foo',
          locations: [DirectiveLocation.SCALAR],
        },
      }
    })
    expect(actual).toBe(' @foo')
  })

  it('one directive with provided 1 arg', () => {
    const actual = printUsedDirectives({
      foo: {
        definition: {
          title: 'foo',
          locations: [DirectiveLocation.SCALAR],
        },
        meta: {
          first: 'Test'
        }
      }
    })
    expect(actual).toBe(' @foo(first: "Test")')
  })

  it('one directive with provided N args', () => {
    const actual = printUsedDirectives({
      foo: {
        definition: {
          title: 'foo',
          locations: [DirectiveLocation.SCALAR],
        },
        meta: {
          first: 'Test',
          second: 123,
          third: false,
          fourth: null
        }
      }
    })
    expect(actual).toBe(' @foo(first: "Test", second: 123, third: false, fourth: null)')
  })

  it('two directives, one without args, another with provided 1 arg', () => {
    const actual = printUsedDirectives({
      foo: {
        definition: {
          title: 'foo',
          locations: [DirectiveLocation.OBJECT],
        }
      },
      bar: {
        definition: {
          title: 'bar',
          locations: [DirectiveLocation.SCALAR],
        },
        meta: {
          first: 'Test'
        }
      }
    })
    expect(actual).toBe(' @foo @bar(first: "Test")')
  })

  it('two directives, one without args, another with provided N args', () => {
    const actual = printUsedDirectives({
      foo: {
        definition: {
          title: 'foo',
          locations: [DirectiveLocation.OBJECT],
        }
      },
      bar: {
        definition: {
          title: 'bar',
          locations: [DirectiveLocation.SCALAR],
        },
        meta: {
          first: 'Test',
          second: 123,
          third: false,
          fourth: null
        }
      }
    })
    expect(actual).toBe(' @foo @bar(first: "Test", second: 123, third: false, fourth: null)')
  })

  it('two directives, both with provided 1 arg', () => {
    const actual = printUsedDirectives({
      foo: {
        definition: {
          title: 'foo',
          locations: [DirectiveLocation.OBJECT],
        },
        meta: {
          aaa: 'Test'
        }
      },
      bar: {
        definition: {
          title: 'bar',
          locations: [DirectiveLocation.SCALAR],
        },
        meta: {
          bbb: 123
        }
      }
    })
    expect(actual).toBe(' @foo(aaa: "Test") @bar(bbb: 123)')
  })

  it('two directives, both with provided N args', () => {
    const actual = printUsedDirectives({
      foo: {
        definition: {
          title: 'foo',
          locations: [DirectiveLocation.OBJECT],
        },
        meta: {
          aaa: 'Test',
          bbb: 1234
        }
      },
      bar: {
        definition: {
          title: 'bar',
          locations: [DirectiveLocation.SCALAR],
        },
        meta: {
          aaa: false,
          bbb: null
        }
      }
    })
    expect(actual).toBe(' @foo(aaa: "Test", bbb: 1234) @bar(aaa: false, bbb: null)')
  })
})