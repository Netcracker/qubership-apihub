import { hash } from '../../src/hash'
import {
  convertOriginToHumanReadable,
  denormalize,
  JSON_SCHEMA_NODE_SYNTHETIC_TYPE_ANY,
  JSON_SCHEMA_NODE_SYNTHETIC_TYPE_NOTHING,
  normalize,
  NormalizeOptions,
} from '../../src'
import { TEST_HASH_FLAG, TEST_INLINE_REFS_FLAG, TEST_ORIGINS_FLAG, TEST_SYNTHETIC_TITLE_FLAG } from '../helpers'

describe('e2e', () => {
  it('resolve type after all', () => {
    const schema = {
      allOf: [
        {
          oneOf: [
            {
              description: 'case 1',
              allOf: [
                { format: 'not-my' },
                { minimum: 42 },
              ],
            },
            {
              description: 'case 2',
              format: 'my',
            },
          ],
        },
      ],
    }
    const result = normalize(schema, {
      validate: true,
      unify: true,
      liftCombiners: true,
    })
    expect(result).toMatchObject({
      oneOf: [
        {
          anyOf: [
            //should or not add type: 'string' in case minimum?
            //If the instance is a number, then this keyword validates only if the instance is greater than or exactly equal to "minimum". - spec told that minimum only applicable for type number
            {
              format: 'not-my',
              description: 'case 1',
              type: 'string',
            },
            {
              format: 'not-my',
              minimum: 42,
              description: 'case 1',
              type: 'number',
            },
            {
              format: 'not-my',
              minimum: 42,
              description: 'case 1',
              type: 'integer',
            },
          ],
        },
        {
          anyOf: [
            {
              description: 'case 2',
              format: 'my',
              type: 'string',
            },
            {
              description: 'case 2',
              format: 'my',
              type: 'number',
            },
            {
              description: 'case 2',
              format: 'my',
              type: 'integer',
            },
          ],
        },
      ],
    })
  })

  it('infinity oneOf item ($ref, single item)', () => {
    const source = {
      definitions: {
        treeItem: {
          type: 'string',
          readOnly: true,
          oneOf: [
            { $ref: '#/definitions/treeItem' },
            { type: 'null' },
          ],
        },
      },
    }
    const originalSchema = {
      $ref: '#/definitions/treeItem',
    }
    const actualSchema = normalize(originalSchema, {
      source: source,
      validate: true,
      unify: true,
      liftCombiners: true,
      syntheticTitleFlag: TEST_SYNTHETIC_TITLE_FLAG,
      allowNotValidSyntheticChanges: true,
    })
    const expectedSchema = {
      oneOf: [
        { oneOf: null as unknown },
        { type: JSON_SCHEMA_NODE_SYNTHETIC_TYPE_NOTHING, title: 'treeItem', [TEST_SYNTHETIC_TITLE_FLAG]: true },
      ],
    }
    expectedSchema.oneOf[0].oneOf = expectedSchema.oneOf
    expect(actualSchema).toEqual(expectedSchema)
  })

  it('infinity oneOf item ($ref, compatible items)', () => {
    const source = {
      definitions: {
        treeItem: {
          type: 'string',
          maxLength: 999,
          oneOf: [
            { $ref: '#/definitions/treeItem' },
            { minLength: 1 },
          ],
        },
      },
    }
    const originalSchema = {
      $ref: '#/definitions/treeItem',
    }
    const actualSchema = normalize(originalSchema, {
      source: source,
      validate: true,
      unify: true,
      liftCombiners: true,
      syntheticTitleFlag: TEST_SYNTHETIC_TITLE_FLAG,
    })
    const expectedSchema = {
      oneOf: [
        { oneOf: null as unknown },
        {
          title: 'treeItem',
          type: 'string',
          maxLength: 999,
          minLength: 1,
          readOnly: false,
          writeOnly: false,
          deprecated: false,
          [TEST_SYNTHETIC_TITLE_FLAG]: true,
        },
      ],
    }
    expectedSchema.oneOf[0].oneOf = expectedSchema.oneOf
    expect(actualSchema).toEqual(expectedSchema)
  })

  it('infinity oneOf item property', () => {
    const schema = {
      $ref: '#/definitions/treeItem',
    }
    const result = normalize(schema, {
      source: {
        definitions: {
          treeItem: {
            readonly: true,
            oneOf: [
              {
                title: 'Item',
                properties: {
                  parent: { $ref: '#/definitions/treeItem' },
                },
                additionalProperties: { type: 'null' },
              },
              {
                title: 'Empty',
                type: 'null',
              },
            ],
          },
        },
      },
      validate: true,
      unify: true,
      liftCombiners: true,
      syntheticTitleFlag: TEST_SYNTHETIC_TITLE_FLAG,
    })

    const expected = {
      oneOf: [
        {
          title: 'Item',
          properties: {
            get parent() { return expected },
          },
          type: 'object',
          additionalProperties: {
            type: 'null',
            readOnly: false,
            writeOnly: false,
            deprecated: false,
          },
          minProperties: 0,
          patternProperties: {},
          required: [],
          readOnly: false,
          writeOnly: false,
          deprecated: false,
        },
        {
          title: 'Empty',
          type: 'null',
          readOnly: false,
          writeOnly: false,
          deprecated: false,
        },
      ],
    }
    expect(result).toEqual(expected)
  })

  describe('denormalize normalized', () => {
    const options: NormalizeOptions = {
      unify: true,
      liftCombiners: true,
      syntheticTitleFlag: TEST_SYNTHETIC_TITLE_FLAG,
      validate: true,
      hashFlag: TEST_HASH_FLAG,
      inlineRefsFlag: TEST_INLINE_REFS_FLAG
    }
    it('pure schema', () => {
      const initial = {
        type: 'object',
        description: 'description',
      }
      const intermediate = normalize(initial, options)
      const result = denormalize(intermediate, options)

      expect(result).toEqual(initial)
    })

    it('oas. schema', () => {
      const initial = {
        openapi: '3.0.1',
        components: {
          schemas: {
            null: {
              nullable: true,
            },
          },
        },
      }
      const intermediate = normalize(initial, options)
      const result = denormalize(intermediate, options)

      expect(result).toEqual(/*should be initial but*/initial)
    })

    it('oas. items', () => {
      const initial = {
        openapi: '3.0.1',
        components: {
          schemas: {
            null: {
              items: {
                nullable: true,
              },
            },
          },
        },
      }
      const intermediate = normalize(initial, options)
      const result = denormalize(intermediate, options)

      expect(result).toEqual({
        openapi: '3.0.1',
        components: {
          schemas: {
            null: {
              type: 'array',
              items: {
                nullable: true,
              },
            },
          },
        },
      })
    })

    it('oas. additionalProperties', () => {
      const initial = {
        openapi: '3.0.1',
        components: {
          schemas: {
            null: {
              additionalProperties: {
                nullable: true,
              },
            },
          },
        },
      }
      const intermediate = normalize(initial, options)
      const result = denormalize(intermediate, options)

      expect(result).toEqual({
        openapi: '3.0.1',
        components: {
          schemas: {
            null: {
              type: 'object',
              additionalProperties: {
                nullable: true,
              },
            },
          },
        },
      })
    })

    it('oas. response', () => {
      const initial = {
        openapi: '3.0.1',
        paths: {
          test: {
            get: {
              summary: 'Test',
              description: 'Test Operation Description',
              responses: {
                Referenced: {
                  description: 'referenced',
                },
              },
            },
          },
        },
      }
      const intermediate = normalize(initial, options)
      const result = denormalize(intermediate, options)

      expect(intermediate).toHaveProperty(['paths', 'test', 'get', 'responses', 'Referenced', 'headers'], {})
      expect(result).toEqual(initial)
    })

    it('oas. parameters', () => {
      const initial = {
        openapi: '3.0.1',
        paths: {
          test: {
            get: {
              summary: 'Test',
              description: 'Test Operation Description',
              parameters: [
                {
                  description: 'Parameter description',
                },
              ],
            },
          },
        },
      }
      const intermediate = normalize(initial, options)
      const result = denormalize(intermediate, options)

      expect(intermediate).toHaveProperty(['paths', 'test', 'get', 'parameters', 0, 'examples'], {})
      expect(result).toEqual(initial)
    })

    it('oas. headers', () => {
      const initial = {
        openapi: '3.0.1',
        paths: {
          test: {
            get: {
              summary: 'Test',
              description: 'Test Operation Description',
              responses: {
                Referenced: {
                  description: 'referenced',
                  headers: {
                    header: {},
                  },
                },
              },
            },
          },
        },
      }
      const intermediate = normalize(initial, options)
      const result = denormalize(intermediate, options)

      expect(intermediate).toHaveProperty(['paths', 'test', 'get', 'responses', 'Referenced', 'headers', 'header', 'examples'], {})
      expect(result).toEqual(initial)
    })

    it('oas. media type', () => {
      const initial = {
        openapi: '3.0.1',
        paths: {
          test: {
            get: {
              summary: 'Test',
              description: 'Test Operation Description',
              responses: {
                Referenced: {
                  description: 'referenced',
                  content: {
                    mediaType: {},
                  },
                },
              },
            },
          },
        },
      }
      const intermediate = normalize(initial, options)
      const result = denormalize(intermediate, options)

      expect(intermediate).toHaveProperty(['paths', 'test', 'get', 'responses', 'Referenced', 'content', 'mediaType', 'examples'], {})
      expect(intermediate).toHaveProperty(['paths', 'test', 'get', 'responses', 'Referenced', 'content', 'mediaType', 'encoding'], {})
      expect(result).toEqual(initial)
    })

    it('oas. encoding', () => {
      const initial = {
        openapi: '3.0.1',
        paths: {
          test: {
            get: {
              summary: 'Test',
              description: 'Test Operation Description',
              responses: {
                Referenced: {
                  description: 'referenced',
                  content: {
                    mediaType: {
                      encoding: {
                        encodingPath: {},
                      },
                    },
                  },
                },
              },
            },
          },
        },
      }
      const intermediate = normalize(initial, options)
      const result = denormalize(intermediate, options)

      expect(intermediate).toHaveProperty(['paths', 'test', 'get', 'responses', 'Referenced', 'content', 'mediaType', 'encoding', 'encodingPath', 'headers'], {})
      expect(result).toEqual(initial)
    })

    it('oas. $ref', () => {
      const initial = {
        openapi: '3.0.1',
        paths: {
          test: {
            get: {
              summary: 'Test',
              description: 'Test Operation Description',
              responses: {
                Reuse: {
                  $ref: '#/components/responses/Shared'
                }
              },
            },
          },
        },
        components: {
          responses: {
            Shared: {
              description: 'referenced',
              content: {},
            }
          }
        }
      }
      const intermediate = normalize(initial, options)
      const result = denormalize(intermediate, options)
      const expected = {
        openapi: '3.0.1',
        paths: {
          test: {
            get: {
              summary: 'Test',
              description: 'Test Operation Description',
              responses: {
                Reuse: {
                  description: 'referenced',
                  content: {},
                }
              },
            },
          },
        },
        components: {
          responses: {
            Shared: {
              description: 'referenced',
              content: {},
            }
          }
        }
      }
      expect(intermediate).toHaveProperty(['components', 'responses', 'Shared', TEST_INLINE_REFS_FLAG], ['#/components/responses/Shared'])
      expect(result).toEqual(expected)
    })
  })

  it('parameter should not add title during dereference', () => {
    const schema = {
      openapi: '3.0.0',
      paths: {
        test: {
          get: {
            summary: 'Test',
            description: 'Test Operation Description',
            parameters: [
              {
                $ref: '#/components/parameters/Referenced',
              },
            ],
            responses: {
              reference: {
                $ref: '#/components/responses/Referenced',
              },
            },
            requestBody: {
              $ref: '#/components/requestBodies/Referenced',
            },
          },
        },
      },
      components: {
        responses: {
          Referenced: {
            description: 'referenced',
            headers: {
              reference: {
                $ref: '#/components/headers/Referenced',
              },
            },
            links: {
              reference: {
                $ref: '#/components/links/Referenced',
              },
            },
          },
        },
        requestBodies: {
          Referenced: {
            description: 'referenced',
          },
        },
        examples: {
          Referenced: {
            description: 'referenced',
          },
        },
        headers: {
          Referenced: {
            description: 'referenced',
            examples: {
              reference: {
                $ref: '#/components/examples/Referenced',
              },
            },
          },
        },
        links: {
          Referenced: {
            description: 'referenced',
          },
        },
        parameters: {
          Referenced: {
            name: 'referenced',
            in: 'header',
            schema: {
              type: 'number',
            },
          },
        },
      },
    }
    const result = normalize(schema, {
      validate: true,
      syntheticTitleFlag: Symbol('should-never-be'),
    })
    const expected =
    {
      openapi: '3.0.0',
      paths: {
        test: {
          get: {
            summary: 'Test',
            description: 'Test Operation Description',
            parameters: [null as any],
            responses: {
              reference: null as any,
            },
            requestBody: null as any,
          },
        },
      },
      components: {
        responses: {
          Referenced: {
            description: 'referenced',
            headers: {
              reference: null as any,
            },
            links: {
              reference: null as any,
            },
          },
        },
        requestBodies: {
          Referenced: {
            description: 'referenced',
          },
        },
        examples: {
          Referenced: {
            description: 'referenced',
          },
        },
        headers: {
          Referenced: {
            description: 'referenced',
            examples: {
              reference: null as any,
            },
          },
        },
        links: {
          Referenced: {
            description: 'referenced',
          },
        },
        parameters: {
          Referenced: {
            name: 'referenced',
            in: 'header',
            schema: {
              type: 'number',
            },
          },
        },
      },
    }
    expected.paths.test.get.parameters[0] = expected.components.parameters.Referenced
    expected.paths.test.get.responses.reference = expected.components.responses.Referenced
    expected.paths.test.get.requestBody = expected.components.requestBodies.Referenced
    expected.components.responses.Referenced.headers.reference = expected.components.headers.Referenced
    expected.components.responses.Referenced.links.reference = expected.components.links.Referenced
    expected.components.headers.Referenced.examples.reference = expected.components.examples.Referenced

    expect(result).toEqual(expected)
  })

  it('type=null non allowed on openapi 3.0', () => {
    const opt: NormalizeOptions = {
      validate: true,
      unify: true,
      liftCombiners: true,
    }
    const source = {
      openapi: '3.0.1',
      components: {
        schemas: {
          null: {
            nullable: true,
          },
        },
      },
    }
    const result = normalize(source, opt)
    const any: Record<PropertyKey, unknown> = {
      anyOf: [
        { nullable: false, readOnly: false, writeOnly: false, deprecated: false, type: 'boolean' },
        { nullable: false, readOnly: false, writeOnly: false, deprecated: false, type: 'string', minLength: 0 },
        {
          nullable: false,
          readOnly: false,
          writeOnly: false,
          deprecated: false,
          exclusiveMaximum: false,
          exclusiveMinimum: false,
          type: 'number',
        },
        {
          nullable: false,
          readOnly: false,
          writeOnly: false,
          deprecated: false,
          exclusiveMaximum: false,
          exclusiveMinimum: false,
          type: 'integer',
        },
        {
          nullable: false,
          readOnly: false,
          writeOnly: false,
          deprecated: false,
          minProperties: 0,
          type: 'object',
          properties: {},
          required: [],
          get additionalProperties() { return any },
        },
        {
          nullable: false,
          readOnly: false,
          writeOnly: false,
          deprecated: false,
          minItems: 0,
          uniqueItems: false,
          type: 'array',
          get items() { return any },
        },
      ],
    }
    const expected = {
      openapi: '3.0.1',
      paths: {},
      components: {
        securitySchemes: {},
        examples: {},
        headers: {},
        links: {},
        parameters: {},
        requestBodies: {},
        responses: {},
        schemas: {
          null: {
            anyOf: [
              { nullable: true, readOnly: false, writeOnly: false, deprecated: false, type: 'boolean' },
              { nullable: true, readOnly: false, writeOnly: false, deprecated: false, type: 'string', minLength: 0 },
              {
                nullable: true,
                readOnly: false,
                writeOnly: false,
                deprecated: false,
                exclusiveMaximum: false,
                exclusiveMinimum: false,
                type: 'number',
              },
              {
                nullable: true,
                readOnly: false,
                writeOnly: false,
                deprecated: false,
                exclusiveMaximum: false,
                exclusiveMinimum: false,
                type: 'integer',
              },
              {
                nullable: true,
                readOnly: false,
                writeOnly: false,
                deprecated: false,
                type: 'object',
                minProperties: 0,
                properties: {},
                required: [],
                additionalProperties: any,
              },
              {
                nullable: true,
                readOnly: false,
                writeOnly: false,
                deprecated: false,
                minItems: 0,
                uniqueItems: false,
                type: 'array',
                items: any,
              },
            ],
          },
        },
      },
    }
    expect(result).toEqual(expected)
  })

  it('detect dirty {}. Synthetic', () => {
    const customSymbol = Symbol('custom')
    const result = normalize({
      description: 'anything',
      [customSymbol]: true,
    }, { unify: true, allowNotValidSyntheticChanges: true })
    expect(result).toMatchObject({
      description: 'anything',
      [customSymbol]: true,
      type: JSON_SCHEMA_NODE_SYNTHETIC_TYPE_ANY,
    })
  })

  it('detect pure {}. case {}. Synthetic', () => {
    const customSymbol = Symbol('custom')
    const result = normalize({ [customSymbol]: true }, { unify: true, allowNotValidSyntheticChanges: true })
    const expected = {
      [customSymbol]: true,
      type: JSON_SCHEMA_NODE_SYNTHETIC_TYPE_ANY,
    } as const
    expect(result).toMatchObject(expected)
  })

  it('detect pure {}. case true. Synthetic', () => {
    const result = normalize({ additionalProperties: true }, { unify: true, allowNotValidSyntheticChanges: true })
    const expected = {
      type: 'object',
      additionalProperties: {
        type: JSON_SCHEMA_NODE_SYNTHETIC_TYPE_ANY,
      },
    } as const
    expect(result).toMatchObject(expected)
  })

  it('detect pure {}. case false. Synthetic', () => {
    const result = normalize({ additionalProperties: false }, { unify: true, allowNotValidSyntheticChanges: true })
    const expected = {
      type: 'object',
      additionalProperties: {
        type: JSON_SCHEMA_NODE_SYNTHETIC_TYPE_NOTHING,
      },
    } as const
    expect(result).toMatchObject(expected)
  })

  it('openapi defaults', () => {
    const schema = {
      openapi: '3.0.0',
      paths: {
        test: {
          get: {
            parameters: [
              { name: 'parameter', in: 'path' },
            ],
            responses: {
              200: {
                description: '',
                headers: {
                  hhh: {
                    description: 'header',
                  },
                },
              },
            },
          },
        },
      },
    }
    const result = normalize(schema, {
      validate: true,
      unify: true,
    })
    expect(result).toHaveProperty(['paths', 'test', 'get', 'parameters', 0, 'deprecated'], false)
    expect(result).toHaveProperty(['paths', 'test', 'get', 'parameters', 0, 'required'], false)
    expect(result).toHaveProperty(['paths', 'test', 'get', 'parameters', 0, 'allowEmptyValue'], false)
    expect(result).toHaveProperty(['paths', 'test', 'get', 'parameters', 0, 'allowReserved'], false)
    expect(result).toHaveProperty(['paths', 'test', 'get', 'tags'], [])
    expect(result).toHaveProperty(['paths', 'test', 'get', 'responses', 200, 'headers', 'hhh', 'deprecated'], false)
    expect(result).toHaveProperty(['paths', 'test', 'get', 'responses', 200, 'headers', 'hhh', 'required'], false)
    expect(result).toHaveProperty(['paths', 'test', 'get', 'responses', 200, 'headers', 'hhh', 'allowEmptyValue'], false)
    expect(result).toHaveProperty(['paths', 'test', 'get', 'responses', 200, 'headers', 'hhh', 'allowReserved'], false)
  })

  it('merge path with method', () => {
    const schema = {
      openapi: '3.0.0',
      paths: {
        test: {
          summary: 'Path Summary',
          description: 'Path Description',
          parameters: [
            { name: 'path parameter', in: 'path' },
          ],
          servers: [
            { description: 'path server' },
          ],
          get: {
            summary: 'Get Summary',
            description: 'Get Description',
            parameters: [
              { name: 'get parameter', in: 'path' },
            ],
            servers: [
              { description: 'get server' },
            ],
          },
          delete: {},
        },
      },
    }
    const result = normalize(schema, {
      validate: true,
      unify: true,
      originsFlag: TEST_ORIGINS_FLAG,
    }) as any

    expect(result).not.toHaveProperty(['paths', 'test', 'summary'])
    expect(result).not.toHaveProperty(['paths', 'test', 'description'])
    expect(result).not.toHaveProperty(['paths', 'test', 'parameters'])
    expect(result).not.toHaveProperty(['paths', 'test', 'servers'])

    expect(result).toHaveProperty(['paths', 'test', 'get', 'summary'], 'Get Summary')
    expect(result).toHaveProperty(['paths', 'test', 'get', 'description'], 'Get Description')
    expect(result).toHaveProperty(['paths', 'test', 'get', 'parameters'], expect.arrayContaining([
      expect.objectContaining({ name: 'get parameter', in: 'path' }),
      expect.objectContaining({ name: 'path parameter', in: 'path' }),
    ]))
    expect(result).toHaveProperty(['paths', 'test', 'get', 'servers'], expect.arrayContaining([
      expect.objectContaining({ description: 'get server' }),
      expect.objectContaining({ description: 'path server' }),
    ]))

    expect(result).toHaveProperty(['paths', 'test', 'delete', 'summary'], 'Path Summary')
    expect(result).toHaveProperty(['paths', 'test', 'delete', 'description'], 'Path Description')
    expect(result).toHaveProperty(['paths', 'test', 'delete', 'parameters'], expect.arrayContaining([
      expect.objectContaining({ name: 'path parameter', in: 'path' }),
    ]))
    expect(result).toHaveProperty(['paths', 'test', 'delete', 'servers'], expect.arrayContaining([
      expect.objectContaining({ description: 'path server' }),
    ]))

    expect(result).toHaveProperty(['paths', 'test', TEST_ORIGINS_FLAG, 'get'])
    expect(result).toHaveProperty(['paths', 'test', TEST_ORIGINS_FLAG, 'delete'])

    expect(result).toHaveProperty(['paths', 'test', 'get', TEST_ORIGINS_FLAG, 'summary'])
    expect(result).toHaveProperty(['paths', 'test', 'get', TEST_ORIGINS_FLAG, 'description'])
    expect(result).toHaveProperty(['paths', 'test', 'get', TEST_ORIGINS_FLAG, 'parameters'])
    expect(result).toHaveProperty(['paths', 'test', 'get', TEST_ORIGINS_FLAG, 'servers'])
    expect(result).toHaveProperty(['paths', 'test', 'get', 'parameters', TEST_ORIGINS_FLAG, 0])
    expect(result).toHaveProperty(['paths', 'test', 'get', 'parameters', TEST_ORIGINS_FLAG, 1])
    expect(result).toHaveProperty(['paths', 'test', 'get', 'servers', TEST_ORIGINS_FLAG, 0])
    expect(result).toHaveProperty(['paths', 'test', 'get', 'servers', TEST_ORIGINS_FLAG, 1])

    expect(result).toHaveProperty(['paths', 'test', 'delete', TEST_ORIGINS_FLAG, 'summary'])
    expect(result).toHaveProperty(['paths', 'test', 'delete', TEST_ORIGINS_FLAG, 'description'])
    expect(result).toHaveProperty(['paths', 'test', 'delete', TEST_ORIGINS_FLAG, 'parameters'])
    expect(result).toHaveProperty(['paths', 'test', 'delete', TEST_ORIGINS_FLAG, 'servers'])
    expect(result).toHaveProperty(['paths', 'test', 'delete', 'parameters', TEST_ORIGINS_FLAG, 0])
    expect(result).toHaveProperty(['paths', 'test', 'delete', 'servers', TEST_ORIGINS_FLAG, 0])

    expect(result.paths.test.delete.parameters[0][TEST_ORIGINS_FLAG]).toBe(result.paths.test.get.parameters[1][TEST_ORIGINS_FLAG])
    expect(result.paths.test.delete.servers[0][TEST_ORIGINS_FLAG]).toBe(result.paths.test.get.servers[1][TEST_ORIGINS_FLAG])

    const hmr = convertOriginToHumanReadable(result, TEST_ORIGINS_FLAG)

    expect(hmr).toHaveProperty(['paths', 'test', 'get', TEST_ORIGINS_FLAG, 'parameters'], ['paths/test/get/parameters'])
    expect(hmr).toHaveProperty(['paths', 'test', 'get', TEST_ORIGINS_FLAG, 'servers'], ['paths/test/get/servers'])

    expect(hmr).toHaveProperty(['paths', 'test', 'delete', TEST_ORIGINS_FLAG, 'parameters'], ['paths/test/parameters'])
    expect(hmr).toHaveProperty(['paths', 'test', 'delete', TEST_ORIGINS_FLAG, 'servers'], ['paths/test/servers'])

    expect(hmr).toHaveProperty(['paths', 'test', 'get', 'parameters', TEST_ORIGINS_FLAG, 0], ['paths/test/get/parameters/0'])
    expect(hmr).toHaveProperty(['paths', 'test', 'get', 'parameters', TEST_ORIGINS_FLAG, 1], ['paths/test/parameters/0'])
  })

  it('allof must assemble all the component paths without repetition', () => {
    const data = {
      openapi: '3.1.0',
      paths: {
        'humans': {
          get: {
            responses: {
              '200': {
                content: {
                  'application/json': {
                    schema: {
                      allOf: [
                        {
                          $ref: '#/components/schemas/LeftHand',
                        },
                        {
                          $ref: '#/components/schemas/RightHand',
                        }
                      ]
                    }
                  }
                }
              }
            }
          }
        }
      },
      components: {
        schemas: {
          Hand: {
            type: 'object'
          },
          LeftHand: {
            $ref: '#/components/schemas/Hand',
          },
          RightHand: {
            $ref: '#/components/schemas/Hand',
          },
        },
      },
    }

    const result: any = normalize(data, { inlineRefsFlag: TEST_INLINE_REFS_FLAG })

    const expected = {
      openapi: '3.1.0',
      paths: {
        'humans': {
          get: {
            responses: {
              '200': {
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      [TEST_INLINE_REFS_FLAG]: ['#/components/schemas/Hand', '#/components/schemas/LeftHand', '#/components/schemas/RightHand']
                    }
                  }
                }
              }
            }
          }
        }
      },
      components: {
        schemas: {
          Hand: {
            type: 'object',
            [TEST_INLINE_REFS_FLAG]: ['#/components/schemas/Hand', '#/components/schemas/LeftHand', '#/components/schemas/RightHand']
          },
          LeftHand: {
            type: 'object',
            [TEST_INLINE_REFS_FLAG]: ['#/components/schemas/Hand', '#/components/schemas/LeftHand', '#/components/schemas/RightHand']
          },
          RightHand: {
            type: 'object',
            [TEST_INLINE_REFS_FLAG]: ['#/components/schemas/Hand', '#/components/schemas/LeftHand', '#/components/schemas/RightHand']
          },
        },
      },
    }
    expect(result).toEqual(expected)
  })
})
