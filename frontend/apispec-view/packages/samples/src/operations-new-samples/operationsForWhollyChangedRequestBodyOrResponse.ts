export namespace WhollyChangedRequestBodyOrResponse {
  export const HAS_RESPONSE_200_JSON_RESPONSE_301_XML = {
    openapi: '3.0.2',
    paths: {
      '/test': {
        post: {
          summary: 'Test',
          description: 'Test',
          responses: {
            200: {
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      first: { type: 'string' },
                      second: { type: 'number' }
                    }
                  }
                }
              }
            },
            301: {
              content: {
                'application/xml': {
                  schema: {
                    type: 'array',
                    items: {
                      type: 'boolean'
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

  export const HAS_RESPONSE_200_JSON = {
    openapi: '3.0.2',
    paths: {
      '/test': {
        post: {
          summary: 'Test',
          description: 'Test',
          responses: {
            200: {
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      first: { type: 'string' },
                      second: { type: 'number' }
                    }
                  }
                }
              }
            },
          }
        }
      }
    }
  }

  export const HAS_RESPONSE_200_JSON_RESPONSE_301_XML_JSON = {
    openapi: '3.0.2',
    paths: {
      '/test': {
        post: {
          summary: 'Test',
          description: 'Test',
          responses: {
            200: {
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      first: { type: 'string' },
                      second: { type: 'number' }
                    }
                  }
                }
              }
            },
            301: {
              content: {
                'application/xml': {
                  schema: {
                    type: 'array',
                    items: {
                      type: 'boolean',
                      description: 'Boolean array item',
                    }
                  }
                },
                'application/json': {
                  schema: {
                    type: 'array',
                    items: {
                      type: 'string',
                      description: 'String array item'
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

  export const HAS_RESPONSE_200_JSON_RESPONSE_301_XML_EMPTY_JSON = {
    openapi: '3.0.2',
    paths: {
      '/test': {
        post: {
          summary: 'Test',
          description: 'Test',
          responses: {
            200: {
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      first: { type: 'string' },
                      second: { type: 'number' }
                    }
                  }
                }
              }
            },
            301: {
              content: {
                'application/xml': {
                  schema: {
                    type: 'array',
                    items: {
                      type: 'boolean',
                      description: 'Boolean array item',
                    }
                  }
                },
                'application/json': {}
              }
            }
          }
        }
      }
    }
  }

  export const HAS_RESPONSE_200_JSON_RESPONSE_301_2_HEADERS = {
    openapi: '3.0.2',
    paths: {
      '/test': {
        post: {
          summary: 'Test',
          description: 'Test',
          responses: {
            200: {
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      first: { type: 'string' },
                      second: { type: 'number' }
                    }
                  }
                }
              }
            },
            301: {
              headers: {
                MyHeader: {
                  description: 'My header',
                  schema: {
                    type: 'object',
                    properties: {
                      first: { type: 'string' },
                      second: { type: 'number' }
                    }
                  }
                },
                MyAnotherHeader: {
                  description: 'My another header',
                  schema: {
                    type: 'array',
                    items: { type: 'boolean' }
                  }
                }
              }
            }
          }
        }
      }
    }
  }

  export const HAS_RESPONSE_200_JSON_RESPONSE_301_1_HEADER = {
    openapi: '3.0.2',
    paths: {
      '/test': {
        post: {
          summary: 'Test',
          description: 'Test',
          responses: {
            200: {
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      first: { type: 'string' },
                      second: { type: 'number' }
                    }
                  }
                }
              }
            },
            301: {
              headers: {
                MyAnotherHeader: {
                  description: 'My another header',
                  schema: {
                    type: 'array',
                    items: { type: 'boolean' }
                  }
                }
              }
            }
          }
        }
      }
    }
  }

  export const HAS_REQUEST_BODY_JSON_XML = {
    openapi: '3.0.2',
    paths: {
      '/test': {
        post: {
          summary: 'Test',
          description: 'Test',
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    first: { type: 'string' },
                    second: { type: 'number' }
                  }
                }
              },
              'application/xml': {
                schema: {
                  type: 'array',
                  items: {
                    type: 'boolean'
                  }
                }
              }
            }
          }
        }
      }
    }
  }

  export const HAS_REQUEST_BODY_XML_EMPTY_JSON = {
    openapi: '3.0.2',
    paths: {
      '/test': {
        post: {
          summary: 'Test',
          description: 'Test',
          requestBody: {
            content: {
              'application/json': {},
              'application/xml': {
                schema: {
                  type: 'array',
                  items: {
                    type: 'boolean'
                  }
                }
              }
            }
          }
        }
      }
    }
  }

  export const HAS_REQUEST_BODY_XML = {
    openapi: '3.0.2',
    paths: {
      '/test': {
        post: {
          summary: 'Test',
          description: 'Test',
          requestBody: {
            content: {
              'application/xml': {
                schema: {
                  type: 'array',
                  items: {
                    type: 'boolean'
                  }
                }
              }
            }
          }
        }
      }
    }
  }

  export const HAS_REQUEST_2_HEADERS_RESPONSE_200_JSON_RESPONSE_HEADERS = {
    openapi: '3.0.2',
    paths: {
      '/test': {
        post: {
          summary: 'Test',
          description: 'Test',
          parameters: [
            {
              name: 'first',
              in: 'header',
              schema: {
                type: 'boolean',
                description: 'Request header flag'
              }
            },
            {
              name: 'second',
              in: 'header',
              schema: {
                type: 'number',
                description: 'Request header index'
              }
            }
          ],
          responses: {
            200: {
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      first: { type: 'string' },
                      second: { type: 'number' }
                    }
                  }
                }
              }
            },
            301: {
              headers: {
                MyHeader: {
                  description: 'My header',
                  schema: {
                    type: 'object',
                    properties: {
                      first: { type: 'string' },
                      second: { type: 'number' }
                    }
                  }
                },
                MyAnotherHeader: {
                  description: 'My another header',
                  schema: {
                    type: 'array',
                    items: { type: 'boolean' }
                  }
                }
              }
            }
          }
        }
      }
    }
  }

  export const HAS_REQUEST_3_HEADERS_RESPONSE_200_JSON_RESPONSE_HEADERS = {
    openapi: '3.0.2',
    paths: {
      '/test': {
        post: {
          summary: 'Test',
          description: 'Test',
          parameters: [
            {
              name: 'first',
              in: 'header',
              schema: {
                type: 'boolean',
                description: 'Request header flag'
              }
            },
            {
              name: 'third',
              in: 'header',
              schema: {
                type: 'string',
                description: 'Request header key'
              }
            },
            {
              name: 'second',
              in: 'header',
              schema: {
                type: 'number',
                description: 'Request header index'
              }
            },
          ],
          responses: {
            200: {
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      first: { type: 'string' },
                      second: { type: 'number' }
                    }
                  }
                }
              }
            },
            301: {
              headers: {
                MyHeader: {
                  description: 'My header',
                  schema: {
                    type: 'object',
                    properties: {
                      first: { type: 'string' },
                      second: { type: 'number' }
                    }
                  }
                },
                MyAnotherHeader: {
                  description: 'My another header',
                  schema: {
                    type: 'array',
                    items: { type: 'boolean' }
                  }
                }
              }
            }
          }
        }
      }
    }
  }

  export const EMPTY_OPERATION = {
    openapi: '3.0.2',
    paths: {
      '/test': {
        post: {
          summary: 'Test',
          description: 'Test',
        }
      }
    }
  }
}