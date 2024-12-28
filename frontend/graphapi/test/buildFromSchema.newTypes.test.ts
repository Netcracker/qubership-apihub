import { GRAPH_API_VERSION } from "../src/constants"
import { graphapi } from "./helpers/build-graphApi"

describe('New types', () => {
  it('type = ID', () => {
    const graphApi = graphapi`
      type Query {
        test: ID!
      }
    `
    const expected = {
      graphapi: GRAPH_API_VERSION,
      queries: {
        test: {
          output: {
            typeDef: { type: { kind: 'ID' } },
            nullable: false,
          }
        }
      },
    }
    expect(graphApi).toEqual(expected)
  })

  it('type = Int', () => {
    const graphApi = graphapi`
      type Query {
        test: Int!
      }
    `
    const expected = {
      graphapi: GRAPH_API_VERSION,
      queries: {
        test: {
          output: {
            typeDef: { type: { kind: 'integer' } },
            nullable: false,
          }
        }
      },
    }
    expect(graphApi).toEqual(expected)
  })

  it('type = Float', () => {
    const graphApi = graphapi`
      type Query {
        test: Float!
      }
    `
    const expected = {
      graphapi: GRAPH_API_VERSION,
      queries: {
        test: {
          output: {
            typeDef: { type: { kind: 'float' } },
            nullable: false,
          }
        }
      },
    }
    expect(graphApi).toEqual(expected)
  })

  it('type = String', () => {
    const graphApi = graphapi`
      type Query {
        test: String!
      }
    `
    const expected = {
      graphapi: GRAPH_API_VERSION,
      queries: {
        test: {
          output: {
            typeDef: { type: { kind: 'string' } },
            nullable: false,
          }
        }
      },
    }
    expect(graphApi).toEqual(expected)
  })

  it('type = Boolean', () => {
    const graphApi = graphapi`
      type Query {
        test: Boolean!
      }
    `
    const expected = {
      graphapi: GRAPH_API_VERSION,
      queries: {
        test: {
          output: {
            typeDef: { type: { kind: 'boolean' } },
            nullable: false,
          }
        }
      },
    }
    expect(graphApi).toEqual(expected)
  })

  it('type = CustomScalar', () => {
    const graphApi = graphapi`
      type Query {
        test: CustomScalar!
      }
      
      scalar CustomScalar
    `
    const expected = {
      graphapi: GRAPH_API_VERSION,
      queries: {
        test: {
          output: {
            typeDef: { $ref: '#/components/scalars/CustomScalar' },
            nullable: false,
          }
        }
      },
      components: {
        scalars: {
          CustomScalar: {
            title: 'CustomScalar',
            type: { kind: 'scalar' },
          }
        },
      }
    }
    expect(graphApi).toMatchObject(expected)
  })

  it('type = "enum", empty enum values', () => {
    const graphApi = graphapi`
      type Query {
        fruit: Fruit!
      }

      enum Fruit {
        Apple
        Orange
        Banana
      }
    `
    const expected = {
      graphapi: GRAPH_API_VERSION,
      queries: {
        fruit: {
          output: {
            typeDef: { $ref: '#/components/enums/Fruit' },
            nullable: false,
          }
        }
      },
      components: {
        enums: {
          Fruit: {
            title: 'Fruit',
            type: {
              kind: 'enum',
              values: {
                Apple: {},
                Orange: {},
                Banana: {},
              }
            }
          }
        },
      }
    }
    expect(graphApi).toEqual(expected)
  })

  it('type = "enum", case sensitivity', () => {
    const graphApi = graphapi`
      type Query {
        fruit: Fruit!
      }

      enum Fruit {
        """1st variant"""
        Orange
        """2nd variant"""
        ORANGE
        """3rd variant"""
        orange
        OrAnGe
      }
    `
    const expected = {
      graphapi: GRAPH_API_VERSION,
      components: {
        enums: {
          Fruit: {
            type: {
              kind: 'enum',
              values: {
                Orange: { description: '1st variant' },
                ORANGE: { description: '2nd variant' },
                orange: { description: '3rd variant' },
                OrAnGe: {},
              }
            }
          }
        }
      }
    }
    expect(graphApi).toMatchObject(expected)
  })

  it('type = "enum" as directive arg type', () => {
    const graphApi = graphapi`
      directive @test(arg: TestEnum!) on FIELD_DEFINITION
    
      type Query {
        test: Test
      }

      enum TestEnum {
        FIRST
        SECOND
        THIRD
      }

      type Test {
        id: ID! @test(arg: FIRST)
      }
    `
    const expected = {
      graphapi: GRAPH_API_VERSION,
      components: {
        objects: {
          Test: {
            type: {
              kind: 'object',
              methods: {
                id: {
                  directives: {
                    test: {
                      definition: {
                        $ref: '#/components/directives/test',
                      },
                      meta: {
                        arg: 'FIRST'
                      }
                    }
                  },
                  output: {
                    typeDef: { type: { kind: 'ID' } },
                    nullable: false,
                  }
                }
              }
            }
          }
        },
        directives: {
          test: {
            args: {
              arg: {
                typeDef: {
                  $ref: '#/components/enums/TestEnum',
                },
                nullable: false,
              }
            }
          }
        },
        enums: {
          TestEnum: {
            type: {
              kind: 'enum',
              values: {
                FIRST: {},
                SECOND: {},
                THIRD: {},
              }
            }
          }
        }
      }
    }
    expect(graphApi).toMatchObject(expected)
  })

  it('type = "object"', () => {
    const graphApi = graphapi`
      type MyObject {
        id: ID!
        str: String!
        int: Int
        float: Float
        bool: Boolean
        withArgs(propArg: String): Int!
      }
    `
    expect(graphApi).toHaveProperty(['components', 'objects', 'MyObject'], {
      title: 'MyObject',
      type: {
        kind: 'object',
        methods: {
          id: { output: { typeDef: { type: { kind: 'ID' } }, nullable: false } },
          str: { output: { typeDef: { type: { kind: 'string' } }, nullable: false } },
          int: { output: { typeDef: { type: { kind: 'integer' } } } },
          float: { output: { typeDef: { type: { kind: 'float' } } } },
          bool: { output: { typeDef: { type: { kind: 'boolean' } } } },
          withArgs: {
            args: { propArg: { typeDef: { type: { kind: 'string' } } } },
            output: { typeDef: { type: { kind: 'integer' } }, nullable: false }
          },
        }
      }
    })
  })

  it('type = "input"', () => {
    const graphApi = graphapi`
      input MyInput {
        id: ID!
        str: String!
        int: Int
        float: Float
        bool: Boolean
      }
    `
    expect(graphApi).toHaveProperty(['components', 'inputObjects', 'MyInput'], {
      title: 'MyInput',
      type: {
        kind: 'input',
        properties: {
          id: { typeDef: { type: { kind: 'ID' } }, nullable: false },
          str: { typeDef: { type: { kind: 'string' } }, nullable: false },
          int: { typeDef: { type: { kind: 'integer' } } },
          float: { typeDef: { type: { kind: 'float' } } },
          bool: { typeDef: { type: { kind: 'boolean' } } },
        }
      }
    })
  })

  it('union type, items must not have nullable property', () => {
    const graphApi = graphapi`
      union Test = String | Int | Float

      type Query {
        test: Test!
      }
    `
    expect(graphApi).toEqual({
      graphapi: GRAPH_API_VERSION,
      queries: {
        test: {
          output: {
            typeDef: { $ref: '#/components/unions/Test' },
            nullable: false,
          }
        }
      },
      components: {
        unions: {
          Test: {
            title: 'Test',
            type: {
              kind: 'union',
              oneOf: [
                { type: { kind: 'string' } },
                { type: { kind: 'integer' } },
                { type: { kind: 'float' } },
              ]
            }
          }
        }
      }
    })
  })

  it('type = "interface"', () => {
    const graphApi = graphapi`
      interface IMyType {
        id: ID!
        name: String
      }
    `
    expect(graphApi).toEqual({
      graphapi: GRAPH_API_VERSION,
      components: {
        interfaces: {
          IMyType: {
            title: 'IMyType',
            type: {
              kind: 'interface',
              methods: {
                id: { output: { typeDef: { type: { kind: 'ID' } }, nullable: false } },
                name: { output: { typeDef: { type: { kind: 'string' } } } },
              }
            }
          }
        }
      },
    })
  })

  it('type = "interface" inherited another "interface"', () => {
    const graphApi = graphapi`
      interface IParent {
        id: ID!
      }
      interface IChild implements IParent {
        id: ID!
        name: String
      }
    `
    expect(graphApi).toEqual({
      graphapi: GRAPH_API_VERSION,
      components: {
        interfaces: {
          IParent: {
            title: 'IParent',
            type: {
              kind: 'interface',
              methods: {
                id: { output: { typeDef: { type: { kind: 'ID' } }, nullable: false } },
              }
            }
          },
          IChild: {
            title: 'IChild',
            type: {
              kind: 'interface',
              methods: {
                id: { output: { typeDef: { type: { kind: 'ID' } }, nullable: false } },
                name: { output: { typeDef: { type: { kind: 'string' } } } },
              },
              interfaces: [{ $ref: '#/components/interfaces/IParent' }]
            }
          }
        }
      },
    })
  })

  it('type = "object" inherited "interface"', () => {
    const graphApi = graphapi`
      interface IType {
        id: ID!
      }
      type Type implements IType {
        id: ID!
        name: String
      }
    `
    expect(graphApi).toEqual({
      graphapi: GRAPH_API_VERSION,
      components: {
        interfaces: {
          IType: {
            title: 'IType',
            type: {
              kind: 'interface',
              methods: {
                id: { output: { typeDef: { type: { kind: 'ID' } }, nullable: false } },
              }
            }
          },
        },
        objects: {
          Type: {
            title: 'Type',
            type: {
              kind: 'object',
              methods: {
                id: { output: { typeDef: { type: { kind: 'ID' } }, nullable: false } },
                name: { output: { typeDef: { type: { kind: 'string' } } } },
              },
              interfaces: [{ $ref: '#/components/interfaces/IType' }]
            }
          }
        }
      },
    })
  })
})