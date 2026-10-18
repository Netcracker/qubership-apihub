import {
  GRAPH_API_NODE_KIND_ENUM,
  GRAPH_API_NODE_KIND_ID,
  GRAPH_API_NODE_KIND_INPUT_OBJECT,
  GRAPH_API_NODE_KIND_INTERFACE,
  GRAPH_API_NODE_KIND_LIST,
  GRAPH_API_NODE_KIND_OBJECT,
  GRAPH_API_NODE_KIND_SCALAR,
  GRAPH_API_NODE_KIND_STRING,
  GRAPH_API_NODE_KIND_UNION,
  GRAPH_API_VERSION
} from '@netcracker/qubership-apihub-graphapi'
import {
  convertOriginToHumanReadable,
  DEFAULT_TYPE_FLAG_PURE,
  DEFAULT_TYPE_FLAG_SYNTHETIC,
  normalize,
  NormalizeOptions
} from '../../src'
import {
  commonOriginsCheck,
  graphapi,
  TEST_DEFAULTS_FLAG,
  TEST_ORIGINS_FLAG,
  TEST_ORIGINS_FOR_DEFAULTS
} from '../helpers'
import { DirectiveLocation } from 'graphql'

describe('Defaults', () => {
  const NORMALIZE_OPTIONS: NormalizeOptions = {
    unify: true,
    validate: true,
    defaultsFlag: TEST_DEFAULTS_FLAG,
  }
  it('all roots except directives', () => {
    const graphApi = graphapi`
      directive @empty on SCHEMA
    `
    const normalized = normalize(graphApi, NORMALIZE_OPTIONS)
    expect(normalized).toEqual({
      graphapi: GRAPH_API_VERSION,
      queries: {},
      mutations: {},
      subscriptions: {},
      [TEST_DEFAULTS_FLAG]: {
        queries: DEFAULT_TYPE_FLAG_SYNTHETIC,
        mutations: DEFAULT_TYPE_FLAG_SYNTHETIC,
        subscriptions: DEFAULT_TYPE_FLAG_SYNTHETIC
      },
      components: {
        directives: {
          empty: {
            args: {},
            directives: {},
            locations: [DirectiveLocation.SCHEMA],
            repeatable: false,
            title: 'empty',
            [TEST_DEFAULTS_FLAG]: {
              args: DEFAULT_TYPE_FLAG_SYNTHETIC,
              directives: DEFAULT_TYPE_FLAG_SYNTHETIC,
              repeatable: DEFAULT_TYPE_FLAG_SYNTHETIC,
            },
          },
        },
        enums: {},
        inputObjects: {},
        interfaces: {},
        objects: {},
        scalars: {},
        unions: {},
        [TEST_DEFAULTS_FLAG]: {
          enums: DEFAULT_TYPE_FLAG_SYNTHETIC,
          inputObjects: DEFAULT_TYPE_FLAG_SYNTHETIC,
          interfaces: DEFAULT_TYPE_FLAG_SYNTHETIC,
          objects: DEFAULT_TYPE_FLAG_SYNTHETIC,
          scalars: DEFAULT_TYPE_FLAG_SYNTHETIC,
          unions: DEFAULT_TYPE_FLAG_SYNTHETIC,
        },
      },
    })
  })

  it('components defaults', () => {
    const graphApi = graphapi`
      scalar Scalar
      input Input {
       prp:String
      }
      interface Interface {
       prp:String
      }
      type Type {
       prp:String
      }
      enum Enum {
       v
      }
      union Union
    `
    const normalized = normalize(graphApi, NORMALIZE_OPTIONS)
    expect(normalized).toEqual({
      graphapi: GRAPH_API_VERSION,
      queries: {},
      mutations: {},
      subscriptions: {},
      [TEST_DEFAULTS_FLAG]: {
        queries: DEFAULT_TYPE_FLAG_SYNTHETIC,
        mutations: DEFAULT_TYPE_FLAG_SYNTHETIC,
        subscriptions: DEFAULT_TYPE_FLAG_SYNTHETIC
      },
      components: {
        enums: {
          Enum: {
            title: 'Enum',
            type: {
              kind: GRAPH_API_NODE_KIND_ENUM,
              values: {
                v: {
                  directives: {},
                  [TEST_DEFAULTS_FLAG]: {
                    directives: DEFAULT_TYPE_FLAG_SYNTHETIC,
                  },
                },
              },
              
            },
            directives: {},
            [TEST_DEFAULTS_FLAG]: {
              directives: DEFAULT_TYPE_FLAG_SYNTHETIC,
            },
          },
        },
        inputObjects: {
          Input: {
            title: 'Input',
            type: {
              kind: GRAPH_API_NODE_KIND_INPUT_OBJECT,
              properties: {
                prp: {
                  typeDef: {
                    type: {
                      kind: GRAPH_API_NODE_KIND_STRING,
                    },
                    directives: {},
                    [TEST_DEFAULTS_FLAG]: {
                      directives: DEFAULT_TYPE_FLAG_SYNTHETIC,
                    },
                  },
                  directives: {},
                  nullable: true,
                  [TEST_DEFAULTS_FLAG]: {
                    directives: DEFAULT_TYPE_FLAG_SYNTHETIC,
                    nullable: DEFAULT_TYPE_FLAG_SYNTHETIC,
                  },
                },
              },
            },
            directives: {},
            [TEST_DEFAULTS_FLAG]: {
              directives: DEFAULT_TYPE_FLAG_SYNTHETIC,
            },
          }
        },
        interfaces: {
          'Interface': {
            title: 'Interface',
            type: {
              kind: GRAPH_API_NODE_KIND_INTERFACE,
              methods: {
                prp: {
                  output: {
                    typeDef: {
                      directives: {},
                      type: {
                        kind: GRAPH_API_NODE_KIND_STRING,
                      },
                      [TEST_DEFAULTS_FLAG]: {
                        directives: DEFAULT_TYPE_FLAG_SYNTHETIC,
                      },
                    },
                    directives: {},
                    nullable: true,
                    [TEST_DEFAULTS_FLAG]: {
                      directives: DEFAULT_TYPE_FLAG_SYNTHETIC,
                      nullable: DEFAULT_TYPE_FLAG_SYNTHETIC,
                    },
                  },
                  args: {},
                  directives: {},
                  [TEST_DEFAULTS_FLAG]: {
                    args: DEFAULT_TYPE_FLAG_SYNTHETIC,
                    directives: DEFAULT_TYPE_FLAG_SYNTHETIC,
                  },
                },
              },
              interfaces: [],
              [TEST_DEFAULTS_FLAG]: {
                interfaces: DEFAULT_TYPE_FLAG_SYNTHETIC,
              },
            },
            directives: {},
            [TEST_DEFAULTS_FLAG]: {
              directives: DEFAULT_TYPE_FLAG_SYNTHETIC,
            },
          },
        },
        objects: {
          'Type': {
            title: 'Type',
            type: {
              kind: GRAPH_API_NODE_KIND_OBJECT,
              methods: {
                prp: {
                  output: {
                    typeDef: {
                      type: {
                        kind: GRAPH_API_NODE_KIND_STRING,
                      },
                      directives: {},
                      [TEST_DEFAULTS_FLAG]: {
                        directives: DEFAULT_TYPE_FLAG_SYNTHETIC,
                      },
                    },
                    directives: {},
                    nullable: true,
                    [TEST_DEFAULTS_FLAG]: {
                      directives: DEFAULT_TYPE_FLAG_SYNTHETIC,
                      nullable: DEFAULT_TYPE_FLAG_SYNTHETIC,
                    },
                  },
                  args: {},
                  directives: {},
                  [TEST_DEFAULTS_FLAG]: {
                    args: DEFAULT_TYPE_FLAG_SYNTHETIC,
                    directives: DEFAULT_TYPE_FLAG_SYNTHETIC,
                  },
                },
              },
              interfaces: [],
              [TEST_DEFAULTS_FLAG]: {
                interfaces: DEFAULT_TYPE_FLAG_SYNTHETIC,
              },
            },
            directives: {},
            [TEST_DEFAULTS_FLAG]: {
              directives: DEFAULT_TYPE_FLAG_SYNTHETIC,
            },
          },
        },
        scalars: {
          Scalar: {
            title: 'Scalar',
            type: {
              kind: GRAPH_API_NODE_KIND_SCALAR,
            },
            directives: {},
            [TEST_DEFAULTS_FLAG]: {
              directives: DEFAULT_TYPE_FLAG_SYNTHETIC,
            },
          },
        },
        unions: {
          Union: {
            title: 'Union',
            type: {
              kind: GRAPH_API_NODE_KIND_UNION,
              oneOf: [],
              // [TEST_DEFAULTS_FLAG]: { graphapi bug
                // oneOf: DEFAULT_TYPE_FLAG_SYNTHETIC,
              // },
            },
            directives: {},
            [TEST_DEFAULTS_FLAG]: {
              directives: DEFAULT_TYPE_FLAG_SYNTHETIC,
            },
          },
        },
        directives: {},
        [TEST_DEFAULTS_FLAG]: {
          directives: DEFAULT_TYPE_FLAG_SYNTHETIC,
        },
      },
    })
  })

  it('operations defaults', () => {
    const graphApi = graphapi`
      type Query {
        query: String
      }

      type Mutation {
        mutation: String
      }

      type Subscription {
        subscription: String
      }
    `
    const normalized = normalize(graphApi, NORMALIZE_OPTIONS)
    expect(normalized).toEqual({
      graphapi: GRAPH_API_VERSION,
      components: {
        directives: {},
        enums: {},
        inputObjects: {},
        interfaces: {},
        objects: {},
        scalars: {},
        unions: {},
        [TEST_DEFAULTS_FLAG]: {
          directives: DEFAULT_TYPE_FLAG_SYNTHETIC,
          enums: DEFAULT_TYPE_FLAG_SYNTHETIC,
          inputObjects: DEFAULT_TYPE_FLAG_SYNTHETIC,
          interfaces: DEFAULT_TYPE_FLAG_SYNTHETIC,
          objects: DEFAULT_TYPE_FLAG_SYNTHETIC,
          scalars: DEFAULT_TYPE_FLAG_SYNTHETIC,
          unions: DEFAULT_TYPE_FLAG_SYNTHETIC,
        },
      },
      [TEST_DEFAULTS_FLAG]: {
        components: DEFAULT_TYPE_FLAG_SYNTHETIC,
      },
      queries: {
        query: {
          output: {
            typeDef: {
              type: {
                kind: GRAPH_API_NODE_KIND_STRING,
              },
              directives: {},
              [TEST_DEFAULTS_FLAG]: {
                directives: DEFAULT_TYPE_FLAG_SYNTHETIC,
              },
            },
            directives: {},
            nullable: true,
            [TEST_DEFAULTS_FLAG]: {
              directives: DEFAULT_TYPE_FLAG_SYNTHETIC,
              nullable: DEFAULT_TYPE_FLAG_SYNTHETIC,
            },
          },
          args: {},
          directives: {},
          [TEST_DEFAULTS_FLAG]: {
            args: DEFAULT_TYPE_FLAG_SYNTHETIC,
            directives: DEFAULT_TYPE_FLAG_SYNTHETIC,
          },
        },
      },
      mutations: {
        mutation: {
          output: {
            typeDef: {
              type: {
                kind: GRAPH_API_NODE_KIND_STRING,
              },
              directives: {},
                [TEST_DEFAULTS_FLAG]: {
                  directives: DEFAULT_TYPE_FLAG_SYNTHETIC,
                },
            },
            directives: {},
            nullable: true,
            [TEST_DEFAULTS_FLAG]: {
              directives: DEFAULT_TYPE_FLAG_SYNTHETIC,
              nullable: DEFAULT_TYPE_FLAG_SYNTHETIC,
            },
          },
          args: {},
          directives: {},
          [TEST_DEFAULTS_FLAG]: {
            args: DEFAULT_TYPE_FLAG_SYNTHETIC,
            directives: DEFAULT_TYPE_FLAG_SYNTHETIC,
          },
        },
      },
      subscriptions: {
        subscription: {
          output: {
            typeDef: {
              type: {
                kind: GRAPH_API_NODE_KIND_STRING,
              },
              directives: {},
                [TEST_DEFAULTS_FLAG]: {
                  directives: DEFAULT_TYPE_FLAG_SYNTHETIC,
                },
            },
            directives: {},
            nullable: true,
            [TEST_DEFAULTS_FLAG]: {
              directives: DEFAULT_TYPE_FLAG_SYNTHETIC,
              nullable: DEFAULT_TYPE_FLAG_SYNTHETIC,
            },
          },
          args: {},
          directives: {},
          [TEST_DEFAULTS_FLAG]: {
            args: DEFAULT_TYPE_FLAG_SYNTHETIC,
            directives: DEFAULT_TYPE_FLAG_SYNTHETIC,
          },
        },
      },
    })
  })

  it('usage default directive', () => {
    const graphApi = graphapi`
    type Simple {
      arg: String! @deprecated
    }

    scalar UUID @specifiedBy(url: "https://tools.ietf.org/html/rfc4122")
  `
    const normalized = normalize(graphApi, {
      unify: true,
      validate: true,
    })
    const result = {
      graphapi: GRAPH_API_VERSION,
      components: {
        objects: {
          Simple: {
            title: 'Simple',
            directives: {},
            type: {
              kind: GRAPH_API_NODE_KIND_OBJECT,
              methods: {
                arg: {
                  directives: {
                    deprecated: {
                      definition: null as any,
                      meta: {
                        reason: 'No longer supported'
                      }
                    },
                  },
                  output: {
                    typeDef: {
                      directives: {},
                      type: {
                        kind: GRAPH_API_NODE_KIND_STRING,
                      },
                    },
                    nullable: false,
                    directives: {},
                  },
                  args: {},
                },
              },
              interfaces: [],
            },
          },
        },
        scalars: {
          UUID: {
            title: 'UUID',
            directives: {
              specifiedBy: {
                definition: null as any,
                meta: {
                  url: 'https://tools.ietf.org/html/rfc4122'
                }
              },
            },
            type: {
              kind: GRAPH_API_NODE_KIND_SCALAR,
            },
          },
        },
        directives: {
          deprecated: {
            title: 'deprecated',
            description: 'Marks an element of a GraphQL schema as no longer supported.',
            locations: [
              DirectiveLocation.FIELD_DEFINITION,
              DirectiveLocation.ARGUMENT_DEFINITION,
              DirectiveLocation.INPUT_FIELD_DEFINITION,
              DirectiveLocation.ENUM_VALUE,
            ],
            args: {
              reason: {
                description: 'Explains why this element was deprecated, usually also including a suggestion for how to access supported similar data. Formatted using the Markdown syntax, as specified by [CommonMark](https://commonmark.org/).',
                typeDef: {
                  directives: {},
                  type: {
                    kind: GRAPH_API_NODE_KIND_STRING,
                  },
                },
                default: 'No longer supported',
                nullable: true,
                directives: {},
              },
            },
            repeatable: false,
            directives: {},
          },
          specifiedBy: {
            title: 'specifiedBy',
            description: 'Exposes a URL that specifies the behavior of this scalar.',
            locations: [
              DirectiveLocation.SCALAR
            ],
            args: {
              url: {
                description: 'The URL that specifies the behavior of this scalar.',
                typeDef: {
                  directives: {},
                  type: {
                    kind: GRAPH_API_NODE_KIND_STRING,
                  },
                },
                nullable: false,
                directives: {},
              },
            },
            repeatable: false,
            directives: {},
          },
        },
        interfaces: {},
        inputObjects: {},
        unions: {},
        enums: {},
      },
      queries: {},
      mutations: {},
      subscriptions: {},
    }
    result.components.objects.Simple.type.methods.arg.directives.deprecated.definition = result.components.directives.deprecated
    result.components.scalars.UUID.directives.specifiedBy.definition = result.components.directives.specifiedBy
    expect(normalized).toEqual(result)

  })

  it('defaults in array', () => {
    const graphApi = graphapi`
    type Simple {
      arg: [[String]!]
    }
  `
    const normalized = normalize(graphApi, {
      unify: true,
      validate: true,
    })
    expect(normalized).toEqual({
      graphapi: GRAPH_API_VERSION,
      components: {
        objects: {
          Simple: {
            title: 'Simple',
            type: {
              kind: GRAPH_API_NODE_KIND_OBJECT,
              methods: {
                arg: {
                  output: {
                    typeDef: {
                      directives: {},
                      type: {
                        kind: GRAPH_API_NODE_KIND_LIST,
                        items: {
                          typeDef: {
                            directives: {},
                            type: {
                              kind: GRAPH_API_NODE_KIND_LIST,
                              items: {
                                typeDef: {
                                  directives: {},
                                  type: {
                                    kind: GRAPH_API_NODE_KIND_STRING,
                                  },
                                },
                                nullable: true,
                                directives: {},
                              },
                            },
                          },
                          nullable: false,
                          directives: {},
                        },
                      },
                    },
                    nullable: true,
                    directives: {},
                  },
                  args: {},
                  directives: {},
                },
              },
              interfaces: [],
            },
            directives: {},
          },
        },
        scalars: {},
        interfaces: {},
        inputObjects: {},
        directives: {},
        unions: {},
        enums: {},
      },
      queries: {},
      mutations: {},
      subscriptions: {},
    })
  })

  it('default in references', () => {
    const graphApi = graphapi`
      interface One {
       prp(arg: Cycled, en: [Shared] = [V]): Cycled
      }
      
      interface Two {
       prp: [Cycled]
      }
      
      interface Complex implements One & Two {
        prp: Cycled!
      }
      
      extend interface Two {
        anotherPrp: Cycled
      }
      
      enum Shared {
        V
      }
      
      union Cycled = Shared | Complex  | One | Two 
  `
    const normalized = normalize(graphApi, {
      unify: true,
      validate: true,
    })
    const expected = {
      graphapi: GRAPH_API_VERSION,
      components: {
        interfaces: {
          One: {
            title: 'One',
            type: {
              kind: GRAPH_API_NODE_KIND_INTERFACE,
              methods: {
                prp: {
                  args: {
                    arg: {
                      typeDef: null as any /*Cycled*/,
                      nullable: true,
                      directives: {},
                    },
                    en: {
                      typeDef: {
                        type: {
                          kind: GRAPH_API_NODE_KIND_LIST,
                          items: {
                            typeDef: null as any /*Shared*/,
                            nullable: true,
                            directives: {},
                          },
                        },
                        directives: {},
                      },
                      default: ['V'],
                      nullable: true,
                      directives: {},
                    },
                  },
                  output: {
                    typeDef: null as any /*Cycled*/,
                    nullable: true,
                    directives: {},
                  },
                  directives: {},
                },
              },
              interfaces: [],
            },
            directives: {},
          },
          Two: {
            title: 'Two',
            type: {
              kind: GRAPH_API_NODE_KIND_INTERFACE,
              methods: {
                prp: {
                  output: {
                    typeDef: {
                      type: {
                        kind: GRAPH_API_NODE_KIND_LIST,
                        items: {
                          typeDef: null as any /*Cycled*/,
                          nullable: true,
                          directives: {},
                        },
                      },
                      directives: {},
                    },
                    nullable: true,
                    directives: {},
                  },
                  args: {},
                  directives: {},
                },
                anotherPrp: {
                  output: {
                    typeDef: null as any /*Cycled*/,
                    nullable: true,
                    directives: {},
                  },
                  args: {},
                  directives: {},
                },
              },
              interfaces: [],
            },
            directives: {},
          },
          Complex: {
            title: 'Complex',
            type: {
              kind: GRAPH_API_NODE_KIND_INTERFACE,
              methods: {
                prp: {
                  output: {
                    typeDef: null as any /*Cycled*/,
                    nullable: false,
                    directives: {},
                  },
                  args: {},
                  directives: {},
                },
              },
              interfaces: [
                null as any, /*One*/
                null as any, /*Two*/
              ],
            },
            directives: {},
          },
        },
        enums: {
          Shared: {
            title: 'Shared',
            type: {
              kind: GRAPH_API_NODE_KIND_ENUM,
              values: {
                V: {
                  directives: {},
                },
              },
            },
            directives: {},
          },
        },
        unions: {
          Cycled: {
            title: 'Cycled',
            type: {
              kind: GRAPH_API_NODE_KIND_UNION,
              oneOf: [
                null as any, // Shared
                null as any, // Complex
                null as any, // One
                null as any, // Two
              ],
            },
            directives: {},
          },
        },
        scalars: {},
        objects: {},
        inputObjects: {},
        directives: {},
      },
      queries: {},
      mutations: {},
      subscriptions: {},
    }
    expected.components.interfaces.One.type.methods.prp.args.arg.typeDef = expected.components.unions.Cycled
    expected.components.interfaces.One.type.methods.prp.args.en.typeDef.type.items.typeDef = expected.components.enums.Shared
    expected.components.interfaces.One.type.methods.prp.output.typeDef = expected.components.unions.Cycled
    expected.components.interfaces.Two.type.methods.prp.output.typeDef.type.items.typeDef = expected.components.unions.Cycled
    expected.components.interfaces.Two.type.methods.anotherPrp.output.typeDef = expected.components.unions.Cycled
    expected.components.interfaces.Complex.type.methods.prp.output.typeDef = expected.components.unions.Cycled
    expected.components.interfaces.Complex.type.interfaces[0] = expected.components.interfaces.One
    expected.components.interfaces.Complex.type.interfaces[1] = expected.components.interfaces.Two
    expected.components.unions.Cycled.type.oneOf[0] = expected.components.enums.Shared
    expected.components.unions.Cycled.type.oneOf[1] = expected.components.interfaces.Complex
    expected.components.unions.Cycled.type.oneOf[2] = expected.components.interfaces.One
    expected.components.unions.Cycled.type.oneOf[3] = expected.components.interfaces.Two
    expect(normalized).toEqual(expected)
  })

  describe('Directive meta unification', () => {
    const schema = graphapi`
  type Query {
    todo(
        id: ID @nice(first: "arg", second: "Default", third: "arg", four: "NotDefault")
    ): String @nice(first: "schema", four: null)
  }

  directive @nice(first: String!, second: String! = "Default", third: String, four: String = "Default") on FIELD_DEFINITION | ARGUMENT_DEFINITION 
`
    it('check values', () => {
      const result = normalize(schema, {
        unify: true,
      })
      const expected = {
        graphapi: GRAPH_API_VERSION,
        queries: {
          todo: {
            directives: {
              nice: {
                definition: null as any, //#1
                meta: {
                  first: 'schema',
                  second: 'Default',
                  four: null,
                },
              },
            },
            args: {
              id: {
                directives: {
                  nice: {
                    definition: null as any, //#1
                    meta: {
                      first: 'arg',
                      second: 'Default',
                      third: 'arg',
                      four: 'NotDefault',
                    },
                  },
                },
                typeDef: {
                  type: {
                    kind: GRAPH_API_NODE_KIND_ID,
                  },
                },
              },
            },
            output: {
              directives: {},
              nullable: true,
              typeDef: {
                type: {
                  kind: GRAPH_API_NODE_KIND_STRING,
                },
                directives: {},
              },
            }
          },
        },
        components: {
          directives: {
            nice: {
              title: 'nice',
              locations: [DirectiveLocation.FIELD_DEFINITION, DirectiveLocation.ARGUMENT_DEFINITION],
              args: {
                first: {
                  typeDef: {
                    type: {
                      kind: GRAPH_API_NODE_KIND_STRING,
                    },
                    directives: {},
                  },
                },
                second: {
                  typeDef: {
                    type: {
                      kind: GRAPH_API_NODE_KIND_STRING,
                    },
                    directives: {},
                  },
                  default: 'Default',
                },
                third: {
                  typeDef: {
                    type: {
                      kind: GRAPH_API_NODE_KIND_STRING,
                    },
                    directives: {},
                  },
                },
                four: {
                  typeDef: {
                    type: {
                      kind: GRAPH_API_NODE_KIND_STRING,
                    },
                    directives: {},
                  },
                  default: 'Default',
                },
              },
            },
          },
        },
      }
      expected.queries.todo.directives.nice.definition = expected.components.directives.nice
      expected.queries.todo.args.id.directives.nice.definition = expected.components.directives.nice
      expect(result).toMatchObject(expected)
    })

    it('check values origins symbols', () => {
      const result = normalize(schema, {
        unify: true,
        originsFlag: TEST_ORIGINS_FLAG,
        createOriginsForDefaults: () => TEST_ORIGINS_FOR_DEFAULTS
      })
      commonOriginsCheck(result, { source: schema })
      const resultWithHmr = convertOriginToHumanReadable(result, TEST_ORIGINS_FLAG)
      expect(resultWithHmr).toHaveProperty(['queries', 'todo', 'directives', 'nice', 'meta', TEST_ORIGINS_FLAG, 'second'], ['components/directives/nice/args/second/default'])
      expect(resultWithHmr).toHaveProperty(['queries', 'todo', 'args', 'id', 'directives', 'nice', 'meta', TEST_ORIGINS_FLAG, 'second'], ['queries/todo/args/id/directives/nice/meta/second'])
    })

    it('check values defaults symbols', () => {
      const result = normalize(schema, {
        unify: true,
        defaultsFlag: TEST_DEFAULTS_FLAG,
      })
      expect(result).toHaveProperty(['queries', 'todo', 'directives', 'nice', 'meta', TEST_DEFAULTS_FLAG, 'second'], DEFAULT_TYPE_FLAG_SYNTHETIC)
      expect(result).toHaveProperty(['queries', 'todo', 'args', 'id', 'directives', 'nice', 'meta', TEST_DEFAULTS_FLAG, 'second'], DEFAULT_TYPE_FLAG_PURE)
    })
  })
})
