export const apiAuthLocalBefore = {
  components: {
    schemas: {
      AuthResponse: {
        description: 'Auth response',
        properties: {
          token: {
            description: 'Bearer token',
            type: 'string',
          },
          user: {
            $ref: '#/components/schemas/User',
          },
        },
        required: ['token'],
        type: 'object',
      },
      ErrorResponse: {
        description: 'An error description',
        properties: {
          code: {
            description: 'Internal string error code. Mandatory in response.',
            type: 'string',
          },
          debug: {
            description:
              'The attribute contains debug details (e.g. stack-trace). Presented in the error response only on Dev/Test environments if corresponding logging level is enabled.',
            type: 'string',
          },
          message: {
            description: 'The attribute contains an error message.',
            type: 'string',
          },
          params: {
            description: 'Message parameters',
            example: {
              id: 12345,
              type: 'string',
            },
            type: 'object',
          },
          status: {
            description: 'HTTP Status Code',
            type: 'number',
          },
        },
        required: ['status', 'code', 'message'],
        type: 'object',
      },
      User: {
        description: 'User dictionary',
        properties: {
          avatarUrl: {
            description: 'Avatar of the user',
            format: 'URL',
            type: 'string',
          },
          id: {
            description: 'Login of the user',
            type: 'string',
          },
          name: {
            description: 'Name of the user',
            type: 'string',
          },
        },
        type: 'object',
      },
    },
  },
  openapi: '3.0.0',
  paths: {
    '/auth/local_added': {
      post: {
        description: 'Basic authentication',
        operationId: 'postAuthToken111',
        parameters: [
          {
            description: 'User login',
            in: 'header',
            name: 'login',
            schema: {
              type: 'string',
            },
          },
          {
            description: 'User password',
            in: 'header',
            name: 'password',
            schema: {
              type: 'string',
            },
          },
        ],
        responses: {
          '200': {
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/AuthResponse',
                },
              },
            },
            description: 'Successful operation',
          },
          '401': {
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
              },
            },
            description: 'Unauthorized',
          },
        },
        summary: 'Basic auth',
        tags: ['Auth'],
      },
    },
  },
  servers: [
    {
      description: 'Direct API call host',
      url: 'https://api.example.com/api/v1',
    },
    {
      description: 'Local server',
      url: 'http://localhost:3000',
    },
  ],
};

export const apiAuthLocalAfter = {
  components: {
    schemas: {
      AuthResponse: {
        description: 'Auth response',
        properties: {
          token: {
            description: 'Bearer token',
            type: 'string',
          },
          user: {
            $ref: '#/components/schemas/User',
          },
        },
        required: ['token'],
        type: 'object',
      },
      ErrorResponse: {
        description: 'An error description',
        properties: {
          code: {
            description: 'Internal string error code. Mandatory in response.',
            type: 'string',
          },
          debug: {
            description:
              'The attribute contains debug details (e.g. stack-trace). Presented in the error response only on Dev/Test environments if corresponding logging level is enabled.',
            type: 'string',
          },
          message: {
            description: 'The attribute contains an error message.',
            type: 'string',
          },
          params: {
            description: 'Message parameters',
            example: {
              id: 12345,
              type: 'string',
            },
            type: 'object',
          },
          status: {
            description: 'HTTP Status Code',
            type: 'number',
          },
        },
        required: ['status', 'code', 'message'],
        type: 'object',
      },
      User: {
        description: 'User dictionary',
        properties: {
          avatarUrl: {
            description: 'Avatar of the user',
            format: 'URL',
            type: 'string',
          },
          id: {
            description: 'Login of the user',
            type: 'string',
          },
          name: {
            description: 'Name of the user',
            type: 'string',
          },
        },
        type: 'object',
      },
    },
  },
  openapi: '3.0.0',
  paths: {
    '/auth/local': {
      post: {
        description: 'Basic authentication',
        operationId: 'postAuthToken',
        parameters: [
          {
            description: 'User login',
            in: 'header',
            name: 'login',
            schema: {
              type: 'string',
            },
          },
          {
            description: 'User password',
            in: 'header',
            name: 'password',
            schema: {
              type: 'string',
            },
          },
        ],
        responses: {
          '200': {
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/AuthResponse',
                },
              },
            },
            description: 'Successful operation',
          },
          '401': {
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
              },
            },
            description: 'Unauthorized',
          },
        },
        summary: 'Basic auth',
        tags: ['Auth'],
      },
    },
  },
  servers: [
    {
      description: 'Direct API call host',
      url: 'https://api.example.com/api/v1',
    },
    {
      description: 'Local server',
      url: 'http://localhost:3000',
    },
  ],
};
