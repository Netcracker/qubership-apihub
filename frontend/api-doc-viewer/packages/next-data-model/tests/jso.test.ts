import { JsoTreeBuilder } from "../src/building-service/jso/tree/builder"
import { JsoTree } from "../src/model/jso/tree/tree.impl"
import { JsoPropertyValueTypes } from "../src/model/jso/types/node-value-type"
import { simplifyConsole } from "./helpers/simplify-console"

describe('JSO Tree', () => {
  simplifyConsole()

  it('should build JSO tree from JSO with primitive properties', () => {
    const jso = {
      name: 'John',
      age: 30,
      isStudent: true,
    }

    const builder = new JsoTreeBuilder(jso)
    const tree: JsoTree | undefined = builder.build()
    const root = tree?.root

    expect(root).toBeDefined()

    const properties = root!.childrenNodes()
    expect(properties).toHaveLength(3)

    const name = properties.find(property => property.key === 'name')
    expect(name).toBeDefined()
    expect(name!.value()).toEqual({
      title: 'name',
      value: 'John',
      valueType: JsoPropertyValueTypes.STRING,
      isPrimitive: true,
      isArrayItem: false,
      isPredefinedValueSet: false,
    })

    const age = properties.find(property => property.key === 'age')
    expect(age).toBeDefined()
    expect(age!.value()).toEqual({
      title: 'age',
      value: 30,
      valueType: JsoPropertyValueTypes.NUMBER,
      isPrimitive: true,
      isArrayItem: false,
      isPredefinedValueSet: false,
    })

    const isStudent = properties.find(property => property.key === 'isStudent')
    expect(isStudent).toBeDefined()
    expect(isStudent!.value()).toEqual({
      title: 'isStudent',
      value: true,
      valueType: JsoPropertyValueTypes.BOOLEAN,
      isPrimitive: true,
      isArrayItem: false,
      isPredefinedValueSet: true,
    })
  })

  it('should build JSO tree from JSO with object properties', () => {
    const jso = {
      person: {
        name: 'John',
        age: 30,
        isStudent: true,
      }
    }

    const builder = new JsoTreeBuilder(jso)
    const tree: JsoTree | undefined = builder.build()
    const root = tree?.root

    expect(root).toBeDefined()

    const properties = root!.childrenNodes()
    expect(properties).toHaveLength(1)

    const person = properties.find(property => property.key === 'person')
    expect(person).toBeDefined()
    expect(person!.value()).toEqual({
      title: 'person',
      value: {
        name: 'John',
        age: 30,
        isStudent: true,
      },
      valueType: JsoPropertyValueTypes.OBJECT,
      isPrimitive: false,
      isArrayItem: false,
      isPredefinedValueSet: false,
    })

    const personProperties = person!.childrenNodes()
    expect(personProperties).toHaveLength(3)

    const name = personProperties.find(property => property.key === 'name')
    expect(name).toBeDefined()
    expect(name!.value()).toEqual({
      title: 'name',
      value: 'John',
      valueType: JsoPropertyValueTypes.STRING,
      isPrimitive: true,
      isArrayItem: false,
      isPredefinedValueSet: false,
    })

    const age = personProperties.find(property => property.key === 'age')
    expect(age).toBeDefined()
    expect(age!.value()).toEqual({
      title: 'age',
      value: 30,
      valueType: JsoPropertyValueTypes.NUMBER,
      isPrimitive: true,
      isArrayItem: false,
      isPredefinedValueSet: false,
    })

    const isStudent = personProperties.find(property => property.key === 'isStudent')
    expect(isStudent).toBeDefined()
    expect(isStudent!.value()).toEqual({
      title: 'isStudent',
      value: true,
      valueType: JsoPropertyValueTypes.BOOLEAN,
      isPrimitive: true,
      isArrayItem: false,
      isPredefinedValueSet: true,
    })
  })

  it('should build JSO tree from JSO with array properties', () => {
    const jso = {
      names: ['John', 'Jane', 'Jim'],
    }

    const builder = new JsoTreeBuilder(jso)
    const tree: JsoTree | undefined = builder.build()
    const root = tree?.root

    expect(root).toBeDefined()

    const properties = root!.childrenNodes()

    expect(properties).toHaveLength(1)

    const names = properties.find(property => property.key === 'names')
    expect(names).toBeDefined()
    expect(names!.value()).toEqual({
      title: 'names',
      value: ['John', 'Jane', 'Jim'],
      valueType: JsoPropertyValueTypes.ARRAY,
      isPrimitive: false,
      isArrayItem: false,
      isPredefinedValueSet: false,
    })

    const namesItems = names!.childrenNodes()
    expect(namesItems).toHaveLength(3)

    const name1 = namesItems.find(item => item.key === 0)
    expect(name1).toBeDefined()
    expect(name1!.value()).toEqual({
      title: '0',
      value: 'John',
      valueType: JsoPropertyValueTypes.STRING,
      isPrimitive: true,
      isArrayItem: true,
      isPredefinedValueSet: false,
    })

    const name2 = namesItems.find(item => item.key === 1)
    expect(name2).toBeDefined()
    expect(name2!.value()).toEqual({
      title: '1',
      value: 'Jane',
      valueType: JsoPropertyValueTypes.STRING,
      isPrimitive: true,
      isArrayItem: true,
      isPredefinedValueSet: false,
    })

    const name3 = namesItems.find(item => item.key === 2)
    expect(name3).toBeDefined()
    expect(name3!.value()).toEqual({
      title: '2',
      value: 'Jim',
      valueType: JsoPropertyValueTypes.STRING,
      isPrimitive: true,
      isArrayItem: true,
      isPredefinedValueSet: false,
    })
  })

  it('should build JSO tree from JSO with nested object properties', () => {
    const jso = {
      person: {
        name: 'John',
        address: {
          street: '123 Main St',
          city: 'Anytown',
        }
      }
    }

    const builder = new JsoTreeBuilder(jso)
    const tree: JsoTree | undefined = builder.build()
    const root = tree?.root

    expect(root).toBeDefined()

    const properties = root!.childrenNodes()
    expect(properties).toHaveLength(1)

    const person = properties.find(property => property.key === 'person')
    expect(person).toBeDefined()
    expect(person!.value()).toEqual({
      title: 'person',
      value: {
        name: 'John',
        address: {
          street: '123 Main St',
          city: 'Anytown',
        },
      },
      valueType: JsoPropertyValueTypes.OBJECT,
      isPrimitive: false,
      isArrayItem: false,
      isPredefinedValueSet: false,
    })

    const personProperties = person!.childrenNodes()
    expect(personProperties).toHaveLength(2)

    const name = personProperties.find(property => property.key === 'name')
    expect(name).toBeDefined()
    expect(name!.value()).toEqual({
      title: 'name',
      value: 'John',
      valueType: JsoPropertyValueTypes.STRING,
      isPrimitive: true,
      isArrayItem: false,
      isPredefinedValueSet: false,
    })

    const address = personProperties.find(property => property.key === 'address')
    expect(address).toBeDefined()
    expect(address!.value()).toEqual({
      title: 'address',
      value: {
        street: '123 Main St',
        city: 'Anytown',
      },
      valueType: JsoPropertyValueTypes.OBJECT,
      isPrimitive: false,
      isArrayItem: false,
      isPredefinedValueSet: false,
    })

    const addressProperties = address!.childrenNodes()
    expect(addressProperties).toHaveLength(2)

    const street = addressProperties.find(property => property.key === 'street')
    expect(street).toBeDefined()
    expect(street!.value()).toEqual({
      title: 'street',
      value: '123 Main St',
      valueType: JsoPropertyValueTypes.STRING,
      isPrimitive: true,
      isArrayItem: false,
      isPredefinedValueSet: false,
    })

    const city = addressProperties.find(property => property.key === 'city')
    expect(city).toBeDefined()
    expect(city!.value()).toEqual({
      title: 'city',
      value: 'Anytown',
      valueType: JsoPropertyValueTypes.STRING,
      isPrimitive: true,
      isArrayItem: false,
      isPredefinedValueSet: false,
    })
  })

  // JSON Schema

  describe('Properties with kind = JSON Schema (supportJsonSchema = false)', () => {
    it('should build JSO tree from JSO with JSON Schema property (type = string)', () => {
      const jso = {
        schema: {
          type: 'string',
          format: 'email',
          description: 'Email address',
          examples: ['john.doe@example.com'],
        }
      }

      const builder = new JsoTreeBuilder(jso)
      const tree: JsoTree | undefined = builder.build()

      const root = tree?.root
      expect(root).toBeDefined()

      const rootChildren = root!.childrenNodes()
      expect(rootChildren).toHaveLength(1)

      const schema = rootChildren.find(node => node.key === 'schema')
      expect(schema).toBeDefined()
      expect(schema!.value()).toEqual({
        title: 'schema',
        value: jso.schema,
        valueType: JsoPropertyValueTypes.JSON_SCHEMA,
        isPrimitive: false,
        isArrayItem: false,
        isPredefinedValueSet: false,
      })

      const schemaChildren = schema!.childrenNodes()
      expect(schemaChildren).toHaveLength(4)

      const schemaNested = schema!.nestedNodes()
      expect(schemaNested).toHaveLength(0)

      const type = schemaChildren.find(node => node.key === 'type')
      expect(type).toBeDefined()
      expect(type!.value()).toEqual({
        title: 'type',
        value: 'string',
        valueType: JsoPropertyValueTypes.STRING,
        isPrimitive: true,
        isArrayItem: false,
        isPredefinedValueSet: false,
      })

      const format = schemaChildren.find(node => node.key === 'format')
      expect(format).toBeDefined()
      expect(format!.value()).toEqual({
        title: 'format',
        value: 'email',
        valueType: JsoPropertyValueTypes.STRING,
        isPrimitive: true,
        isArrayItem: false,
        isPredefinedValueSet: false,
      })

      const description = schemaChildren.find(node => node.key === 'description')
      expect(description).toBeDefined()
      expect(description!.value()).toEqual({
        title: 'description',
        value: 'Email address',
        valueType: JsoPropertyValueTypes.STRING,
        isPrimitive: true,
        isArrayItem: false,
        isPredefinedValueSet: false,
      })

      const examples = schemaChildren.find(node => node.key === 'examples')
      expect(examples).toBeDefined()
      expect(examples!.value()).toEqual({
        title: 'examples',
        value: ['john.doe@example.com'],
        valueType: JsoPropertyValueTypes.ARRAY,
        isPrimitive: false,
        isArrayItem: false,
        isPredefinedValueSet: false,
      })

      const examplesChildren = examples!.childrenNodes()
      expect(examplesChildren).toHaveLength(1)

      const example = examplesChildren.find(node => node.key === 0)
      expect(example).toBeDefined()
      expect(example!.value()).toEqual({
        title: '0',
        value: 'john.doe@example.com',
        valueType: JsoPropertyValueTypes.STRING,
        isPrimitive: true,
        isArrayItem: true,
        isPredefinedValueSet: false,
      })
    })

    it('should build JSO tree from JSO with JSON Schema property (type = number)', () => {
      const jso = {
        schema: {
          type: 'number',
          description: 'Age',
          examples: [30],
          minimum: 18,
          maximum: 100,
          multipleOf: 2,
        }
      }

      const builder = new JsoTreeBuilder(jso)
      const tree: JsoTree | undefined = builder.build()

      const root = tree?.root
      expect(root).toBeDefined()

      const rootChildren = root!.childrenNodes()
      expect(rootChildren).toHaveLength(1)

      const schema = rootChildren.find(node => node.key === 'schema')
      expect(schema).toBeDefined()
      expect(schema!.value()).toEqual({
        title: 'schema',
        value: jso.schema,
        valueType: JsoPropertyValueTypes.JSON_SCHEMA,
        isPrimitive: false,
        isArrayItem: false,
        isPredefinedValueSet: false,
      })

      const schemaChildren = schema!.childrenNodes()
      expect(schemaChildren).toHaveLength(6)

      const schemaNested = schema!.nestedNodes()
      expect(schemaNested).toHaveLength(0)
      
      const type = schemaChildren.find(node => node.key === 'type')
      expect(type).toBeDefined()
      expect(type!.value()).toEqual({
        title: 'type',
        value: 'number',
        valueType: JsoPropertyValueTypes.STRING,
        isPrimitive: true,
        isArrayItem: false,
        isPredefinedValueSet: false,
      })

      const description = schemaChildren.find(node => node.key === 'description')
      expect(description).toBeDefined()
      expect(description!.value()).toEqual({
        title: 'description',
        value: 'Age',
        valueType: JsoPropertyValueTypes.STRING,
        isPrimitive: true,
        isArrayItem: false,
        isPredefinedValueSet: false,
      })

      const examples = schemaChildren.find(node => node.key === 'examples')
      expect(examples).toBeDefined()
      expect(examples!.value()).toEqual({
        title: 'examples',
        value: [30],
        valueType: JsoPropertyValueTypes.ARRAY,
        isPrimitive: false,
        isArrayItem: false,
        isPredefinedValueSet: false,
      })

      const examplesChildren = examples!.childrenNodes()
      expect(examplesChildren).toHaveLength(1)

      const example = examplesChildren.find(node => node.key === 0)
      expect(example).toBeDefined()
      expect(example!.value()).toEqual({
        title: '0',
        value: 30,
        valueType: JsoPropertyValueTypes.NUMBER,
        isPrimitive: true,
        isArrayItem: true,
        isPredefinedValueSet: false,
      })

      const minimum = schemaChildren.find(node => node.key === 'minimum')
      expect(minimum).toBeDefined()
      expect(minimum!.value()).toEqual({
        title: 'minimum',
        value: 18,
        valueType: JsoPropertyValueTypes.NUMBER,
        isPrimitive: true,
        isArrayItem: false,
        isPredefinedValueSet: false,
      })

      const maximum = schemaChildren.find(node => node.key === 'maximum')
      expect(maximum).toBeDefined()
      expect(maximum!.value()).toEqual({
        title: 'maximum',
        value: 100,
        valueType: JsoPropertyValueTypes.NUMBER,
        isPrimitive: true,
        isArrayItem: false,
        isPredefinedValueSet: false,
      })

      const multipleOf = schemaChildren.find(node => node.key === 'multipleOf')
      expect(multipleOf).toBeDefined()
      expect(multipleOf!.value()).toEqual({
        title: 'multipleOf',
        value: 2,
        valueType: JsoPropertyValueTypes.NUMBER,
        isPrimitive: true,
        isArrayItem: false,
        isPredefinedValueSet: false,
      })
    })

    it('should build JSO tree from JSO with JSON Schema property (type = boolean)', () => {
      const jso = {
        schema: {
          type: 'boolean',
          description: 'Is student',
          examples: [false, true],
          default: true,
        }
      }

      const builder = new JsoTreeBuilder(jso)
      const tree: JsoTree | undefined = builder.build()

      const root = tree?.root
      expect(root).toBeDefined()

      const rootChildren = root!.childrenNodes()
      expect(rootChildren).toHaveLength(1)

      const schema = rootChildren.find(node => node.key === 'schema')
      expect(schema).toBeDefined()
      expect(schema!.value()).toEqual({
        title: 'schema',
        value: jso.schema,
        valueType: JsoPropertyValueTypes.JSON_SCHEMA,
        isPrimitive: false,
        isArrayItem: false,
        isPredefinedValueSet: false,
      })

      const schemaChildren = schema!.childrenNodes()
      expect(schemaChildren).toHaveLength(4)

      const schemaNested = schema!.nestedNodes()
      expect(schemaNested).toHaveLength(0)
      
      const type = schemaChildren.find(node => node.key === 'type')
      expect(type).toBeDefined()
      expect(type!.value()).toEqual({
        title: 'type',
        value: 'boolean',
        valueType: JsoPropertyValueTypes.STRING,
        isPrimitive: true,
        isArrayItem: false,
        isPredefinedValueSet: false,
      })

      const description = schemaChildren.find(node => node.key === 'description')
      expect(description).toBeDefined()
      expect(description!.value()).toEqual({
        title: 'description',
        value: 'Is student',
        valueType: JsoPropertyValueTypes.STRING,
        isPrimitive: true,
        isArrayItem: false,
        isPredefinedValueSet: false,
      })

      const examples = schemaChildren.find(node => node.key === 'examples')
      expect(examples).toBeDefined()
      expect(examples!.value()).toEqual({
        title: 'examples',
        value: [false, true],
        valueType: JsoPropertyValueTypes.ARRAY,
        isPrimitive: false,
        isArrayItem: false,
        isPredefinedValueSet: false,
      })

      const examplesChildren = examples!.childrenNodes()
      expect(examplesChildren).toHaveLength(2)

      const example1 = examplesChildren.find(node => node.key === 0)
      expect(example1).toBeDefined()
      expect(example1!.value()).toEqual({
        title: '0',
        value: false,
        valueType: JsoPropertyValueTypes.BOOLEAN,
        isPrimitive: true,
        isArrayItem: true,
        isPredefinedValueSet: true,
      })

      const example2 = examplesChildren.find(node => node.key === 1)
      expect(example2).toBeDefined()
      expect(example2!.value()).toEqual({
        title: '1',
        value: true,
        valueType: JsoPropertyValueTypes.BOOLEAN,
        isPrimitive: true,
        isArrayItem: true,
        isPredefinedValueSet: true,
      })

      const _default = schemaChildren.find(node => node.key === 'default')
      expect(_default).toBeDefined()
      expect(_default!.value()).toEqual({
        title: 'default',
        value: true,
        valueType: JsoPropertyValueTypes.BOOLEAN,
        isPrimitive: true,
        isArrayItem: false,
        isPredefinedValueSet: true,
      })
    })

    it('should build JSO tree from JSO with JSON Schema property (type = object)', () => {
      const jso = {
        schema: {
          type: 'object',
          properties: {
            name: { type: 'string' },
          },
        }
      }

      const builder = new JsoTreeBuilder(jso)
      const tree: JsoTree | undefined = builder.build()

      const root = tree?.root
      expect(root).toBeDefined()

      const rootChildren = root!.childrenNodes()
      expect(rootChildren).toHaveLength(1)
      
      const schema = rootChildren.find(node => node.key === 'schema')
      expect(schema).toBeDefined()
      expect(schema!.value()).toEqual({
        title: 'schema',
        value: jso.schema,
        valueType: JsoPropertyValueTypes.JSON_SCHEMA,
        isPrimitive: false,
        isArrayItem: false,
        isPredefinedValueSet: false,
      })

      const schemaChildren = schema!.childrenNodes()
      expect(schemaChildren).toHaveLength(2)

      const _type = schemaChildren.find(node => node.key === 'type')
      expect(_type).toBeDefined()
      expect(_type!.value()).toEqual({
        title: 'type',
        value: 'object',
        valueType: JsoPropertyValueTypes.STRING,
        isPrimitive: true,
        isArrayItem: false,
        isPredefinedValueSet: false,
      })

      const properties = schemaChildren.find(node => node.key === 'properties')
      expect(properties).toBeDefined()
      expect(properties!.value()).toEqual({
        title: 'properties',
        value: {
          name: { type: 'string' },
        },
        valueType: JsoPropertyValueTypes.OBJECT,
        isPrimitive: false,
        isArrayItem: false,
        isPredefinedValueSet: false,
      })

      const propertiesChildren = properties!.childrenNodes()
      expect(propertiesChildren).toHaveLength(1)

      const name = propertiesChildren.find(node => node.key === 'name')
      expect(name).toBeDefined()
      expect(name!.value()).toEqual({
        title: 'name',
        value: { type: 'string' },
        valueType: JsoPropertyValueTypes.JSON_SCHEMA,
        isPrimitive: false,
        isArrayItem: false,
        isPredefinedValueSet: false,
      })

      const nameChildren = name!.childrenNodes()
      expect(nameChildren).toHaveLength(1)

      const type = nameChildren.find(node => node.key === 'type')
      expect(type).toBeDefined()
      expect(type!.value()).toEqual({
        title: 'type',
        value: 'string',
        valueType: JsoPropertyValueTypes.STRING,
        isPrimitive: true,
        isArrayItem: false,
        isPredefinedValueSet: false,
      })
    })

    it('should build JSO tree from JSO with JSON Schema property (type = array)', () => {
      const jso = {
        schema: {
          type: 'array',
          items: { type: 'string' },
          description: 'Names',
          examples: [['John', 'Jane', 'Jim']],
          minItems: 3,
          maxItems: 10,
          uniqueItems: true,
        }
      }

      const builder = new JsoTreeBuilder(jso)
      const tree: JsoTree | undefined = builder.build()

      const root = tree?.root
      expect(root).toBeDefined()

      const rootChildren = root!.childrenNodes()
      expect(rootChildren).toHaveLength(1)
      
      const schema = rootChildren.find(node => node.key === 'schema')
      expect(schema).toBeDefined()
      expect(schema!.value()).toEqual({
        title: 'schema',
        value: jso.schema,
        valueType: JsoPropertyValueTypes.JSON_SCHEMA,
        isPrimitive: false,
        isArrayItem: false,
        isPredefinedValueSet: false,
      })

      const schemaChildren = schema!.childrenNodes()
      expect(schemaChildren).toHaveLength(7)

      const schemaNested = schema!.nestedNodes()
      expect(schemaNested).toHaveLength(0)
      
      const type1 = schemaChildren.find(node => node.key === 'type')
      expect(type1).toBeDefined()
      expect(type1!.value()).toEqual({
        title: 'type',
        value: 'array',
        valueType: JsoPropertyValueTypes.STRING,
        isPrimitive: true,
        isArrayItem: false,
        isPredefinedValueSet: false,
      })

      const items = schemaChildren.find(node => node.key === 'items')
      expect(items).toBeDefined()
      expect(items!.value()).toEqual({
        title: 'items',
        value: { type: 'string' },
        valueType: JsoPropertyValueTypes.JSON_SCHEMA,
        isPrimitive: false,
        isArrayItem: false,
        isPredefinedValueSet: false,
      })

      const itemsChildren = items!.childrenNodes()
      expect(itemsChildren).toHaveLength(1)

      const type2 = itemsChildren.find(node => node.key === 'type')
      expect(type2).toBeDefined()
      expect(type2!.value()).toEqual({
        title: 'type',
        value: 'string',
        valueType: JsoPropertyValueTypes.STRING,
        isPrimitive: true,
        isArrayItem: false,
        isPredefinedValueSet: false,
      })

      const description = schemaChildren.find(node => node.key === 'description')
      expect(description).toBeDefined()
      expect(description!.value()).toEqual({
        title: 'description',
        value: 'Names',
        valueType: JsoPropertyValueTypes.STRING,
        isPrimitive: true,
        isArrayItem: false,
        isPredefinedValueSet: false,
      })

      const examples = schemaChildren.find(node => node.key === 'examples')
      expect(examples).toBeDefined()
      expect(examples!.value()).toEqual({
        title: 'examples',
        value: [['John', 'Jane', 'Jim']],
        valueType: JsoPropertyValueTypes.ARRAY,
        isPrimitive: false,
        isArrayItem: false,
        isPredefinedValueSet: false,
      })

      const examplesChildren = examples!.childrenNodes()
      expect(examplesChildren).toHaveLength(1)

      const example = examplesChildren.find(node => node.key === 0)
      expect(example).toBeDefined()
      expect(example!.value()).toEqual({
        title: '0',
        value: ['John', 'Jane', 'Jim'],
        valueType: JsoPropertyValueTypes.ARRAY,
        isPrimitive: false,
        isArrayItem: true,
        isPredefinedValueSet: false,
      })

      const minItems = schemaChildren.find(node => node.key === 'minItems')
      expect(minItems).toBeDefined()
      expect(minItems!.value()).toEqual({
        title: 'minItems',
        value: 3,
        valueType: JsoPropertyValueTypes.NUMBER,
        isPrimitive: true,
        isArrayItem: false,
        isPredefinedValueSet: false,
      })

      const maxItems = schemaChildren.find(node => node.key === 'maxItems')
      expect(maxItems).toBeDefined()
      expect(maxItems!.value()).toEqual({
        title: 'maxItems',
        value: 10,
        valueType: JsoPropertyValueTypes.NUMBER,
        isPrimitive: true,
        isArrayItem: false,
        isPredefinedValueSet: false,
      })

      const uniqueItems = schemaChildren.find(node => node.key === 'uniqueItems')
      expect(uniqueItems).toBeDefined()
      expect(uniqueItems!.value()).toEqual({
        title: 'uniqueItems',
        value: true,
        valueType: JsoPropertyValueTypes.BOOLEAN,
        isPrimitive: true,
        isArrayItem: false,
        isPredefinedValueSet: true,
      })
    })
  })

  describe('Properties with kind = JSON Schema (supportJsonSchema = true)', () => {
    function testJsonSchemaProperty(jso: { schema: Record<string, unknown> }) {
      const builder = new JsoTreeBuilder(jso, true)
      const tree: JsoTree | undefined = builder.build()
      const root = tree?.root

      expect(root).toBeDefined()

      const schema = root!.childrenNodes().find(node => node.key === 'schema')
      expect(schema).toBeDefined()
      expect(schema!.value()).toEqual({
        title: 'schema',
        value: jso.schema,
        valueType: JsoPropertyValueTypes.JSON_SCHEMA,
        isPrimitive: false,
        isArrayItem: false,
        isPredefinedValueSet: false,
      })

      const schemaChildren = schema!.childrenNodes()
      expect(schemaChildren).toHaveLength(0)

      const schemaNested = schema!.nestedNodes()
      expect(schemaNested).toHaveLength(0)
    }

    it('should build JSO tree from JSO with JSON Schema property (type = string)', () => {
      const jso = {
        schema: {
          type: 'string',
          format: 'email',
          description: 'Email address',
          examples: ['john.doe@example.com'],
        }
      }

      testJsonSchemaProperty(jso)
    })

    it('should build JSO tree from JSO with JSON Schema property (type = number)', () => {
      const jso = {
        schema: {
          type: 'number',
          description: 'Age',
          examples: [30],
          minimum: 18,
          maximum: 100,
          multipleOf: 2,
        }
      }

      testJsonSchemaProperty(jso)
    })

    it('should build JSO tree from JSO with JSON Schema property (type = boolean)', () => {
      const jso = {
        schema: {
          type: 'boolean',
          description: 'Is student',
          examples: [false, true],
          default: true,
        }
      }

      testJsonSchemaProperty(jso)
    })

    it('should build JSO tree from JSO with JSON Schema property (type = object)', () => {
      const jso = {
        schema: {
          type: 'object',
          properties: {
            name: { type: 'string' },
          },
        }
      }

      testJsonSchemaProperty(jso)
    })

    it('should build JSO tree from JSO with JSON Schema property (type = array)', () => {
      const jso = {
        schema: {
          type: 'array',
          items: { type: 'string' },
          description: 'Names',
          examples: [['John', 'Jane', 'Jim']],
          minItems: 3,
          maxItems: 10,
          uniqueItems: true,
        }
      }

      testJsonSchemaProperty(jso)
    })
  })
})
