import { walkRestOperation } from './helpers'
import testIdPatch from './resources/test-id-patch.json'
import fn = jest.fn

describe('Bugs', () => {
  test('self cycle', async () => {
    const schemaStartCounter = fn()
    walkRestOperation(testIdPatch, {
      schemaRootStart: (ctx) => {
        schemaStartCounter()
        return !ctx.valueAlreadyVisited
      },
      schemaPropertyStart: (ctx) => {
        schemaStartCounter()
        return !ctx.valueAlreadyVisited
      },
      schemaItemsStart: (ctx) => {
        schemaStartCounter()
        return !ctx.valueAlreadyVisited
      },
      combinerStart: (ctx) => {
        schemaStartCounter()
        return !ctx.valueAlreadyVisited
      },
      combinerItemStart: (ctx) => {
        schemaStartCounter()
        return !ctx.valueAlreadyVisited
      },
    })
    expect(schemaStartCounter).toHaveBeenCalledTimes(8)
  })

  test('shared properties object', () => {
    const source = {
      openapi: '3.0.0',
      paths: {
        '/api/v1/test': {
          get: {
            responses: {
              '200': {
                content: {
                  'application/json': {
                    schema: {
                      type: 'array',
                      items: {
                        $ref: '#/components/schemas/Category',
                      },
                    },
                  },
                },
              },
              '201': {
                content: {
                  'application/json': {
                    schema: {
                      type: 'array',
                      items: {
                        $ref: '#/components/schemas/Category',
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      components: {
        schemas: {
          Category: {
            type: 'object',
            properties: {
              shouldVisitTwice: { type: 'number' },
            },
          },
        },
      },
    }

    const propertyNames: string[] = []
    walkRestOperation(source, {
      schemaRootStart: () => {
        return true
      },
      schemaPropertyStart: ({ propertyName }) => {
        propertyNames.push(propertyName)
        return true
      },
      schemaItemsStart: () => {
        return true
      },
    })

    expect(propertyNames).toEqual(['shouldVisitTwice', 'shouldVisitTwice'])
  })
})
