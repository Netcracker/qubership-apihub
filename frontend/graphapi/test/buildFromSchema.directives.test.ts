import { GRAPH_API_VERSION } from "../src/constants"
import { buildGraphApi, graphapi } from "./helpers/build-graphApi"
import { DEFAULT_DIRECTIVES } from './resources/default-directives'

describe('Directives', () => {
  it('must apply directives on schema', () => {
    const graphApi = graphapi`
      directive @foo on SCHEMA
      schema @foo {
        query: MyQuery 
      }
      type MyQuery {
        test: String
      }
    `
    const expectedDirectiveFoo = { title: 'foo', locations: ['SCHEMA'] }
    expect(graphApi).toMatchObject({
      directives: {
        foo: { definition: { $ref: '#/components/directives/foo' } }
      }
    })
    expect(graphApi.components).toMatchObject({
      directives: { foo: expectedDirectiveFoo }
    })
  })

  it('must apply directives on scalar', () => {
    const graphApi = graphapi`
      directive @foo on SCALAR
      scalar MyScalar @foo
    `
    const expectedDirectiveFoo = { title: 'foo', locations: ['SCALAR'] }
    expect(graphApi.components).toMatchObject({
      directives: { foo: expectedDirectiveFoo },
      scalars: {
        MyScalar: {
          directives: {
            foo: { definition: { $ref: '#/components/directives/foo' } }
          }
        }
      }
    })
  })

  it('must apply directives on enum', () => {
    const graphApi = graphapi`
      directive @foo on ENUM
      enum Fruit @foo {
        Orange
        Apple
      }
    `
    const expectedDirectiveFoo = { title: 'foo', locations: ['ENUM'] }
    expect(graphApi.components).toMatchObject({
      directives: { foo: expectedDirectiveFoo },
      enums: {
        Fruit: {
          directives: {
            foo: { definition: { $ref: '#/components/directives/foo' } }
          }
        }
      }
    })
  })

  it('must apply directives on object', () => {
    const graphApi = graphapi`
      directive @foo on OBJECT
      type Fruit @foo {
        flavour: String
        shape: String
      }
    `
    const expectedDirectiveFoo = { title: 'foo', locations: ['OBJECT'] }
    expect(graphApi.components).toMatchObject({
      directives: { foo: expectedDirectiveFoo },
      objects: {
        Fruit: {
          directives: {
            foo: { definition: { $ref: '#/components/directives/foo' } }
          }
        }
      }
    })
  })

  it('must apply directives on interface', () => {
    const graphApi = graphapi`
      directive @foo on INTERFACE
      interface Fruit @foo {
        flavour: String
        shape: String
      }
    `
    const expectedDirectiveFoo = { title: 'foo', locations: ['INTERFACE'] }
    expect(graphApi.components).toMatchObject({
      directives: { foo: expectedDirectiveFoo },
      interfaces: {
        Fruit: {
          directives: {
            foo: { definition: { $ref: '#/components/directives/foo' } }
          }
        }
      }
    })
  })

  it('must apply directives on input objects', () => {
    const graphApi = graphapi`
      directive @foo on INPUT_OBJECT
      input Fruit @foo {
        flavour: String
        shape: String
      }
    `
    const expectedDirectiveFoo = { title: 'foo', locations: ['INPUT_OBJECT'] }
    expect(graphApi.components).toMatchObject({
      directives: { foo: expectedDirectiveFoo },
      inputObjects: {
        Fruit: {
          directives: {
            foo: { definition: { $ref: '#/components/directives/foo' } }
          }
        }
      }
    })
  })

  it('must apply directives on union', () => {
    const graphApi = graphapi`
      directive @foo on UNION
      union Fruit @foo = Orange | Banana
      scalar Orange
      scalar Banana
    `
    const expectedDirectiveFoo = { title: 'foo', locations: ['UNION'] }
    expect(graphApi.components).toMatchObject({
      directives: { foo: expectedDirectiveFoo },
      unions: {
        Fruit: {
          directives: {
            foo: { definition: { $ref: '#/components/directives/foo' } }
          }
        }
      }
    })
  })

  it('must apply directives on enum value', () => {
    const graphApi = graphapi`
      directive @foo on ENUM_VALUE

      enum Fruit {
        Apple
        Orange
        Tomato @foo
      }
    `
    const expectedDirectiveFoo = {
      title: 'foo',
      locations: ['ENUM_VALUE']
    }
    expect(graphApi).toMatchObject({
      components: {
        directives: { foo: expectedDirectiveFoo },
        enums: {
          Fruit: {
            type: {
              kind: 'enum',
              values: {
                Tomato: {
                  directives: {
                    foo: { definition: { $ref: '#/components/directives/foo' } }
                  }
                },
              }
            }
          }
        }
      }
    })
  })

  it('must apply directives on field definition (objects)', () => {
    const graphApi = graphapi`
      directive @foo on FIELD_DEFINITION

      type Fruit {
        flavour: String!
        shape: String @foo
      }
    `
    const expectedDirectiveFoo = {
      title: 'foo',
      locations: ['FIELD_DEFINITION']
    }
    expect(graphApi).toMatchObject({
      components: {
        directives: { foo: expectedDirectiveFoo },
        objects: {
          Fruit: {
            type: {
              kind: 'object',
              methods: {
                shape: {
                  directives: {
                    foo: { definition: { $ref: '#/components/directives/foo' } }
                  }
                }
              },
            }
          }
        }
      }
    })
  })

  it('must apply directives on field definition (interfaces)', () => {
    const graphApi = graphapi`
      directive @foo on FIELD_DEFINITION

      interface Fruit {
        flavour: String!
        shape: String @foo
      }
    `
    const expectedDirectiveFoo = {
      title: 'foo',
      locations: ['FIELD_DEFINITION']
    }
    expect(graphApi).toMatchObject({
      components: {
        directives: { foo: expectedDirectiveFoo },
        interfaces: {
          Fruit: {
            type: {
              kind: 'interface',
              methods: {
                shape: {
                  directives: {
                    foo: { definition: { $ref: '#/components/directives/foo' } }
                  }
                }
              },
            }
          }
        }
      }
    })
  })

  it('must apply directives on input field definition (input objects)', () => {
    const graphApi = graphapi`
      directive @foo on INPUT_FIELD_DEFINITION

      input Fruit {
        flavour: String!
        shape: String @foo
      }
    `
    const expectedDirectiveFoo = {
      title: 'foo',
      locations: ['INPUT_FIELD_DEFINITION']
    }
    expect(graphApi).toMatchObject({
      components: {
        directives: { foo: expectedDirectiveFoo },
        inputObjects: {
          Fruit: {
            type: {
              kind: 'input',
              properties: {
                shape: {
                  directives: {
                    foo: { definition: { $ref: '#/components/directives/foo' } }
                  }
                }
              },
            }
          }
        }
      }
    })
  })

  it('directive arg values are transformed as-is', () => {
    const id = 'abcd-efgh-ijklmnopqrst-uvwxyz'
    const graphApi = buildGraphApi(`
      directive @foo(first: ID!, second: String = "Default", third: Int = 1234, fourth: Float = 12.34) on SCALAR
      scalar Test1 @foo(first: "${id}")
      scalar Test2 @foo(first: "${id}", second: "Hello world")
      scalar Test3 @foo(first: "${id}", second: null, third: 7777)
      scalar Test4 @foo(first: "${id}", second: null, third: null, fourth: 99.95)
      scalar Test5 @foo(first: "${id}", second: null, third: null, fourth: null)
    `)
    expect(graphApi.components).toMatchObject({
      scalars: {
        Test1: {
          directives: {
            foo: { meta: { first: id } }
          }
        },
        Test2: {
          directives: {
            foo: { meta: { first: id, second: 'Hello world' } }
          }
        },
        Test3: {
          directives: {
            foo: { meta: { first: id, second: null, third: 7777 } }
          }
        },
        Test4: {
          directives: {
            foo: { meta: { first: id, second: null, third: null, fourth: 99.95 } }
          }
        },
        Test5: {
          directives: {
            foo: { meta: { first: id, second: null, third: null, fourth: null } }
          }
        },
      }
    })
  })

  it('directive "deprecated" on enum', () => {
    const graphApi = graphapi`
      enum ColorEnum {
          BLUE
          "Red color"
          RED @deprecated
          "Green color"
          GREEN @deprecated(reason: "not used")
      }
    `
    expect(graphApi).toEqual({
      graphapi: GRAPH_API_VERSION,
      components: {
        enums: {
          ColorEnum: {
            title: 'ColorEnum',
            type: {
              kind: 'enum',
              values: {
                BLUE: {},
                RED: {
                  description: 'Red color',
                  directives: {
                    deprecated: {
                      definition: { '$ref': '#/components/directives/deprecated' },
                      meta: { reason: 'No longer supported' }
                    }
                  },
                },
                GREEN: {
                  description: 'Green color',
                  directives: {
                    deprecated: {
                      definition: { '$ref': '#/components/directives/deprecated' },
                      meta: { reason: 'not used' }
                    }
                  }
                }
              }
            },
          }
        },
        directives: {
          deprecated: DEFAULT_DIRECTIVES.deprecated
        }
      }
    })
  })

  it('directive "deprecated" on field definition', () => {
    const graphApi = graphapi`
      type ExampleType {
        newField: String
        oldField: String @deprecated(reason: "Use \`newField\`.")
     }
    `
    expect(graphApi).toEqual({
      graphapi: GRAPH_API_VERSION,
      components: {
        objects: {
          ExampleType: {
            title: 'ExampleType',
            type: {
              kind: 'object',
              methods: {
                newField: {
                  output: { typeDef: { type: { kind: 'string' } } }
                },
                oldField: {
                  output: { typeDef: { type: { kind: 'string' } } },
                  directives: {
                    deprecated: {
                      definition: { $ref: '#/components/directives/deprecated' },
                      meta: { reason: 'Use `newField`.' }
                    }
                  },
                },
              }
            },
          }
        },
        directives: {
          deprecated: DEFAULT_DIRECTIVES.deprecated
        }
      }
    })
  })

  it('directive "deprecated" on field definition', () => {
    const graphApi = graphapi`
      type ExampleType {
        newField: String
        oldField: String @deprecated(reason: "Use \`newField\`.")
     }
    `
    expect(graphApi).toEqual({
      graphapi: GRAPH_API_VERSION,
      components: {
        objects: {
          ExampleType: {
            title: 'ExampleType',
            type: {
              kind: 'object',
              methods: {
                newField: {
                  output: { typeDef: { type: { kind: 'string' } } }
                },
                oldField: {
                  output: { typeDef: { type: { kind: 'string' } } },
                  directives: {
                    deprecated: {
                      definition: { $ref: '#/components/directives/deprecated' },
                      meta: { reason: 'Use `newField`.' }
                    }
                  },
                },
              }
            },
          }
        },
        directives: {
          deprecated: DEFAULT_DIRECTIVES.deprecated
        }
      }
    })
  })

  it('directive "deprecated" on query definition', () => {
    const graphApi = graphapi`
      type Query {
        test: String @deprecated(reason: "Use \`newField\`.")
     }
    `
    expect(graphApi).toEqual({
      graphapi: GRAPH_API_VERSION,
      queries: {
        test: {
          output: {
            typeDef: { type: { kind: 'string' } }
          },
          directives: {
            deprecated: {
              definition: { $ref: '#/components/directives/deprecated' },
              meta: { reason: 'Use `newField`.' }
            }
          }
        }
      },
      components: {
        directives: {
          deprecated: DEFAULT_DIRECTIVES.deprecated
        }
      }
    })
  })

  it('directive "deprecated" on mutation definition', () => {
    const graphApi = graphapi`
      type Mutation {
        test: String @deprecated(reason: "Use \`newField\`.")
     }
    `
    expect(graphApi).toEqual({
      graphapi: GRAPH_API_VERSION,
      mutations: {
        test: {
          output: {
            typeDef: { type: { kind: 'string' } }
          },
          directives: {
            deprecated: {
              definition: { $ref: '#/components/directives/deprecated' },
              meta: { reason: 'Use `newField`.' }
            }
          }
        }
      },
      components: {
        directives: {
          deprecated: DEFAULT_DIRECTIVES.deprecated
        }
      }
    })
  })

  it('directive "deprecated" on subscription definition', () => {
    const graphApi = graphapi`
      type Subscription {
        test: String @deprecated(reason: "Use \`newField\`.")
     }
    `
    expect(graphApi).toEqual({
      graphapi: GRAPH_API_VERSION,
      subscriptions: {
        test: {
          output: {
            typeDef: { type: { kind: 'string' } }
          },
          directives: {
            deprecated: {
              definition: { $ref: '#/components/directives/deprecated' },
              meta: { reason: 'Use `newField`.' }
            }
          }
        }
      },
      components: {
        directives: {
          deprecated: DEFAULT_DIRECTIVES.deprecated
        }
      }
    })
  })

  it('directive "specifiedBy" on scalar', () => {
    const graphApi = graphapi`
      scalar UUID @specifiedBy(url: "https://example.com")
    `
    expect(graphApi).toEqual({
      graphapi: GRAPH_API_VERSION,
      components: {
        scalars: {
          UUID: {
            title: 'UUID',
            type: { kind: 'scalar' },
            directives: {
              specifiedBy: {
                definition: {
                  $ref: '#/components/directives/specifiedBy'
                },
                meta: {
                  url: 'https://example.com'
                }
              }
            }
          }
        },
        directives: {
          specifiedBy: DEFAULT_DIRECTIVES.specifiedBy
        }
      }
    })
  })

  it('runtime directive', () => {
    const graphApi = graphapi`
      directive @foo on FRAGMENT_DEFINITION
    `
    expect(graphApi).toEqual({
      graphapi: GRAPH_API_VERSION,
      components: {
        directives: {
          foo: {
            title: 'foo',
            locations: ['FRAGMENT_DEFINITION'],
          }
        }
      }
    })
  })

  it('directive "deprecated" overriden, but never used', () => {
    const graphApi = graphapi`
      directive @deprecated(reason: String!) on FIELD_DEFINITION

      type Query {
        test: ID!
      }
    `
    expect(graphApi).toEqual({
      graphapi: GRAPH_API_VERSION,
      queries: {
        test: { output: { typeDef: { type: { kind: 'ID' } }, nullable: false } }
      },
      components: {
        directives: {
          deprecated: {
            title: 'deprecated',
            args: {
              reason: { typeDef: { type: { kind: 'string' } }, nullable: false }
            },
            locations: ['FIELD_DEFINITION'],
          }
        }
      }
    })
  })

  it('directive "include" overriden, but never used', () => {
    const graphApi = graphapi`
      directive @include(if: Boolean!) on FIELD_DEFINITION

      type Query {
        test: ID!
      }
    `
    expect(graphApi).toEqual({
      graphapi: GRAPH_API_VERSION,
      queries: {
        test: {
          output: { typeDef: { type: { kind: 'ID' } }, nullable: false }
        }
      },
      components: {
        directives: {
          include: {
            title: 'include',
            args: {
              if: { typeDef: { type: { kind: 'boolean' } }, nullable: false }
            },
            locations: ['FIELD_DEFINITION'],
          }
        }
      }
    })
  })

  it('directive "skip" overriden, but never used', () => {
    const graphApi = graphapi`
      directive @skip(if: Boolean!) on FIELD_DEFINITION

      type Query {
        test: ID!
      }
    `
    expect(graphApi).toEqual({
      graphapi: GRAPH_API_VERSION,
      queries: {
        test: {
          output: { typeDef: { type: { kind: 'ID' } }, nullable: false }
        }
      },
      components: {
        directives: {
          skip: {
            title: 'skip',
            args: {
              if: { typeDef: { type: { kind: 'boolean' } }, nullable: false }
            },
            locations: ['FIELD_DEFINITION'],
          }
        }
      }
    })
  })

  it('directive "specifiedBy" overriden, but never used', () => {
    const graphApi = graphapi`
      directive @specifiedBy(url: String!) on SCALAR

      type Query {
        test: ID!
      }
    `
    expect(graphApi).toEqual({
      graphapi: GRAPH_API_VERSION,
      queries: {
        test: {
          output: { typeDef: { type: { kind: 'ID' } }, nullable: false }
        }
      },
      components: {
        directives: {
          specifiedBy: {
            title: 'specifiedBy',
            args: {
              url: { typeDef: { type: { kind: 'string' } }, nullable: false }
            },
            locations: ['SCALAR'],
          }
        }
      }
    })
  })

  it('directive "oneOf" overriden, but never used', () => {
    const graphApi = graphapi`
      directive @oneOf on FIELD

      type Query {
        test: ID!
      }
    `
    expect(graphApi).toEqual({
      graphapi: GRAPH_API_VERSION,
      queries: {
        test: {
          output: { typeDef: { type: { kind: 'ID' } }, nullable: false }
        }
      },
      components: {
        directives: {
          oneOf: {
            title: 'oneOf',
            locations: ['FIELD'],
          }
        }
      }
    })
  })

  it('built-in directives are unused', () => {
    const graphApi = graphapi`
      type Query {
        test: ID!
      }
    `
    expect(graphApi).toEqual({
      graphapi: GRAPH_API_VERSION,
      queries: {
        test: {
          output: { typeDef: { type: { kind: 'ID' } }, nullable: false }
        }
      },
    })
  })

  it('custom declarative directive defined, but never used', () => {
    const graphApi = graphapi`
      directive @test on FIELD_DEFINITION

      type Query {
        test: ID!
      }
    `
    expect(graphApi).toEqual({
      graphapi: GRAPH_API_VERSION,
      queries: {
        test: {
          output: { typeDef: { type: { kind: 'ID' } }, nullable: false }
        }
      },
      components: {
        directives: {
          test: {
            title: 'test',
            locations: ['FIELD_DEFINITION'],
          }
        }
      }
    })
  })

  it('custom runtime directive defined, but never used', () => {
    const graphApi = graphapi`
      directive @test on FIELD

      type Query {
        test: ID!
      }
    `
    expect(graphApi).toEqual({
      graphapi: GRAPH_API_VERSION,
      queries: {
        test: {
          output: { typeDef: { type: { kind: 'ID' } }, nullable: false }
        }
      },
      components: {
        directives: {
          test: {
            title: 'test',
            locations: ['FIELD'],
          }
        }
      }
    })
  })

  it('directive args defaults are not applied', () => {
    const graphApi = graphapi`
      type Query {
        todo(
          id: ID @foo(first: "arg", second: null) 
        ): String @foo(first: "schema")
      } 
      
      directive @foo(first: String!, second: String = "Default") on QUERY | MUTATION | SUBSCRIPTION | FIELD | FRAGMENT_DEFINITION | FRAGMENT_SPREAD | INLINE_FRAGMENT | VARIABLE_DEFINITION | SCHEMA | SCALAR | OBJECT | FIELD_DEFINITION | ARGUMENT_DEFINITION | INTERFACE | UNION | ENUM | ENUM_VALUE | INPUT_OBJECT | INPUT_FIELD_DEFINITION
    `
    const expectedDirectiveMetaOnArg = { first: 'arg', second: null }
    const expectedDirectiveMetaOnOutput = { first: 'schema' }

    expect(graphApi).toHaveProperty(
      ['queries', 'todo', 'args', 'id', 'directives', 'foo', 'meta'],
      expectedDirectiveMetaOnArg
    )
    expect(graphApi).toHaveProperty(
      ['queries', 'todo', 'directives', 'foo', 'meta'],
      expectedDirectiveMetaOnOutput
    )
  })
})