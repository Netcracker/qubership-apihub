export const openapiSample = {
  openapi: '3.0.1',
  info: {
    title: 'Bulk API',
    description: 'Description',
    version: '1.1',
    contact: {},
    license: {
      name: 'Apache 2.0',
      url: 'http://www.apache.org/licenses/LICENSE-2.0',
    },
  },
  servers: [
    {
      url: 'http://{server}',
      variables: {
        server: {
          'default': 'server:port',
        },
      },
    },
  ],
  paths: {
    '/api/first/{first}/second/{second}': {
      post: {
        operationId: 'myOperation',
        parameters: [
          {
            name: 'first',
            'in': 'path',
            required: true,
            schema: {
              type: 'string',
            },
          },
          {
            name: 'second',
            'in': 'path',
            required: true,
            schema: {
              type: 'string',
            },
          },
        ],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/RequestBodyEntity',
              },
            },
          },
          required: true,
        },
        responses: {
          '200': {
            description: 'OK',
            content: {
              '*/*': {
                schema: {
                  type: 'object',
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
      RequestBodyEntity: {
        type: 'object',
        properties: {
          first: {
            type: 'string',
          },
          second: {
            type: 'array',
            items: {
              $ref: '#/components/schemas/FirstEntity',
            },
          },
          third: {
            type: 'array',
            items: {
              $ref: '#/components/schemas/SecondEntity',
            },
          },
        },
      },
      FirstEntity: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
          },
          values: {
            type: 'array',
            items: {
              type: 'string',
            },
          },
        },
      },
      SecondEntity: {
        type: 'object',
        properties: {
          type: {
            type: 'string',
          },
          defaultValue: {
            type: 'string',
          },
          additionalValue: {
            type: 'array',
            items: {
              type: 'string',
            },
          },
        },
      },
    },
  },
}

export const openapiChangedSample = {
  openapi: '3.0.1',
  info: {
    title: 'Bulk API',
    description: 'CHANGED description with looooooooooooooooooooong text in there',
    version: '1.1',
    contact: {},
    license: {
      name: 'Apache 2.0',
      url: 'http://www.apache.org/licenses/LICENSE-2.0',
    },
  },
  servers: [
    {
      url: 'http://{server}',
      variables: {
        server: {
          'default': 'server:port',
        },
      },
    },
  ],
  paths: {
    '/api/first/{first}/second/{second}': {
      post: {
        operationId: 'myOperation',
        parameters: [
          {
            name: 'id',
            'in': 'query',
            required: true,
            schema: {
              type: 'number',
            },
          },
          {
            name: 'first',
            'in': 'path',
            required: true,
            schema: {
              type: 'string',
            },
          },
          {
            name: 'second',
            'in': 'path',
            required: true,
            schema: {
              type: 'string',
            },
          },
        ],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/RequestBodyEntity',
              },
            },
          },
          required: true,
        },
        responses: {
          '200': {
            description: 'OK',
            content: {
              '*/*': {
                schema: {
                  type: 'object',
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
      RequestBodyEntity: {
        type: 'object',
        required: ['first'],
        properties: {
          first: {
            type: 'number',
          },
          second: {
            type: 'array',
            items: {
              $ref: '#/components/schemas/FirstEntity',
            },
          },
          third: {
            type: 'number',
          },
        },
      },
      FirstEntity: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
          },
          values: {
            type: 'array',
            items: {
              type: 'string',
            },
          },
        },
      },
      SecondEntity: {
        type: 'object',
        properties: {
          type: {
            type: 'string',
          },
          defaultValue: {
            type: 'string',
          },
          additionalValue: {
            type: 'array',
            items: {
              type: 'string',
            },
          },
        },
      },
    },
  },
}
