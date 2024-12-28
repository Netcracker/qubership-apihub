import YAML from 'js-yaml'

import { buildSchema, getIntrospectionQuery, graphqlSync } from 'graphql'
import { buildFromIntrospection, buildFromSchema, GRAPH_API_VERSION } from '../src'
import { loadFile } from './helpers/load-file'
import { graphapi } from './helpers/build-graphApi'

describe('Build GraphApi', () => {
  it('should be nullable query for Scalar result', () => {
    const raw = `
      type Query {
        "A Query with 1 required argument and 1 optional argument"
        todo(
          id: ID!
      
          "A default value of false"
          isCompleted: Boolean = false
        ): String
      }
    `
    const graphapi = buildFromSchema(buildSchema(raw, { noLocation: true }))

    expect(graphapi.queries!.todo.output).toEqual({ typeDef: { type: { kind: 'string' } } })
  })

  it('should build graphapi from graphql schema', async () => {
    const source = loadFile('example.graphql')
    const schema = buildSchema(source, { noLocation: true })
    const graphapi = buildFromSchema(schema)

    const example = YAML.load(loadFile('example.yaml')) as object

    expect(graphapi).toMatchObject(example)
  })

  it.skip('should build graphapi from introspection', async () => {
    const source = loadFile('example.graphql')
    const schema = buildSchema(source, { noLocation: true, })
    const introspection: any = graphqlSync({
      schema,
      source: getIntrospectionQuery({ inputValueDeprecation: true, schemaDescription: true, specifiedByUrl: true })
    }).data
    const graphapi = buildFromIntrospection(introspection)

    const example = YAML.load(loadFile('example.yaml')) as any

    delete example.queries.todos.directives

    expect(graphapi).toMatchObject(example)
  })

  it('no components in GraphAPI', () => {
    const graphApi = graphapi`
      type Query {
        test: String
      }
    `
    expect(graphApi).toEqual({
      graphapi: GRAPH_API_VERSION,
      queries: {
        test: {
          output: {
            typeDef: { type: { kind: 'string' } }
          }
        }
      }
    })
  })
})
