import { GRAPH_API_NODE_KIND_SCALAR, GRAPH_API_SCALAR_NODE_KINDS, GRAPH_API_KIND_TO_GRAPH_QL_TYPE } from "../../src/constants"
import { printOriginalType } from "../../src/print-graph-api/atomics.printer"

describe('printOriginalType', () => {
  it('no schema provided', () => {
    const actual = printOriginalType()
    expect(actual).toBe('')
  })

  it('no schema provided, nullable = true', () => {
    const actual = printOriginalType(undefined, true)
    expect(actual).toBe('')
  })

  it('no schema provided, nullable = false', () => {
    const actual = printOriginalType(undefined, false)
    expect(actual).toBe('')
  })

  it('$ref, nullable = undefined', () => {
    const actual = printOriginalType({ $ref: '#/path/to/MyType' })
    expect(actual).toBe('MyType')
  })

  it('$ref, nullable = true', () => {
    const actual = printOriginalType({ $ref: '#/path/to/MyType' }, true)
    expect(actual).toBe('MyType')
  })

  it('$ref, nullable = false', () => {
    const actual = printOriginalType({ $ref: '#/path/to/MyType' }, false)
    expect(actual).toBe('MyType!')
  })

  it(`built in scalar, nullable = undefined`, () => {
    GRAPH_API_SCALAR_NODE_KINDS.forEach(kind => {
      if (kind === GRAPH_API_NODE_KIND_SCALAR) { return }
      const actual = printOriginalType({ type: { kind } })
      expect(actual).toBe(GRAPH_API_KIND_TO_GRAPH_QL_TYPE[kind])
    })
  })

  it(`built-in scalar, nullable = true`, () => {
    GRAPH_API_SCALAR_NODE_KINDS.forEach(kind => {
      if (kind === GRAPH_API_NODE_KIND_SCALAR) { return }
      const actual = printOriginalType({ type: { kind } }, true)
      expect(actual).toBe(GRAPH_API_KIND_TO_GRAPH_QL_TYPE[kind])
    })
  })

  it(`built-in scalar nullable = false`, () => {
    GRAPH_API_SCALAR_NODE_KINDS.forEach(kind => {
      if (kind === GRAPH_API_NODE_KIND_SCALAR) { return }
      const actual = printOriginalType({ type: { kind } }, false)
      expect(actual).toBe(GRAPH_API_KIND_TO_GRAPH_QL_TYPE[kind] + '!')
    })
  })

  it(`custom scalar, nullable = undefined`, () => {
    const actual = printOriginalType({ title: 'MyScalar', type: { kind: 'scalar' } })
    expect(actual).toBe('MyScalar')
  })

  it(`custom scalar, nullable = true`, () => {
    const actual = printOriginalType({ title: 'MyScalar', type: { kind: 'scalar' } }, true)
    expect(actual).toBe('MyScalar')
  })

  it(`custom scalar, nullable = false`, () => {
    const actual = printOriginalType({ title: 'MyScalar', type: { kind: 'scalar' } }, false)
    expect(actual).toBe('MyScalar!')
  })

  it('enum, nullable = undefined', () => {
    const actual = printOriginalType({
      title: 'MyEnum',
      type: { kind: 'enum', values: {} }
    })
    expect(actual).toBe('MyEnum')
  })

  it('enum, nullable = true', () => {
    const actual = printOriginalType({
      title: 'MyEnum',
      type: { kind: 'enum', values: {} }
    }, true)
    expect(actual).toBe('MyEnum')
  })

  it('enum, nullable = false', () => {
    const actual = printOriginalType({
      title: 'MyEnum',
      type: { kind: 'enum', values: {} }
    }, false)
    expect(actual).toBe('MyEnum!')
  })

  it('union, nullable = undefined', () => {
    const actual = printOriginalType({
      title: 'MyUnion',
      type: { kind: 'union', oneOf: [] }
    })
    expect(actual).toBe('MyUnion')
  })

  it('union, nullable = true', () => {
    const actual = printOriginalType({
      title: 'MyUnion',
      type: { kind: 'union', oneOf: [] }
    }, true)
    expect(actual).toBe('MyUnion')
  })

  it('union, nullable = false', () => {
    const actual = printOriginalType({
      title: 'MyUnion',
      type: { kind: 'union', oneOf: [] }
    }, false)
    expect(actual).toBe('MyUnion!')
  })

  it('object, nullable = undefined', () => {
    const actual = printOriginalType({
      title: 'MyObject',
      type: { kind: 'object', methods: {} }
    })
    expect(actual).toBe('MyObject')
  })

  it('object, nullable = true', () => {
    const actual = printOriginalType({
      title: 'MyObject',
      type: { kind: 'object', methods: {} }
    }, true)
    expect(actual).toBe('MyObject')
  })

  it('object, nullable = false', () => {
    const actual = printOriginalType({
      title: 'MyObject',
      type: { kind: 'object', methods: {} }
    }, false)
    expect(actual).toBe('MyObject!')
  })

  it('interface, nullable = undefined', () => {
    const actual = printOriginalType({
      title: 'IMyObject',
      type: { kind: 'interface', methods: {} }
    })
    expect(actual).toBe('IMyObject')
  })

  it('interface, nullable = true', () => {
    const actual = printOriginalType({
      title: 'IMyObject',
      type: { kind: 'interface', methods: {} }
    }, true)
    expect(actual).toBe('IMyObject')
  })

  it('interface, nullable = false', () => {
    const actual = printOriginalType({
      title: 'IMyObject',
      type: { kind: 'interface', methods: {} }
    }, false)
    expect(actual).toBe('IMyObject!')
  })

  it('input object, nullable = undefined', () => {
    const actual = printOriginalType({
      title: 'MyInput',
      type: { kind: 'input', properties: {} }
    })
    expect(actual).toBe('MyInput')
  })

  it('input object, nullable = true', () => {
    const actual = printOriginalType({
      title: 'MyInput',
      type: { kind: 'input', properties: {} }
    }, true)
    expect(actual).toBe('MyInput')
  })

  it('input object, nullable = false', () => {
    const actual = printOriginalType({
      title: 'MyInput',
      type: { kind: 'input', properties: {} }
    }, false)
    expect(actual).toBe('MyInput!')
  })

  it('list of built-in scalars, both nullable', () => {
    GRAPH_API_SCALAR_NODE_KINDS.forEach(kind => {
      if (kind === GRAPH_API_NODE_KIND_SCALAR) { return }
      const actual = printOriginalType({
        type: {
          kind: 'list',
          items: {
            typeDef: {
              type: { kind: kind }
            }
          }
        }
      })
      expect(actual).toBe(`[${GRAPH_API_KIND_TO_GRAPH_QL_TYPE[kind]}]`)
    })
  })

  it('list of built-in scalars, scalar not nullable, list nullable', () => {
    GRAPH_API_SCALAR_NODE_KINDS.forEach(kind => {
      if (kind === GRAPH_API_NODE_KIND_SCALAR) { return }
      const actual = printOriginalType({
        type: {
          kind: 'list',
          items: {
            typeDef: {
              type: { kind: kind }
            },
            nullable: false,
          }
        }
      })
      expect(actual).toBe(`[${GRAPH_API_KIND_TO_GRAPH_QL_TYPE[kind]}!]`)
    })
  })

  it('list of built-in scalars, scalar nullable, list not nullable', () => {
    GRAPH_API_SCALAR_NODE_KINDS.forEach(kind => {
      if (kind === GRAPH_API_NODE_KIND_SCALAR) { return }
      const actual = printOriginalType({
        type: {
          kind: 'list',
          items: {
            typeDef: {
              type: { kind: kind }
            },
          }
        }
      }, false)
      expect(actual).toBe(`[${GRAPH_API_KIND_TO_GRAPH_QL_TYPE[kind]}]!`)
    })
  })

  it('list of built-in scalars, both NOT nullable', () => {
    GRAPH_API_SCALAR_NODE_KINDS.forEach(kind => {
      if (kind === GRAPH_API_NODE_KIND_SCALAR) { return }
      const actual = printOriginalType({
        type: {
          kind: 'list',
          items: {
            typeDef: {
              type: { kind: kind }
            },
            nullable: false,
          }
        }
      }, false)
      expect(actual).toBe(`[${GRAPH_API_KIND_TO_GRAPH_QL_TYPE[kind]}!]!`)
    })
  })

  it('list of custom scalars, both nullable', () => {
    const actual = printOriginalType({
      type: {
        kind: 'list',
        items: {
          typeDef: {
            title: 'MyScalar',
            type: { kind: 'scalar' }
          }
        }
      }
    })
    expect(actual).toBe(`[MyScalar]`)
  })

  it('list of custom scalars, scalar not nullable, list nullable', () => {
    const actual = printOriginalType({
      type: {
        kind: 'list',
        items: {
          typeDef: {
            title: 'MyScalar',
            type: { kind: 'scalar' }
          },
          nullable: false,
        }
      }
    })
    expect(actual).toBe(`[MyScalar!]`)
  })

  it('list of custom scalars, scalar nullable, list not nullable', () => {
    const actual = printOriginalType({
      type: {
        kind: 'list',
        items: {
          typeDef: {
            title: 'MyScalar',
            type: { kind: 'scalar' }
          }
        }
      }
    }, false)
    expect(actual).toBe(`[MyScalar]!`)
  })

  it('list of custom scalars, both NOT nullable', () => {
    const actual = printOriginalType({
      type: {
        kind: 'list',
        items: {
          typeDef: {
            title: 'MyScalar',
            type: { kind: 'scalar' }
          },
          nullable: false,
        }
      }
    }, false)
    expect(actual).toBe(`[MyScalar!]!`)
  })

  it('list of enums, both nullable', () => {
    const actual = printOriginalType({
      type: {
        kind: 'list',
        items: {
          typeDef: {
            title: 'MyEnum',
            type: { kind: 'enum', values: {} }
          }
        }
      }
    })
    expect(actual).toBe(`[MyEnum]`)
  })

  it('list of enums, enum nullable, list not nullable', () => {
    const actual = printOriginalType({
      type: {
        kind: 'list',
        items: {
          typeDef: {
            title: 'MyEnum',
            type: { kind: 'enum', values: {} }
          },
        }
      }
    }, false)
    expect(actual).toBe(`[MyEnum]!`)
  })

  it('list of enums, enum not nullable, list nullable', () => {
    const actual = printOriginalType({
      type: {
        kind: 'list',
        items: {
          typeDef: {
            title: 'MyEnum',
            type: { kind: 'enum', values: {} }
          },
          nullable: false,
        }
      }
    })
    expect(actual).toBe(`[MyEnum!]`)
  })

  it('list of enums, both not nullable', () => {
    const actual = printOriginalType({
      type: {
        kind: 'list',
        items: {
          typeDef: {
            title: 'MyEnum',
            type: { kind: 'enum', values: {} }
          },
          nullable: false,
        }
      }
    }, false)
    expect(actual).toBe(`[MyEnum!]!`)
  })

  it('list of object, both nullable', () => {
    const actual = printOriginalType({
      type: {
        kind: 'list',
        items: {
          typeDef: {
            title: 'MyObject',
            type: { kind: 'object', methods: {} }
          }
        }
      }
    })
    expect(actual).toBe(`[MyObject]`)
  })

  it('list of object, object not nullable, list nullable', () => {
    const actual = printOriginalType({
      type: {
        kind: 'list',
        items: {
          typeDef: {
            title: 'MyObject',
            type: { kind: 'object', methods: {} }
          },
          nullable: false,
        }
      }
    })
    expect(actual).toBe(`[MyObject!]`)
  })

  it('list of object, object nullable, list not nullable', () => {
    const actual = printOriginalType({
      type: {
        kind: 'list',
        items: {
          typeDef: {
            title: 'MyObject',
            type: { kind: 'object', methods: {} }
          },
        }
      }
    }, false)
    expect(actual).toBe(`[MyObject]!`)
  })

  it('list of object, both not nullable', () => {
    const actual = printOriginalType({
      type: {
        kind: 'list',
        items: {
          typeDef: {
            title: 'MyObject',
            type: { kind: 'object', methods: {} }
          },
          nullable: false,
        }
      }
    }, false)
    expect(actual).toBe(`[MyObject!]!`)
  })

  it('list of interface, both nullable', () => {
    const actual = printOriginalType({
      type: {
        kind: 'list',
        items: {
          typeDef: {
            title: 'IMyObject',
            type: { kind: 'interface', methods: {} }
          }
        }
      }
    })
    expect(actual).toBe(`[IMyObject]`)
  })

  it('list of interface, object not nullable, list nullable', () => {
    const actual = printOriginalType({
      type: {
        kind: 'list',
        items: {
          typeDef: {
            title: 'IMyObject',
            type: { kind: 'interface', methods: {} }
          },
          nullable: false,
        }
      }
    })
    expect(actual).toBe(`[IMyObject!]`)
  })

  it('list of interface, object nullable, list not nullable', () => {
    const actual = printOriginalType({
      type: {
        kind: 'list',
        items: {
          typeDef: {
            title: 'IMyObject',
            type: { kind: 'interface', methods: {} }
          },
        }
      }
    }, false)
    expect(actual).toBe(`[IMyObject]!`)
  })

  it('list of interface, both not nullable', () => {
    const actual = printOriginalType({
      type: {
        kind: 'list',
        items: {
          typeDef: {
            title: 'IMyObject',
            type: { kind: 'interface', methods: {} }
          },
          nullable: false,
        }
      }
    }, false)
    expect(actual).toBe(`[IMyObject!]!`)
  })

  it('list of input object, both nullable', () => {
    const actual = printOriginalType({
      type: {
        kind: 'list',
        items: {
          typeDef: {
            title: 'MyInput',
            type: { kind: 'input', properties: {} }
          }
        }
      }
    })
    expect(actual).toBe(`[MyInput]`)
  })

  it('list of input object, object not nullable, list nullable', () => {
    const actual = printOriginalType({
      type: {
        kind: 'list',
        items: {
          typeDef: {
            title: 'MyInput',
            type: { kind: 'input', properties: {} }
          },
          nullable: false,
        }
      }
    })
    expect(actual).toBe(`[MyInput!]`)
  })

  it('list of input object, object nullable, list not nullable', () => {
    const actual = printOriginalType({
      type: {
        kind: 'list',
        items: {
          typeDef: {
            title: 'MyInput',
            type: { kind: 'input', properties: {} }
          },
        }
      }
    }, false)
    expect(actual).toBe(`[MyInput]!`)
  })

  it('list of input object, both not nullable', () => {
    const actual = printOriginalType({
      type: {
        kind: 'list',
        items: {
          typeDef: {
            title: 'MyInput',
            type: { kind: 'input', properties: {} }
          },
          nullable: false,
        }
      }
    }, false)
    expect(actual).toBe(`[MyInput!]!`)
  })

  it('list of unions, both nullable', () => {
    const actual = printOriginalType({
      type: {
        kind: 'list',
        items: {
          typeDef: {
            title: 'MyUnion',
            type: { kind: 'union', oneOf: [] }
          },
        }
      }
    })
    expect(actual).toBe(`[MyUnion]`)
  })

  it('list of unions, union not nullable, list nullable', () => {
    const actual = printOriginalType({
      type: {
        kind: 'list',
        items: {
          typeDef: {
            title: 'MyUnion',
            type: { kind: 'union', oneOf: [] }
          },
          nullable: false,
        }
      }
    })
    expect(actual).toBe(`[MyUnion!]`)
  })

  it('list of unions, union nullable, list not nullable', () => {
    const actual = printOriginalType({
      type: {
        kind: 'list',
        items: {
          typeDef: {
            title: 'MyUnion',
            type: { kind: 'union', oneOf: [] }
          },
        }
      }
    }, false)
    expect(actual).toBe(`[MyUnion]!`)
  })

  it('list of unions, both not nullable', () => {
    const actual = printOriginalType({
      type: {
        kind: 'list',
        items: {
          typeDef: {
            title: 'MyUnion',
            type: { kind: 'union', oneOf: [] }
          },
          nullable: false,
        }
      }
    }, false)
    expect(actual).toBe(`[MyUnion!]!`)
  })
})