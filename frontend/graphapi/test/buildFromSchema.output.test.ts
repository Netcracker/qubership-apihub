import { isGraphApiOperation } from '../src/guards'
import { buildGraphApi } from './helpers/build-graphApi'

// TODO 10.09.24 // RENAME TESTS
describe('GraphQL Query/Mutation/Subscription output type must be transformed into different section', () => {

  it('should transform scalar NOT nullable output type to section "output" with primitive schema', () => {
    const graphql = `
      type Query {
        test: String!
      }
    `
    const graphApi = buildGraphApi(graphql)

    expect(graphApi.queries).toBeTruthy()
    expect(graphApi.queries!.test).toEqual({
      output: {
        typeDef: { type: { kind: 'string' } },
        nullable: false
      }
    })
  })

  it('should transform scalar NULLABLE output type to section "output" with primitive schema', () => {
    const graphql = `
      type Query {
        test: String
      }
    `
    const graphApi = buildGraphApi(graphql)

    expect(graphApi.queries).toBeTruthy()
    expect(graphApi.queries!.test).toEqual({
      output: {
        typeDef: { type: { kind: 'string' } },
      }
    })
  })

  it('should transform objective NOT nullable output type to section "output" with objective schema', () => {
    const graphql = `
      type Query {
        test: Response!
      }
      
      type Response {
        id: ID!
        name: String!
      }
    `
    const graphApi = buildGraphApi(graphql)

    expect(graphApi.components?.objects).toBeTruthy()
    expect(graphApi.components!.objects!.Response).toEqual({
      title: 'Response',
      type: {
        kind: 'object',
        methods: {
          id: {
            output: {
              typeDef: { type: { kind: 'ID' } },
              nullable: false
            }
          },
          name: {
            output: {
              typeDef: { type: { kind: 'string' } },
              nullable: false
            }
          },
        }
      }
    })

    expect(graphApi.queries).toBeTruthy()
    expect(graphApi.queries!.test).toEqual({
      output: {
        typeDef: { $ref: '#/components/objects/Response' },
        nullable: false
      }
    })
  })

  it('should transform objective NULLABLE output type to section "output" with objective schema', () => {
    const graphql = `
      type Query {
        test: Response
      }
      
      type Response {
        id: ID!
        name: String!
      }
    `
    const graphApi = buildGraphApi(graphql)

    expect(graphApi.components?.objects).toBeTruthy()
    expect(graphApi.components!.objects!.Response).toEqual({
      title: 'Response',
      type: {
        kind: 'object',
        methods: {
          id: {
            output: {
              typeDef: { type: { kind: 'ID' } },
              nullable: false
            }
          },
          name: {
            output: {
              typeDef: { type: { kind: 'string' } },
              nullable: false
            }
          },
        }
      }
    })

    expect(graphApi.queries).toBeTruthy()
    expect(graphApi.queries!.test).toEqual({
      output: {
        typeDef: { $ref: '#/components/objects/Response' },
      },
    })
  })

  it('given query with description AND objective NOT nullable output type without description ' +
    'when transforms ' +
    'then GraphSchema with description, output fields AND output field is objective schema', () => {
      const graphql = `
      type Query {
        """Query Description"""
        test: Response!
      }
      
      type Response {
        id: ID!
        name: String!
      }
    `
      const graphApi = buildGraphApi(graphql)

      expect(graphApi.components?.objects).toBeTruthy()
      expect(graphApi.components!.objects!.Response).toEqual({
        title: 'Response',
        type: {
          kind: 'object',
          methods: {
            id: { output: { typeDef: { type: { kind: 'ID' } }, nullable: false } },
            name: { output: { typeDef: { type: { kind: 'string' } }, nullable: false } },
          }
        },
      })

      expect(graphApi.queries).toBeTruthy()
      expect(graphApi.queries!.test).toEqual({
        description: 'Query Description',
        output: {
          typeDef: { $ref: '#/components/objects/Response' },
          nullable: false
        }
      })
    })

  it('given query with description AND objective NULLABLE output type without description ' +
    'when transforms ' +
    'then GraphSchema with description, output fields AND output field is objective NULLABLE schema', () => {
      const graphql = `
        type Query {
          """Query Description"""
          test: Response
        }
        
        type Response {
          id: ID!
          name: String!
        }
      `
      const graphApi = buildGraphApi(graphql)

      expect(graphApi.components?.objects).toBeTruthy()
      expect(graphApi.components!.objects!.Response).toEqual({
        title: 'Response',
        type: {
          kind: 'object',
          methods: {
            id: { output: { typeDef: { type: { kind: 'ID' } }, nullable: false } },
            name: { output: { typeDef: { type: { kind: 'string' } }, nullable: false } },
          }
        },
      })

      expect(graphApi.queries).toBeTruthy()
      expect(graphApi.queries!.test).toEqual({
        description: 'Query Description',
        output: { typeDef: { $ref: '#/components/objects/Response' } }
      })
    })

  it('given query without description AND objective NOT nullable output type with description ' +
    'when transforms ' +
    'then GraphSchema without description, output fields AND output field is objective schema with description', () => {
      const graphql = `
        type Query {
          test: Response!
        }
        
        """Response Description"""
        type Response {
          id: ID!
          name: String!
        }
      `
      const graphApi = buildGraphApi(graphql)

      expect(graphApi.components?.objects).toBeTruthy()
      expect(graphApi.components!.objects!.Response).toEqual({
        title: 'Response',
        description: 'Response Description',
        type: {
          kind: 'object',
          methods: {
            id: { output: { typeDef: { type: { kind: 'ID' } }, nullable: false } },
            name: { output: { typeDef: { type: { kind: 'string' } }, nullable: false } },
          }
        }
      })

      expect(graphApi.queries).toBeTruthy()
      expect(graphApi.queries!.test).toEqual({
        output: {
          typeDef: { $ref: '#/components/objects/Response' },
          nullable: false
        }
      })
    })

  it('given query without description AND objective NULLABLE output type with description ' +
    'when transforms ' +
    'then GraphSchema without description, output fields AND output field is objective NULLABLE schema with description', () => {
      const graphql = `
      type Query {
        test: Response
      }
      
      """Response Description"""
      type Response {
        id: ID!
        name: String!
      }
    `
      const graphApi = buildGraphApi(graphql)

      expect(graphApi.components?.objects).toBeTruthy()
      expect(graphApi.components!.objects!.Response).toEqual({
        title: 'Response',
        description: 'Response Description',
        type: {
          kind: 'object',
          methods: {
            id: { output: { typeDef: { type: { kind: 'ID' } }, nullable: false } },
            name: { output: { typeDef: { type: { kind: 'string' } }, nullable: false } },
          }
        }
      })

      expect(graphApi.queries).toBeTruthy()
      expect(graphApi.queries!.test).toEqual({
        output: { typeDef: { $ref: '#/components/objects/Response' } }
      })
    })

  it('given query with description AND objective NOT nullable output type with description ' +
    'when transforms ' +
    'then GraphSchema with description, output fields AND output field is objective schema with description', () => {
      const graphql = `
      type Query {
        """Query Description"""
        test: Response!
      }
      
      """Response Description"""
      type Response {
        id: ID!
        name: String!
      }
    `
      const graphApi = buildGraphApi(graphql)

      expect(graphApi.components?.objects).toBeTruthy()
      expect(graphApi.components!.objects!.Response).toEqual({
        title: 'Response',
        description: 'Response Description',
        type: {
          kind: 'object',
          methods: {
            id: { output: { typeDef: { type: { kind: 'ID' } }, nullable: false } },
            name: { output: { typeDef: { type: { kind: 'string' } }, nullable: false } },
          }
        }
      })

      expect(graphApi.queries).toBeTruthy()
      expect(graphApi.queries!.test).toEqual({
        description: 'Query Description',
        output: {
          typeDef: { $ref: '#/components/objects/Response' },
          nullable: false
        }
      })
    })

  it('given query with description AND objective NULLABLE output type with description ' +
    'when transforms ' +
    'then GraphSchema with description, output fields AND output field is objective NULLABLE schema with description', () => {
      const graphql = `
      type Query {
        """Query Description"""
        test: Response
      }
      
      """Response Description"""
      type Response {
        id: ID!
        name: String!
      }
    `
      const graphApi = buildGraphApi(graphql)

      expect(graphApi.components?.objects).toBeTruthy()
      expect(graphApi.components!.objects!.Response).toEqual({
        title: 'Response',
        description: 'Response Description',
        type: {
          kind: 'object',
          methods: {
            id: { output: { typeDef: { type: { kind: 'ID' } }, nullable: false } },
            name: { output: { typeDef: { type: { kind: 'string' } }, nullable: false } },
          }
        }
      })

      expect(graphApi.queries).toBeTruthy()
      expect(graphApi.queries!.test).toEqual({
        description: 'Query Description',
        output: { typeDef: { $ref: '#/components/objects/Response' } }
      })
    })

  it('should recognize operations on 2nd level, separate props and methods of Object Type', () => {
    const graphql = `
      type Query {
        """Get message by its ID"""
        getMessage(id: ID!): Message
      }
      
      type Message {
        topic: String
        content: String
        user: ID!
        prettyString(msg: Message): String
      }
    `
    const graphApi = buildGraphApi(graphql)

    expect(graphApi.queries?.getMessage).toBeTruthy()
    expect(graphApi.queries!.getMessage!.description).toBe('Get message by its ID')
    expect(graphApi.queries!.getMessage!.args)
      .toEqual({ id: { typeDef: { type: { kind: 'ID' } }, nullable: false } })
    expect(graphApi.queries!.getMessage!.output)
      .toEqual({ typeDef: { $ref: '#/components/objects/Message' } })

    expect(graphApi.components?.objects).toBeTruthy()
    expect(graphApi.components!.objects!.Message).toEqual({
      title: 'Message',
      type: {
        kind: 'object',
        methods: {
          topic: { output: { typeDef: { type: { kind: 'string' } } } },
          content: { output: { typeDef: { type: { kind: 'string' } } } },
          user: { output: { typeDef: { type: { kind: 'ID' } }, nullable: false } },
          prettyString: {
            args: {
              msg: { typeDef: { $ref: '#/components/objects/Message' } },
            },
            output: { typeDef: { type: { kind: 'string' } } }
          }
        }
      }
    })
  })

  it('should recognize operations on random depth, separate props and methods of Object Type', () => {
    const graphql = `
      type Query {
        getLibrary: Library!
      }
      
      type Library {
        books: [Book!]!
        authors: [Author!]!
      }
      
      type Book {
        id: ID!
        title: String!
        description: String!
        writtenBy: Author
      }
      
      type Author {
        id: ID!
        user: Human!
      }
      
      type Human {
        firstName: String!
        middleName: String
        lastName: String
        nickName: String
        getInfo(type: String!): String!
      }
    `
    const graphApi = buildGraphApi(graphql)

    expect(graphApi.queries?.getLibrary).toEqual({
      output: {
        typeDef: { $ref: '#/components/objects/Library' },
        nullable: false
      }
    })
    expect(graphApi.components?.objects?.Human).toEqual({
      title: 'Human',
      type: {
        kind: 'object',
        methods: {
          firstName: { output: { typeDef: { type: { kind: 'string' } }, nullable: false } },
          middleName: { output: { typeDef: { type: { kind: 'string' } } } },
          lastName: { output: { typeDef: { type: { kind: 'string' } } } },
          nickName: { output: { typeDef: { type: { kind: 'string' } } } },
          getInfo: {
            args: {
              type: { typeDef: { type: { kind: 'string' } }, nullable: false }
            },
            output: { typeDef: { type: { kind: 'string' } }, nullable: false }
          }
        }
      },
    })
  })

  it('must NOT make duplicate for 2nd-level operation output when its NOT nullable', () => {
    const graphql = `
      type Query {
        one: One
        another: Another
      }
      
      type Same {
        id: ID!
      }
      
      type One {
        common(arg: String!): Same!
      }
      
      type Another {
        common(arg: String!): Same!
      }
    `
    const graphApi = buildGraphApi(graphql)

    expect(graphApi).toBeTruthy()

    const common1 = graphApi.components?.objects?.One?.type.methods?.common
    const common2 = graphApi.components?.objects?.Another?.type.methods?.common

    if (!isGraphApiOperation(common1) || !isGraphApiOperation(common2)) {
      fail('"common" is not an operation in at least one of outputs')
    }

    expect(common1.output).toEqual({
      typeDef: { $ref: '#/components/objects/Same' },
      nullable: false
    })
    expect(common2.output).toEqual({
      typeDef: { $ref: '#/components/objects/Same' },
      nullable: false
    })
    expect(graphApi?.components?.objects?.Same).toEqual({
      title: 'Same',
      type: {
        kind: 'object',
        methods: {
          id: { output: { typeDef: { type: { kind: 'ID' } }, nullable: false } },
        }
      }
    })
  })

  it('must NOT make duplicate for 2nd-level operation output when one of them NOT nullable, another - NULLABLE', () => {
    const graphql = `
      type Query {
        one: One
        another: Another
      }
      
      type Same {
        id: ID!
      }
      
      type One {
        common(arg: String!): Same!
      }
      
      type Another {
        common(arg: String!): Same
      }
    `
    const graphApi = buildGraphApi(graphql)

    expect(graphApi).toBeTruthy()

    const common1 = graphApi.components?.objects?.One?.type.methods?.common
    const common2 = graphApi.components?.objects?.Another?.type.methods?.common

    if (!isGraphApiOperation(common1) || !isGraphApiOperation(common2)) {
      fail('"common" is not an operation in at least one of outputs')
    }

    expect(common1.output).toEqual({
      typeDef: { $ref: '#/components/objects/Same' },
      nullable: false
    })
    expect(common2.output).toEqual({
      typeDef: { $ref: '#/components/objects/Same' },
    })
    expect(graphApi?.components?.objects?.Same).toEqual({
      title: 'Same',
      type: {
        kind: 'object',
        methods: {
          id: { output: { typeDef: { type: { kind: 'ID' } }, nullable: false } },
        }
      },
    })
  })
})