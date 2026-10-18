export namespace DeprecatedOperations {
  export const WITHOUT_DEPRECATION = {
    openapi: '3.0.2',
    paths: {
      '/test': {
        post: {
          summary: 'Test',
          description: 'Test not deprecated operation',
          parameters: [
            {
              name: 'key',
              in: 'path',
              description: 'Entity ID'
            }
          ],
          response: {
            200: {
              content: {
                'application/json': {
                  type: 'object',
                  properties: {
                    key: {
                      type: 'string',
                      format: 'NCID'
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }

  export const WITH_DEPRECATION = {
    openapi: '3.0.2',
    paths: {
      '/test': {
        post: {
          summary: 'Test',
          description: 'Test not deprecated operation',
          deprecated: true,
          parameters: [
            {
              name: 'key',
              in: 'path',
              description: 'Entity ID'
            }
          ],
          response: {
            200: {
              content: {
                'application/json': {
                  type: 'object',
                  properties: {
                    key: {
                      type: 'string',
                      format: 'NCID'
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
}