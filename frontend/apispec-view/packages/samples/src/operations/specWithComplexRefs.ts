export const specWithComplexRefs = {
  openapi: '3.0.1',
  info: {
    title: 'FOO',
    version: '1.0.0',
  },
  paths: {
    '/foo': {
      get: {
        requestBody: {
          $ref: '#/components/requestBodies/foo',
        },
        responses: {
          default: {
            $ref: '#/components/responses/foo',
          },
        },
      },
    },
  },
  components: {
    schemas: {
      foo: {
        type: 'string',
        description: 'I am visible, actually...',
      },
    },
    requestBodies: {
      foo: {
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/foo',
            },
          },
        },
      },
    },
    responses: {
      foo: {
        description: '',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/foo',
            },
          },
        },
      },
    },
  },
};
