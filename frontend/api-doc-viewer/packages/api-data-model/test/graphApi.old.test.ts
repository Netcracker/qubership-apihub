
import { buildGraphApi, createGraphApiTreeForTests } from './helpers/graphql'

describe('old deprecated tests', () => {
  const jestConsole = console
  beforeEach(() => {
    global.console = require('console')
  })
  afterEach(() => {
    global.console = jestConsole
  })

  // Old tests
  describe('GraphAPI with separated args and output', () => {
    it('creates different nodes for "args" and "output"', () => {
      const graphql = `
        type Query {
          """Get book by its ID. Returns "null" if book is not found"""
          getBook(id: ID!): Book
        }
        
        """Data model represents a book"""
        type Book {
          id: ID!
          name: String!
          year: Int
          author: String
        }
      `
      const graphApi = buildGraphApi(graphql)

      const tree = createGraphApiTreeForTests(graphApi)
      const root = tree.root

      expect(root).toBeTruthy()

      const nodeGetBook = root!.children()?.find(node => node.kind === 'query')
      expect(nodeGetBook).not.toBe(null)

      expect(nodeGetBook!.value()).toMatchObject({
        description: 'Get book by its ID. Returns "null" if book is not found'
      })

      const args = nodeGetBook!.children()[0]
      const output = nodeGetBook!.children()[1]

      expect(args?.id).toBe('#/queries/getBook/args')
      expect(output?.id).toBe('#/queries/getBook/output')

      expect(args!.kind).toBe('args')
      expect(output!.kind).toBe('output')
      expect(output!.value()).toMatchObject({
        description: 'Data model represents a book'
      })

      const pathQuery = '#/queries/getBook'
      const pathOutputMethods = `${pathQuery}/output/typeDef/type/methods`
      expect(args!.children()?.[0]?.id).toBe(`${pathQuery}/args/id`)
      expect(output!.children()?.[0]?.id).toBe(`${pathOutputMethods}/id`)
      expect(output!.children()?.[1]?.id).toBe(`${pathOutputMethods}/name`)
      expect(output!.children()?.[2]?.id).toBe(`${pathOutputMethods}/year`)
      expect(output!.children()?.[3]?.id).toBe(`${pathOutputMethods}/author`)
    })

    it('supports array of objects in output', () => {
      const graphql = `
        type Query {
          getBooks: [Book!]!
        }
        
        """Data model represents a book"""
        type Book {
          id: ID!
          name: String!
          year: Int
          author: String
        }
      `
      const graphApi = buildGraphApi(graphql)

      const tree = createGraphApiTreeForTests(graphApi)

      const root = tree.root
      expect(root).not.toBe(null)

      const query = root!.children()[0]
      const pathToQuery = '#/queries/getBooks'
      expect(query?.id).toBe(pathToQuery)

      const output = query!.children()[0]
      const pathToOutput = `${pathToQuery}/output`
      expect(output?.id).toBe(pathToOutput)

      const items = output!.children()[0]
      const pathToItems = `${pathToOutput}/typeDef/type/items`
      const pathToItemsMethods = `${pathToItems}/typeDef/type/methods`
      expect(items!.children()?.length).toBe(4)
      expect(items!.children()![0].id).toBe(`${pathToItemsMethods}/id`)
      expect(items!.children()![0].children()[0]?.value()).toMatchObject({ type: 'ID', nullable: false })
      expect(items!.children()![1].id).toBe(`${pathToItemsMethods}/name`)
      expect(items!.children()![1].children()[0]?.value()).toMatchObject({ type: 'string', nullable: false })
      expect(items!.children()![2].id).toBe(`${pathToItemsMethods}/year`)
      expect(items!.children()![2].children()[0]?.value()).toMatchObject({ type: 'integer' })
      expect(items!.children()![3].id).toBe(`${pathToItemsMethods}/author`)
      expect(items!.children()![3].children()[0]?.value()).toMatchObject({ type: 'string' })
    })

    it('supports primitive union type in output (oneOf)', () => {
      const graphql = `
        type Mutation {
          asString: Union!
        }
        
        union Union = String | Boolean
      `
      const graphApi = buildGraphApi(graphql)
      const tree = createGraphApiTreeForTests(graphApi)

      const pathMutation = '#/mutations/asString'
      const pathOutput = `${pathMutation}/output`
      const pathOneOf = `${pathOutput}/typeDef/type/oneOf`
      expect(tree.root!.children()[0]?.id).toBe(pathMutation)
      expect(tree.root!.children()[0]?.children()[0]?.id).toBe(pathOutput)
      expect(tree.root!.children()[0]?.children()[0]?.nested[0]?.id).toBe(`${pathOneOf}/0`)
      expect(tree.root!.children()[0]?.children()[0]?.nested[0]?.value()).toMatchObject({ type: 'string' })
      expect(tree.root!.children()[0]?.children()[0]?.nested[1]?.id).toBe(`${pathOneOf}/1`)
      expect(tree.root!.children()[0]?.children()[0]?.nested[1]?.value()).toMatchObject({ type: 'boolean' })
    })

    it('supports complex union type in output (oneOf)', () => {
      const graphql = `
        type Query {
          getShape: Shape
        }
        
        type Circle {
          radius: Int!
        }
        
        type Square {
          size: Int!
        }
        
        union Shape = Circle | Square
      `
      const graphApi = buildGraphApi(graphql)
      const tree = createGraphApiTreeForTests(graphApi)

      const pathQuery = '#/queries/getShape'
      const pathOutput = `${pathQuery}/output`
      const pathOneOf = `${pathOutput}/typeDef/type/oneOf`
      expect(tree.root!.children()[0]?.id).toBe(pathQuery)
      expect(tree.root!.children()[0]?.children()[0]?.id).toBe(pathOutput)
      expect(tree.root!.children()[0]?.children()[0]?.nested[0]?.id).toBe(`${pathOneOf}/0`)
      expect(tree.root!.children()[0]?.children()[0]?.nested[0]?.value()).toMatchObject({ type: 'object', title: 'Circle' })
      expect(tree.root!.children()[0]?.children()[0]?.nested[0]?.children()[0]?.id).toBe(`${pathOneOf}/0/type/methods/radius`)
      expect(tree.root!.children()[0]?.children()[0]?.nested[0]?.children()[0]?.children()[0]?.value()).toMatchObject({ type: 'integer' })
      expect(tree.root!.children()[0]?.children()[0]?.nested[1]?.id).toBe(`${pathOneOf}/1`)
      expect(tree.root!.children()[0]?.children()[0]?.nested[1]?.value()).toMatchObject({ type: 'object', title: 'Square' })
      expect(tree.root!.children()[0]?.children()[0]?.nested[1]?.children()[0]?.id).toBe(`${pathOneOf}/1/type/methods/size`)
      expect(tree.root!.children()[0]?.children()[0]?.nested[1]?.children()[0]?.children()[0]?.value()).toMatchObject({ type: 'integer' })
    })
  })

  describe('GraphAPI with separated properties and methods', () => {
    it('creates different children for "properties" and "methods"', () => {
      const graphql = `
        type Query {
          """Get random book fro library. Returns "null" if no any books"""
          getRandomBook: Book
        }
        
        """Data model represents a book"""
        type Book {
          id: ID!
          name: String!
          year: Int
          author: String
          asString(pretty: Boolean!): String!
        }
      `
      const graphApi = buildGraphApi(graphql)

      const tree = createGraphApiTreeForTests(graphApi)
      const root = tree.root

      expect(root).toBeTruthy()

      const query = root!.children()?.find(node => node.kind === 'query')
      expect(query?.value()).toMatchObject({
        description: 'Get random book fro library. Returns "null" if no any books',
      })

      const args = query!.children().find(child => child.kind === 'args')
      const output = query!.children().find(child => child.kind === 'output')

      const pathToOutput = '#/queries/getRandomBook/output'
      expect(args).not.toBeDefined()
      expect(output?.id).toBe(pathToOutput)
      expect(output!.value()).toMatchObject({
        description: 'Data model represents a book',
      })

      const pathToOutputProps = `${pathToOutput}/typeDef/type/methods`
      expect(output!.children()?.[0]?.id).toBe(`${pathToOutputProps}/id`)
      expect(output!.children()?.[1]?.id).toBe(`${pathToOutputProps}/name`)
      expect(output!.children()?.[2]?.id).toBe(`${pathToOutputProps}/year`)
      expect(output!.children()?.[3]?.id).toBe(`${pathToOutputProps}/author`)
      expect(output!.children()?.[4]?.id).toBe(`${pathToOutputProps}/asString`)

      const asString = output!.children()![4]
      expect(asString!.children()[0]?.id)
        .toBe(`${pathToOutputProps}/asString/args`)
      expect(asString!.children()[0]?.children()?.[0]?.id)
        .toBe(`${pathToOutputProps}/asString/args/pretty`)
      expect(asString!.children()[1]?.id)
        .toBe(`${pathToOutputProps}/asString/output`)
      expect(asString!.children()[1]?.value())
        .toMatchObject({ type: 'string', nullable: false })
    })
  })
})
