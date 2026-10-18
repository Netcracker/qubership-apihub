export const simpleOperation = {
  openapi: '3.0.0',
  paths: {
    '/pets/{id}/**': {
      get: {
        security: [
          {
            petstore_auth: ['write:pets', 'read:pets'],
          },
        ],
        description: 'Returns a user based on a single ID, if the user does not have access to the pet',
        operationId: 'find pet by id',
        parameters: [
          {
            name: 'id',
            in: 'path',
            description: 'ID of pet to fetch',
            required: true,
            schema: { type: 'integer', format: 'int64' },
          },
        ],
        requestBody: {
          description: 'Upload request to create SIM profiles',
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Pet',
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'pet response',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Pet' } } },
          },
          default: {
            description: 'unexpected error',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
          },
        },
      },
    },
  },
  components: {
    schemas: {
      Pet: {
        allOf: [
          { $ref: '#/components/schemas/NewPet' },
          {
            type: 'object',
            required: ['id'],
            properties: { id: { type: 'integer', format: 'int64' } },
          },
        ],
      },
      Error: {
        type: 'object',
        required: ['code', 'message'],
        properties: { code: { type: 'integer', format: 'int32' }, message: { type: 'string' } },
      },
      NewPet: {
        type: 'object',
        required: ['name'],
        properties: { name: { type: 'string' }, tag: { type: 'string' } },
      },
    },
    securitySchemes: {
      petstore_auth: {
        type: 'oauth2',
        flows: {
          implicit: {
            authorizationUrl: 'http://petstore.swagger.io/oauth/dialog',
            scopes: {
              'write:pets': 'modify pets in your account',
              'read:pets': 'read your pets',
            },
          },
        },
      },
      api_key: {
        type: 'apiKey',
        name: 'api_key',
        in: 'header',
      },
      token: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
      openID: {
        type: 'openIdConnect',
        openIdConnectUrl: 'http://petstore.swagger.io/oauth/dialog',
      },
    },
  },
};
