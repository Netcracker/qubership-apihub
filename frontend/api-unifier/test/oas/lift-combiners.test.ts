import { normalize, NormalizeOptions } from '../../src'
import { TEST_ORIGINS_FLAG, TEST_SYNTHETIC_TITLE_FLAG } from '../helpers'

describe('Lifting combiners from the same level with sibling props', () => {
  const DEFAULT_OPTIONS: NormalizeOptions = {
    liftCombiners: true,
  }

  describe('Both combiners on one level', () => {
    const test = (firstCombinerKey: string, secondCombinerKey: string) => {
      const originalSchema = {
        [firstCombinerKey]: [
          { title: 'Steel hands' },
          { title: 'Wood hands' },
        ],
        [secondCombinerKey]: [
          { format: 'With shoes' },
          { format: 'No shoes' },
        ],
      }
      const expectedSchema = {
        [secondCombinerKey]: [
          {
            [firstCombinerKey]: [
              { title: 'Steel hands', format: 'With shoes' },
              { title: 'Wood hands', format: 'With shoes' },
            ],
          },
          {
            [firstCombinerKey]: [
              { title: 'Steel hands', format: 'No shoes' },
              { title: 'Wood hands', format: 'No shoes' },
            ],
          },
        ],
      }
      const actualSchema1 = normalize(originalSchema, DEFAULT_OPTIONS)
      expect(actualSchema1).toEqual(expectedSchema)
      const actualSchema2 = normalize(actualSchema1, DEFAULT_OPTIONS)
      expect(actualSchema2).toEqual(actualSchema1)
    }

    it('should lift & merge combiners if oneOf+anyOf. anyOf wins if last', () => {
      test('oneOf', 'anyOf')
    })

    it('should lift & merge combiners if anyOf+oneOf. oneOf wins if last', () => {
      test('anyOf', 'oneOf')
    })
  })

  describe('Sibling Props + One combiner on one level', () => {
    const test = (combinerKey: string) => {
      const originalSchema = {
        type: 'object',
        description: 'ROBOT',
        properties: { factory: { type: 'string' } },
        [combinerKey]: [
          { title: 'Steel hands' },
          { title: 'Wood hands' },
        ],
      }
      const expectedSchema = {
        [combinerKey]: [
          {
            type: 'object',
            description: 'ROBOT',
            properties: { factory: { type: 'string' } },
            title: 'Steel hands',
          },
          {
            type: 'object',
            description: 'ROBOT',
            properties: { factory: { type: 'string' } },
            title: 'Wood hands',
          },
        ],
      }
      const actualSchema1 = normalize(originalSchema, DEFAULT_OPTIONS)
      expect(actualSchema1).toEqual(expectedSchema)
      const actualSchema2 = normalize(actualSchema1, DEFAULT_OPTIONS)
      expect(actualSchema2).toEqual(actualSchema1)
    }

    it('should lift "oneOf"', () => {
      test('oneOf')
    })

    it('should lift "anyOf"', () => {
      test('anyOf')
    })
  })

  describe('Sibling Props + One or both combiners on different levels', () => {
    const test = (firstCombiner: string, secondCombiner: string) => {
      const originalSchema = {
        type: 'object',
        description: 'ROOT',
        properties: {
          factory: {
            type: 'string',
            description: 'Factory Name',
            [secondCombiner]: [
              { format: 'FCTRNM' },
              { format: 'FACTORY_NAME' },
            ],
          },
        },
        [firstCombiner]: [
          {
            properties: {
              modelId: { type: 'string', format: 'NCID', description: 'Model ID' },
            },
          },
          {
            properties: {
              model: {
                type: 'object',
                description: 'Model Params',
                properties: {
                  id: { type: 'string', format: 'NCID', description: 'Model ID' },
                  name: { type: 'string', description: 'Model Name' },
                },
              },
            },
          },
        ],
      }
      const expectedSchema = {
        [firstCombiner]: [
          {
            type: 'object',
            description: 'ROOT',
            properties: {
              factory: {
                [secondCombiner]: [
                  { type: 'string', description: 'Factory Name', format: 'FCTRNM' },
                  { type: 'string', description: 'Factory Name', format: 'FACTORY_NAME' },
                ],
              },
              modelId: { type: 'string', format: 'NCID', description: 'Model ID' },
            },
          },
          {
            type: 'object',
            description: 'ROOT',
            properties: {
              factory: {
                [secondCombiner]: [
                  { type: 'string', description: 'Factory Name', format: 'FCTRNM' },
                  { type: 'string', description: 'Factory Name', format: 'FACTORY_NAME' },
                ],
              },
              model: {
                type: 'object',
                description: 'Model Params',
                properties: {
                  id: { type: 'string', format: 'NCID', description: 'Model ID' },
                  name: { type: 'string', description: 'Model Name' },
                },
              },
            },
          },
        ],
      }
      const actualSchema1 = normalize(originalSchema, DEFAULT_OPTIONS)
      expect(actualSchema1).toEqual(expectedSchema)
      const actualSchema2 = normalize(actualSchema1, DEFAULT_OPTIONS)
      expect(actualSchema2).toEqual(actualSchema1)
    }

    it('should lift "oneOf" and "oneOf" from random amount of levels', () => test('oneOf', 'oneOf'))

    it('should lift "anyOf" and "anyOf" from random amount of levels', () => test('anyOf', 'anyOf'))

    it('should lift "oneOf" and "anyOf" from random amount of levels', () => test('oneOf', 'anyOf'))

    it('should lift "anyOf" and "oneOf" from random amount of levels', () => test('anyOf', 'oneOf'))
  })

  describe('Sibling Props + Both combiners on one level', () => {
    const test = (firstCombinerKey: string, secondCombinerKey: string) => {
      const originalSchema = {
        type: 'object',
        description: 'ROBOT',
        [firstCombinerKey]: [
          { title: 'Steel hands' },
          { title: 'Wood hands' },
        ],
        [secondCombinerKey]: [
          { format: 'With shoes' },
          { format: 'No shoes' },
        ],
      }
      const expectedSchema = {
        [secondCombinerKey]: [
          {
            [firstCombinerKey]: [
              {
                type: 'object',
                description: 'ROBOT',
                title: 'Steel hands',
                format: 'With shoes',
              },
              {
                type: 'object',
                description: 'ROBOT',
                title: 'Wood hands',
                format: 'With shoes',
              },
            ],
          },
          {
            [firstCombinerKey]: [
              {
                type: 'object',
                description: 'ROBOT',
                title: 'Steel hands',
                format: 'No shoes',
              },
              {
                type: 'object',
                description: 'ROBOT',
                title: 'Wood hands',
                format: 'No shoes',
              },
            ],
          },
        ],
      }
      const actualSchema1 = normalize(originalSchema, DEFAULT_OPTIONS)
      expect(actualSchema1).toEqual(expectedSchema)
      const actualSchema2 = normalize(actualSchema1, DEFAULT_OPTIONS)
      expect(actualSchema2).toEqual(actualSchema1)
    }

    it('should lift & merge combiners if oneOf+anyOf. anyOf wins if last', () => {
      test('oneOf', 'anyOf')
    })

    it('should lift & merge combiners if anyOf+oneOf. oneOf wins if last', () => {
      test('anyOf', 'oneOf')
    })
  })

  describe('allOf AND (oneOf OR anyOf) on one level', () => {
    const test = (combinerKey: string) => {
      const originalSchema = {
        allOf: [
          { title: 'Robot' },
          {
            properties: {
              name: { type: 'string' },
            },
          },
        ],
        [combinerKey]: [
          {
            description: 'Personal Assistant',
            properties: {
              hasVoice: { type: 'boolean' },
              hasCoffeeMaker: { type: 'boolean' },
            },
          },
          {
            description: 'Guard',
            properties: {
              hasLaserEyes: { type: 'boolean' },
              hasWheels: { type: 'boolean' },
            },
          },
        ],
      }
      const expectedSchema = {
        [combinerKey]: [
          {
            title: 'Robot',
            description: 'Personal Assistant',
            properties: {
              name: { type: 'string' },
              hasVoice: { type: 'boolean' },
              hasCoffeeMaker: { type: 'boolean' },
            },
          },
          {
            title: 'Robot',
            description: 'Guard',
            properties: {
              name: { type: 'string' },
              hasLaserEyes: { type: 'boolean' },
              hasWheels: { type: 'boolean' },
            },
          },
        ],
      }
      const actualSchema1 = normalize(originalSchema, DEFAULT_OPTIONS)
      expect(actualSchema1).toEqual(expectedSchema)
      const actualSchema2 = normalize(actualSchema1, DEFAULT_OPTIONS)
      expect(actualSchema2).toEqual(actualSchema1)
    }

    it('allOf AND oneOf on one level', () => test('oneOf'))

    it('allOf AND anyOf on one level', () => test('anyOf'))
  })

  describe('allOf AND oneOf AND anyOf on one level', () => {
    const buildExpectedSchema = (firstCombinerKey: string, secondCombinerKey: string, changeOrder: boolean = false) => {
      if (!changeOrder) {
        return {
          [secondCombinerKey]: [
            {
              [firstCombinerKey]: [
                {
                  type: 'object',
                  title: 'Robot',
                  properties: {
                    hands: { type: 'number', description: 'Count of hands' },
                    legs: { type: 'number', description: 'Count of legs' },
                    colorHands: { type: 'string', enum: ['red', 'green', 'blue'], description: 'Color of hands' },
                    colorLegs: { type: 'string', enum: ['yellow', 'purple'], description: 'Color of legs' },
                  },
                },
                {
                  type: 'object',
                  title: 'Robot',
                  properties: {
                    hands: { type: 'string', enum: ['steel', 'wood'], description: 'Material of hands' },
                    legs: { type: 'string', enum: ['steel', 'wood'], description: 'Material of hands' },
                    colorHands: { type: 'string', enum: ['red', 'green', 'blue'], description: 'Color of hands' },
                    colorLegs: { type: 'string', enum: ['yellow', 'purple'], description: 'Color of legs' },
                  },
                },
              ],
            },
            {
              [firstCombinerKey]: [
                {
                  type: 'object',
                  title: 'Robot',
                  properties: {
                    hands: { type: 'number', description: 'Count of hands' },
                    legs: { type: 'number', description: 'Count of legs' },
                    transformable: { type: 'boolean', default: false },
                  },
                },
                {
                  type: 'object',
                  title: 'Robot',
                  properties: {
                    hands: { type: 'string', enum: ['steel', 'wood'], description: 'Material of hands' },
                    legs: { type: 'string', enum: ['steel', 'wood'], description: 'Material of hands' },
                    transformable: { type: 'boolean', default: false },
                  },
                },
              ],
            },
          ],
        }
      }

      return {
        [secondCombinerKey]: [
          {
            [firstCombinerKey]: [
              {
                type: 'object',
                title: 'Robot',
                properties: {
                  hands: { type: 'number', description: 'Count of hands' },
                  legs: { type: 'number', description: 'Count of legs' },
                  colorHands: { type: 'string', enum: ['red', 'green', 'blue'], description: 'Color of hands' },
                  colorLegs: { type: 'string', enum: ['yellow', 'purple'], description: 'Color of legs' },
                },
              },
              {
                type: 'object',
                title: 'Robot',
                properties: {
                  hands: { type: 'number', description: 'Count of hands' },
                  legs: { type: 'number', description: 'Count of legs' },
                  transformable: { type: 'boolean', default: false },
                },
              },
            ],
          },
          {
            [firstCombinerKey]: [
              {
                type: 'object',
                title: 'Robot',
                properties: {
                  hands: { type: 'string', enum: ['steel', 'wood'], description: 'Material of hands' },
                  legs: { type: 'string', enum: ['steel', 'wood'], description: 'Material of hands' },
                  colorHands: { type: 'string', enum: ['red', 'green', 'blue'], description: 'Color of hands' },
                  colorLegs: { type: 'string', enum: ['yellow', 'purple'], description: 'Color of legs' },
                },
              },
              {
                type: 'object',
                title: 'Robot',
                properties: {
                  hands: { type: 'string', enum: ['steel', 'wood'], description: 'Material of hands' },
                  legs: { type: 'string', enum: ['steel', 'wood'], description: 'Material of hands' },
                  transformable: { type: 'boolean', default: false },
                },
              },
            ],
          },
        ],
      }
    }

    describe('Common cases', () => {
      it('allOf AND oneOf AND anyOf on one level', () => {
        const originalSchema = {
          allOf: [
            { type: 'object' },
            { title: 'Robot' },
          ],
          oneOf: [
            {
              properties: {
                hands: { type: 'number', description: 'Count of hands' },
                legs: { type: 'number', description: 'Count of legs' },
              },
            },
            {
              properties: {
                hands: { type: 'string', enum: ['steel', 'wood'], description: 'Material of hands' },
                legs: { type: 'string', enum: ['steel', 'wood'], description: 'Material of hands' },
              },
            },
          ],
          anyOf: [
            {
              properties: {
                colorHands: { type: 'string', enum: ['red', 'green', 'blue'], description: 'Color of hands' },
                colorLegs: { type: 'string', enum: ['yellow', 'purple'], description: 'Color of legs' },
              },
            },
            {
              properties: {
                transformable: { type: 'boolean', default: false },
              },
            },
          ],
        }
        const expectedSchema = buildExpectedSchema('oneOf', 'anyOf')
        const actualSchema1 = normalize(originalSchema, DEFAULT_OPTIONS)
        expect(actualSchema1).toEqual(expectedSchema)
        const actualSchema2 = normalize(actualSchema1, DEFAULT_OPTIONS)
        expect(actualSchema2).toEqual(actualSchema1)
      })

      it('oneOf AND allOf AND anyOf on one level', () => {
        const originalSchema = {
          oneOf: [
            {
              properties: {
                hands: { type: 'number', description: 'Count of hands' },
                legs: { type: 'number', description: 'Count of legs' },
              },
            },
            {
              properties: {
                hands: { type: 'string', enum: ['steel', 'wood'], description: 'Material of hands' },
                legs: { type: 'string', enum: ['steel', 'wood'], description: 'Material of hands' },
              },
            },
          ],
          allOf: [
            { type: 'object' },
            { title: 'Robot' },
          ],
          anyOf: [
            {
              properties: {
                colorHands: { type: 'string', enum: ['red', 'green', 'blue'], description: 'Color of hands' },
                colorLegs: { type: 'string', enum: ['yellow', 'purple'], description: 'Color of legs' },
              },
            },
            {
              properties: {
                transformable: { type: 'boolean', default: false },
              },
            },
          ],
        }
        const expectedSchema = buildExpectedSchema('oneOf', 'anyOf')
        const actualSchema1 = normalize(originalSchema, DEFAULT_OPTIONS)
        expect(actualSchema1).toEqual(expectedSchema)
        const actualSchema2 = normalize(actualSchema1, DEFAULT_OPTIONS)
        expect(actualSchema2).toEqual(actualSchema1)
      })

      it('oneOf AND anyOf AND allOf on one level', () => {
        const originalSchema = {
          oneOf: [
            {
              properties: {
                hands: { type: 'number', description: 'Count of hands' },
                legs: { type: 'number', description: 'Count of legs' },
              },
            },
            {
              properties: {
                hands: { type: 'string', enum: ['steel', 'wood'], description: 'Material of hands' },
                legs: { type: 'string', enum: ['steel', 'wood'], description: 'Material of hands' },
              },
            },
          ],
          anyOf: [
            {
              properties: {
                colorHands: { type: 'string', enum: ['red', 'green', 'blue'], description: 'Color of hands' },
                colorLegs: { type: 'string', enum: ['yellow', 'purple'], description: 'Color of legs' },
              },
            },
            {
              properties: {
                transformable: { type: 'boolean', default: false },
              },
            },
          ],
          allOf: [
            { type: 'object' },
            { title: 'Robot' },
          ],
        }
        const expectedSchema = buildExpectedSchema('oneOf', 'anyOf')
        const actualSchema1 = normalize(originalSchema, DEFAULT_OPTIONS)
        expect(actualSchema1).toEqual(expectedSchema)
        const actualSchema2 = normalize(actualSchema1, DEFAULT_OPTIONS)
        expect(actualSchema2).toEqual(actualSchema1)
      })
    })

    describe('Changed combiners keys', () => {
      it('allOf AND anyOf AND oneOf on one level', () => {
        const originalSchema = {
          allOf: [
            { type: 'object' },
            { title: 'Robot' },
          ],
          anyOf: [
            {
              properties: {
                hands: { type: 'number', description: 'Count of hands' },
                legs: { type: 'number', description: 'Count of legs' },
              },
            },
            {
              properties: {
                hands: { type: 'string', enum: ['steel', 'wood'], description: 'Material of hands' },
                legs: { type: 'string', enum: ['steel', 'wood'], description: 'Material of hands' },
              },
            },
          ],
          oneOf: [
            {
              properties: {
                colorHands: { type: 'string', enum: ['red', 'green', 'blue'], description: 'Color of hands' },
                colorLegs: { type: 'string', enum: ['yellow', 'purple'], description: 'Color of legs' },
              },
            },
            {
              properties: {
                transformable: { type: 'boolean', default: false },
              },
            },
          ],
        }
        const expectedSchema = buildExpectedSchema('anyOf', 'oneOf')
        const actualSchema1 = normalize(originalSchema, DEFAULT_OPTIONS)
        expect(actualSchema1).toEqual(expectedSchema)
        const actualSchema2 = normalize(actualSchema1, DEFAULT_OPTIONS)
        expect(actualSchema2).toEqual(actualSchema1)
      })

      it('anyOf AND allOf AND oneOf on one level', () => {
        const originalSchema = {
          anyOf: [
            {
              properties: {
                hands: { type: 'number', description: 'Count of hands' },
                legs: { type: 'number', description: 'Count of legs' },
              },
            },
            {
              properties: {
                hands: { type: 'string', enum: ['steel', 'wood'], description: 'Material of hands' },
                legs: { type: 'string', enum: ['steel', 'wood'], description: 'Material of hands' },
              },
            },
          ],
          allOf: [
            { type: 'object' },
            { title: 'Robot' },
          ],
          oneOf: [
            {
              properties: {
                colorHands: { type: 'string', enum: ['red', 'green', 'blue'], description: 'Color of hands' },
                colorLegs: { type: 'string', enum: ['yellow', 'purple'], description: 'Color of legs' },
              },
            },
            {
              properties: {
                transformable: { type: 'boolean', default: false },
              },
            },
          ],
        }
        const expectedSchema = buildExpectedSchema('anyOf', 'oneOf')
        const actualSchema1 = normalize(originalSchema, DEFAULT_OPTIONS)
        expect(actualSchema1).toEqual(expectedSchema)
        const actualSchema2 = normalize(actualSchema1, DEFAULT_OPTIONS)
        expect(actualSchema2).toEqual(actualSchema1)
      })

      it('anyOf AND oneOf AND allOf on one level', () => {
        const originalSchema = {
          anyOf: [
            {
              properties: {
                hands: { type: 'number', description: 'Count of hands' },
                legs: { type: 'number', description: 'Count of legs' },
              },
            },
            {
              properties: {
                hands: { type: 'string', enum: ['steel', 'wood'], description: 'Material of hands' },
                legs: { type: 'string', enum: ['steel', 'wood'], description: 'Material of hands' },
              },
            },
          ],
          oneOf: [
            {
              properties: {
                colorHands: { type: 'string', enum: ['red', 'green', 'blue'], description: 'Color of hands' },
                colorLegs: { type: 'string', enum: ['yellow', 'purple'], description: 'Color of legs' },
              },
            },
            {
              properties: {
                transformable: { type: 'boolean', default: false },
              },
            },
          ],
          allOf: [
            { type: 'object' },
            { title: 'Robot' },
          ],
        }
        const expectedSchema = buildExpectedSchema('anyOf', 'oneOf')
        const actualSchema1 = normalize(originalSchema, DEFAULT_OPTIONS)
        expect(actualSchema1).toEqual(expectedSchema)
        const actualSchema2 = normalize(actualSchema1, DEFAULT_OPTIONS)
        expect(actualSchema2).toEqual(actualSchema1)
      })
    })

    describe('Changed combiners order', () => {
      it('allOf AND anyOf AND oneOf on one level', () => {
        const originalSchema = {
          allOf: [
            { type: 'object' },
            { title: 'Robot' },
          ],
          anyOf: [
            {
              properties: {
                colorHands: { type: 'string', enum: ['red', 'green', 'blue'], description: 'Color of hands' },
                colorLegs: { type: 'string', enum: ['yellow', 'purple'], description: 'Color of legs' },
              },
            },
            {
              properties: {
                transformable: { type: 'boolean', default: false },
              },
            },
          ],
          oneOf: [
            {
              properties: {
                hands: { type: 'number', description: 'Count of hands' },
                legs: { type: 'number', description: 'Count of legs' },
              },
            },
            {
              properties: {
                hands: { type: 'string', enum: ['steel', 'wood'], description: 'Material of hands' },
                legs: { type: 'string', enum: ['steel', 'wood'], description: 'Material of hands' },
              },
            },
          ],
        }
        const expectedSchema = buildExpectedSchema('anyOf', 'oneOf', true)
        const actualSchema1 = normalize(originalSchema, DEFAULT_OPTIONS)
        expect(actualSchema1).toEqual(expectedSchema)
        const actualSchema2 = normalize(actualSchema1, DEFAULT_OPTIONS)
        expect(actualSchema2).toEqual(actualSchema1)
      })

      it('anyOf AND allOf AND oneOf on one level', () => {
        const originalSchema = {
          anyOf: [
            {
              properties: {
                colorHands: { type: 'string', enum: ['red', 'green', 'blue'], description: 'Color of hands' },
                colorLegs: { type: 'string', enum: ['yellow', 'purple'], description: 'Color of legs' },
              },
            },
            {
              properties: {
                transformable: { type: 'boolean', default: false },
              },
            },
          ],
          allOf: [
            { type: 'object' },
            { title: 'Robot' },
          ],
          oneOf: [
            {
              properties: {
                hands: { type: 'number', description: 'Count of hands' },
                legs: { type: 'number', description: 'Count of legs' },
              },
            },
            {
              properties: {
                hands: { type: 'string', enum: ['steel', 'wood'], description: 'Material of hands' },
                legs: { type: 'string', enum: ['steel', 'wood'], description: 'Material of hands' },
              },
            },
          ],
        }
        const expectedSchema = buildExpectedSchema('anyOf', 'oneOf', true)
        const actualSchema1 = normalize(originalSchema, DEFAULT_OPTIONS)
        expect(actualSchema1).toEqual(expectedSchema)
        const actualSchema2 = normalize(actualSchema1, DEFAULT_OPTIONS)
        expect(actualSchema2).toEqual(actualSchema1)
      })

      it('anyOf AND oneOf AND allOf on one level', () => {
        const originalSchema = {
          anyOf: [
            {
              properties: {
                colorHands: { type: 'string', enum: ['red', 'green', 'blue'], description: 'Color of hands' },
                colorLegs: { type: 'string', enum: ['yellow', 'purple'], description: 'Color of legs' },
              },
            },
            {
              properties: {
                transformable: { type: 'boolean', default: false },
              },
            },
          ],
          oneOf: [
            {
              properties: {
                hands: { type: 'number', description: 'Count of hands' },
                legs: { type: 'number', description: 'Count of legs' },
              },
            },
            {
              properties: {
                hands: { type: 'string', enum: ['steel', 'wood'], description: 'Material of hands' },
                legs: { type: 'string', enum: ['steel', 'wood'], description: 'Material of hands' },
              },
            },
          ],
          allOf: [
            { type: 'object' },
            { title: 'Robot' },
          ],
        }
        const expectedSchema = buildExpectedSchema('anyOf', 'oneOf', true)
        const actualSchema1 = normalize(originalSchema, DEFAULT_OPTIONS)
        expect(actualSchema1).toEqual(expectedSchema)
        const actualSchema2 = normalize(actualSchema1, DEFAULT_OPTIONS)
        expect(actualSchema2).toEqual(actualSchema1)
      })
    })
  })

  describe('Sibling Props AND allOf AND (oneOf OR anyOf) on one level', () => {
    const test = (combinerKey: string) => {
      const originalSchema = {
        type: 'object',
        allOf: [
          {
            properties: {
              features: { type: 'array', description: 'Features' },
            },
          },
          {
            properties: {
              features: { enum: ['handshaking', 'greeting', 'applauding'] },
            },
          },
        ],
        [combinerKey]: [
          {
            description: 'Personal Assistant',
            properties: {
              hasVoice: { type: 'boolean' },
              hasCoffeeMaker: { type: 'boolean' },
            },
          },
          {
            description: 'Guard',
            properties: {
              hasLaserEyes: { type: 'boolean' },
              hasWheels: { type: 'boolean' },
            },
          },
        ],
      }
      const expectedSchema = {
        [combinerKey]: [
          {
            type: 'object',
            description: 'Personal Assistant',
            properties: {
              features: { type: 'array', description: 'Features', enum: ['handshaking', 'greeting', 'applauding'] },
              hasVoice: { type: 'boolean' },
              hasCoffeeMaker: { type: 'boolean' },
            },
          },
          {
            type: 'object',
            description: 'Guard',
            properties: {
              features: { type: 'array', description: 'Features', enum: ['handshaking', 'greeting', 'applauding'] },
              hasLaserEyes: { type: 'boolean' },
              hasWheels: { type: 'boolean' },
            },
          },
        ],
      }
      const actualSchema1 = normalize(originalSchema, DEFAULT_OPTIONS)
      expect(actualSchema1).toEqual(expectedSchema)
      const actualSchema2 = normalize(actualSchema1, DEFAULT_OPTIONS)
      expect(actualSchema2).toEqual(actualSchema1)
    }

    it('Sibling Props AND allOf AND oneOf on one level', () => test('oneOf'))

    it('Sibling Props AND allOf AND anyOf on one level', () => test('anyOf'))
  })

  describe('Sibling Props AND allOf AND oneOf AND anyOf on one level', () => {
    const buildExpectedSchema = (firstCombinerKey: string, secondCombinerKey: string, changeOrder: boolean = false) => {
      if (!changeOrder) {
        return {
          [secondCombinerKey]: [
            {
              [firstCombinerKey]: [
                {
                  type: 'object',
                  title: 'Robot',
                  description: 'Robot Definition',
                  properties: {
                    hands: { type: 'number', description: 'Count of hands' },
                    legs: { type: 'number', description: 'Count of legs' },
                    colorHands: { type: 'string', enum: ['red', 'green', 'blue'], description: 'Color of hands' },
                    colorLegs: { type: 'string', enum: ['yellow', 'purple'], description: 'Color of legs' },
                  },
                },
                {
                  type: 'object',
                  title: 'Robot',
                  description: 'Robot Definition',
                  properties: {
                    hands: { type: 'string', enum: ['steel', 'wood'], description: 'Material of hands' },
                    legs: { type: 'string', enum: ['steel', 'wood'], description: 'Material of hands' },
                    colorHands: { type: 'string', enum: ['red', 'green', 'blue'], description: 'Color of hands' },
                    colorLegs: { type: 'string', enum: ['yellow', 'purple'], description: 'Color of legs' },
                  },
                },
              ],
            },
            {
              [firstCombinerKey]: [
                {
                  type: 'object',
                  title: 'Robot',
                  description: 'Robot Definition',
                  properties: {
                    hands: { type: 'number', description: 'Count of hands' },
                    legs: { type: 'number', description: 'Count of legs' },
                    transformable: { type: 'boolean', default: false },
                  },
                },
                {
                  type: 'object',
                  title: 'Robot',
                  description: 'Robot Definition',
                  properties: {
                    hands: { type: 'string', enum: ['steel', 'wood'], description: 'Material of hands' },
                    legs: { type: 'string', enum: ['steel', 'wood'], description: 'Material of hands' },
                    transformable: { type: 'boolean', default: false },
                  },
                },
              ],
            },
          ],
        }
      }

      return {
        [secondCombinerKey]: [
          {
            [firstCombinerKey]: [
              {
                type: 'object',
                title: 'Robot',
                description: 'Robot Definition',
                properties: {
                  hands: { type: 'number', description: 'Count of hands' },
                  legs: { type: 'number', description: 'Count of legs' },
                  colorHands: { type: 'string', enum: ['red', 'green', 'blue'], description: 'Color of hands' },
                  colorLegs: { type: 'string', enum: ['yellow', 'purple'], description: 'Color of legs' },
                },
              },
              {
                type: 'object',
                title: 'Robot',
                description: 'Robot Definition',
                properties: {
                  hands: { type: 'number', description: 'Count of hands' },
                  legs: { type: 'number', description: 'Count of legs' },
                  transformable: { type: 'boolean', default: false },
                },
              },
            ],
          },
          {
            [firstCombinerKey]: [
              {
                type: 'object',
                title: 'Robot',
                description: 'Robot Definition',
                properties: {
                  hands: { type: 'string', enum: ['steel', 'wood'], description: 'Material of hands' },
                  legs: { type: 'string', enum: ['steel', 'wood'], description: 'Material of hands' },
                  colorHands: { type: 'string', enum: ['red', 'green', 'blue'], description: 'Color of hands' },
                  colorLegs: { type: 'string', enum: ['yellow', 'purple'], description: 'Color of legs' },
                },
              },
              {
                type: 'object',
                title: 'Robot',
                description: 'Robot Definition',
                properties: {
                  hands: { type: 'string', enum: ['steel', 'wood'], description: 'Material of hands' },
                  legs: { type: 'string', enum: ['steel', 'wood'], description: 'Material of hands' },
                  transformable: { type: 'boolean', default: false },
                },
              },
            ],
          },
        ],
      }
    }

    describe('Common cases', () => {
      it('Sibling Props + allOf AND oneOf AND anyOf on one level', () => {
        const originalSchema = {
          description: 'Robot Definition',
          allOf: [
            { type: 'object' },
            { title: 'Robot' },
          ],
          oneOf: [
            {
              properties: {
                hands: { type: 'number', description: 'Count of hands' },
                legs: { type: 'number', description: 'Count of legs' },
              },
            },
            {
              properties: {
                hands: { type: 'string', enum: ['steel', 'wood'], description: 'Material of hands' },
                legs: { type: 'string', enum: ['steel', 'wood'], description: 'Material of hands' },
              },
            },
          ],
          anyOf: [
            {
              properties: {
                colorHands: { type: 'string', enum: ['red', 'green', 'blue'], description: 'Color of hands' },
                colorLegs: { type: 'string', enum: ['yellow', 'purple'], description: 'Color of legs' },
              },
            },
            {
              properties: {
                transformable: { type: 'boolean', default: false },
              },
            },
          ],
        }
        const expectedSchema = buildExpectedSchema('oneOf', 'anyOf')
        const actualSchema1 = normalize(originalSchema, DEFAULT_OPTIONS)
        expect(actualSchema1).toEqual(expectedSchema)
        const actualSchema2 = normalize(actualSchema1, DEFAULT_OPTIONS)
        expect(actualSchema2).toEqual(actualSchema1)
      })

      it('oneOf AND Sibling Props AND allOf AND anyOf on one level', () => {
        const originalSchema = {
          oneOf: [
            {
              properties: {
                hands: { type: 'number', description: 'Count of hands' },
                legs: { type: 'number', description: 'Count of legs' },
              },
            },
            {
              properties: {
                hands: { type: 'string', enum: ['steel', 'wood'], description: 'Material of hands' },
                legs: { type: 'string', enum: ['steel', 'wood'], description: 'Material of hands' },
              },
            },
          ],
          description: 'Robot Definition',
          allOf: [
            { type: 'object' },
            { title: 'Robot' },
          ],
          anyOf: [
            {
              properties: {
                colorHands: { type: 'string', enum: ['red', 'green', 'blue'], description: 'Color of hands' },
                colorLegs: { type: 'string', enum: ['yellow', 'purple'], description: 'Color of legs' },
              },
            },
            {
              properties: {
                transformable: { type: 'boolean', default: false },
              },
            },
          ],
        }
        const expectedSchema = buildExpectedSchema('oneOf', 'anyOf')
        const actualSchema1 = normalize(originalSchema, DEFAULT_OPTIONS)
        expect(actualSchema1).toEqual(expectedSchema)
        const actualSchema2 = normalize(actualSchema1, DEFAULT_OPTIONS)
        expect(actualSchema2).toEqual(actualSchema1)
      })

      it('Sibling Props + oneOf AND anyOf AND allOf on one level', () => {
        const originalSchema = {
          oneOf: [
            {
              properties: {
                hands: { type: 'number', description: 'Count of hands' },
                legs: { type: 'number', description: 'Count of legs' },
              },
            },
            {
              properties: {
                hands: { type: 'string', enum: ['steel', 'wood'], description: 'Material of hands' },
                legs: { type: 'string', enum: ['steel', 'wood'], description: 'Material of hands' },
              },
            },
          ],
          anyOf: [
            {
              properties: {
                colorHands: { type: 'string', enum: ['red', 'green', 'blue'], description: 'Color of hands' },
                colorLegs: { type: 'string', enum: ['yellow', 'purple'], description: 'Color of legs' },
              },
            },
            {
              properties: {
                transformable: { type: 'boolean', default: false },
              },
            },
          ],
          description: 'Robot Definition',
          allOf: [
            { type: 'object' },
            { title: 'Robot' },
          ],
        }
        const expectedSchema = buildExpectedSchema('oneOf', 'anyOf')
        const actualSchema1 = normalize(originalSchema, DEFAULT_OPTIONS)
        expect(actualSchema1).toEqual(expectedSchema)
        const actualSchema2 = normalize(actualSchema1, DEFAULT_OPTIONS)
        expect(actualSchema2).toEqual(actualSchema1)
      })
    })

    describe('Changed combiners keys', () => {
      it('Sibling Props AND allOf AND anyOf AND oneOf on one level', () => {
        const originalSchema = {
          description: 'Robot Definition',
          allOf: [
            { type: 'object' },
            { title: 'Robot' },
          ],
          anyOf: [
            {
              properties: {
                hands: { type: 'number', description: 'Count of hands' },
                legs: { type: 'number', description: 'Count of legs' },
              },
            },
            {
              properties: {
                hands: { type: 'string', enum: ['steel', 'wood'], description: 'Material of hands' },
                legs: { type: 'string', enum: ['steel', 'wood'], description: 'Material of hands' },
              },
            },
          ],
          oneOf: [
            {
              properties: {
                colorHands: { type: 'string', enum: ['red', 'green', 'blue'], description: 'Color of hands' },
                colorLegs: { type: 'string', enum: ['yellow', 'purple'], description: 'Color of legs' },
              },
            },
            {
              properties: {
                transformable: { type: 'boolean', default: false },
              },
            },
          ],
        }
        const expectedSchema = buildExpectedSchema('anyOf', 'oneOf')
        const actualSchema1 = normalize(originalSchema, DEFAULT_OPTIONS)
        expect(actualSchema1).toEqual(expectedSchema)
        const actualSchema2 = normalize(actualSchema1, DEFAULT_OPTIONS)
        expect(actualSchema2).toEqual(actualSchema1)
      })

      it('anyOf AND Sibling Props AND allOf AND oneOf on one level', () => {
        const originalSchema = {
          anyOf: [
            {
              properties: {
                hands: { type: 'number', description: 'Count of hands' },
                legs: { type: 'number', description: 'Count of legs' },
              },
            },
            {
              properties: {
                hands: { type: 'string', enum: ['steel', 'wood'], description: 'Material of hands' },
                legs: { type: 'string', enum: ['steel', 'wood'], description: 'Material of hands' },
              },
            },
          ],
          description: 'Robot Definition',
          allOf: [
            { type: 'object' },
            { title: 'Robot' },
          ],
          oneOf: [
            {
              properties: {
                colorHands: { type: 'string', enum: ['red', 'green', 'blue'], description: 'Color of hands' },
                colorLegs: { type: 'string', enum: ['yellow', 'purple'], description: 'Color of legs' },
              },
            },
            {
              properties: {
                transformable: { type: 'boolean', default: false },
              },
            },
          ],
        }
        const expectedSchema = buildExpectedSchema('anyOf', 'oneOf')
        const actualSchema1 = normalize(originalSchema, DEFAULT_OPTIONS)
        expect(actualSchema1).toEqual(expectedSchema)
        const actualSchema2 = normalize(actualSchema1, DEFAULT_OPTIONS)
        expect(actualSchema2).toEqual(actualSchema1)
      })

      it('anyOf AND oneOf AND allOf Sibling Props on one level', () => {
        const originalSchema = {
          anyOf: [
            {
              properties: {
                hands: { type: 'number', description: 'Count of hands' },
                legs: { type: 'number', description: 'Count of legs' },
              },
            },
            {
              properties: {
                hands: { type: 'string', enum: ['steel', 'wood'], description: 'Material of hands' },
                legs: { type: 'string', enum: ['steel', 'wood'], description: 'Material of hands' },
              },
            },
          ],
          oneOf: [
            {
              properties: {
                colorHands: { type: 'string', enum: ['red', 'green', 'blue'], description: 'Color of hands' },
                colorLegs: { type: 'string', enum: ['yellow', 'purple'], description: 'Color of legs' },
              },
            },
            {
              properties: {
                transformable: { type: 'boolean', default: false },
              },
            },
          ],
          description: 'Robot Definition',
          allOf: [
            { type: 'object' },
            { title: 'Robot' },
          ],
        }
        const expectedSchema = buildExpectedSchema('anyOf', 'oneOf')
        const actualSchema1 = normalize(originalSchema, DEFAULT_OPTIONS)
        expect(actualSchema1).toEqual(expectedSchema)
        const actualSchema2 = normalize(actualSchema1, DEFAULT_OPTIONS)
        expect(actualSchema2).toEqual(actualSchema1)
      })
    })

    describe('Changed combiners order', () => {
      it('Sibling Props AND allOf AND anyOf AND oneOf on one level', () => {
        const originalSchema = {
          description: 'Robot Definition',
          allOf: [
            { type: 'object' },
            { title: 'Robot' },
          ],
          anyOf: [
            {
              properties: {
                colorHands: { type: 'string', enum: ['red', 'green', 'blue'], description: 'Color of hands' },
                colorLegs: { type: 'string', enum: ['yellow', 'purple'], description: 'Color of legs' },
              },
            },
            {
              properties: {
                transformable: { type: 'boolean', default: false },
              },
            },
          ],
          oneOf: [
            {
              properties: {
                hands: { type: 'number', description: 'Count of hands' },
                legs: { type: 'number', description: 'Count of legs' },
              },
            },
            {
              properties: {
                hands: { type: 'string', enum: ['steel', 'wood'], description: 'Material of hands' },
                legs: { type: 'string', enum: ['steel', 'wood'], description: 'Material of hands' },
              },
            },
          ],
        }
        const expectedSchema = buildExpectedSchema('anyOf', 'oneOf', true)
        const actualSchema1 = normalize(originalSchema, DEFAULT_OPTIONS)
        expect(actualSchema1).toEqual(expectedSchema)
        const actualSchema2 = normalize(actualSchema1, DEFAULT_OPTIONS)
        expect(actualSchema2).toEqual(actualSchema1)
      })

      it('anyOf AND Sibling Props AND allOf AND oneOf on one level', () => {
        const originalSchema = {
          anyOf: [
            {
              properties: {
                colorHands: { type: 'string', enum: ['red', 'green', 'blue'], description: 'Color of hands' },
                colorLegs: { type: 'string', enum: ['yellow', 'purple'], description: 'Color of legs' },
              },
            },
            {
              properties: {
                transformable: { type: 'boolean', default: false },
              },
            },
          ],
          description: 'Robot Definition',
          allOf: [
            { type: 'object' },
            { title: 'Robot' },
          ],
          oneOf: [
            {
              properties: {
                hands: { type: 'number', description: 'Count of hands' },
                legs: { type: 'number', description: 'Count of legs' },
              },
            },
            {
              properties: {
                hands: { type: 'string', enum: ['steel', 'wood'], description: 'Material of hands' },
                legs: { type: 'string', enum: ['steel', 'wood'], description: 'Material of hands' },
              },
            },
          ],
        }
        const expectedSchema = buildExpectedSchema('anyOf', 'oneOf', true)
        const actualSchema1 = normalize(originalSchema, DEFAULT_OPTIONS)
        expect(actualSchema1).toEqual(expectedSchema)
        const actualSchema2 = normalize(actualSchema1, DEFAULT_OPTIONS)
        expect(actualSchema2).toEqual(actualSchema1)
      })

      it('anyOf AND oneOf AND Sibling Props AND allOf on one level', () => {
        const originalSchema = {
          anyOf: [
            {
              properties: {
                colorHands: { type: 'string', enum: ['red', 'green', 'blue'], description: 'Color of hands' },
                colorLegs: { type: 'string', enum: ['yellow', 'purple'], description: 'Color of legs' },
              },
            },
            {
              properties: {
                transformable: { type: 'boolean', default: false },
              },
            },
          ],
          oneOf: [
            {
              properties: {
                hands: { type: 'number', description: 'Count of hands' },
                legs: { type: 'number', description: 'Count of legs' },
              },
            },
            {
              properties: {
                hands: { type: 'string', enum: ['steel', 'wood'], description: 'Material of hands' },
                legs: { type: 'string', enum: ['steel', 'wood'], description: 'Material of hands' },
              },
            },
          ],
          description: 'Robot Definition',
          allOf: [
            { type: 'object' },
            { title: 'Robot' },
          ],
        }
        const expectedSchema = buildExpectedSchema('anyOf', 'oneOf', true)
        const actualSchema1 = normalize(originalSchema, DEFAULT_OPTIONS)
        expect(actualSchema1).toEqual(expectedSchema)
        const actualSchema2 = normalize(actualSchema1, DEFAULT_OPTIONS)
        expect(actualSchema2).toEqual(actualSchema1)
      })
    })
  })

  describe('Looped objects', () => {
    it('should save looped object during lifting combiners', () => {
      const source = {
        components: {
          Human: {
            type: 'object',
            properties: {
              firstName: { type: 'string' },
              lastName: { type: 'string' },
              features: {
                type: 'object',
                allOf: [
                  { properties: { height: { type: 'number' } } },
                  { properties: { weight: { type: 'number' } } },
                  {
                    properties: {
                      nation: {
                        allOf: [
                          {
                            title: 'Nation',
                          },
                          {
                            description: 'Human Nation Definition',
                          },
                        ],
                        oneOf: [
                          {
                            type: 'string',
                            enum: ['Russian', 'American', 'Chinese'],
                          },
                          {
                            type: 'object',
                            description: 'Custom Nation',
                            required: ['name'],
                            properties: {
                              name: { type: 'string' },
                              homeland: { type: 'string' },
                            },
                          },
                        ],
                      },
                    },
                  },
                  {
                    anyOf: [
                      {
                        properties: {
                          eyes: { type: 'string', enum: ['green', 'blue', 'brown', 'gray'] },
                          nose: { type: 'string', enum: ['long', 'short'] },
                          lips: { type: 'string', enum: ['thin', 'thick'] },
                        },
                      },
                      {
                        properties: {
                          eyes: { type: 'string', enum: ['green', 'blue', 'brown', 'gray'] },
                          nose: { type: 'string', enum: ['long', 'short'] },
                          lips: { type: 'string', enum: ['thin', 'thick'] },
                        },
                        oneOf: [
                          {
                            properties: {
                              voice: { type: 'string', enum: ['alto', 'soprano', 'baritone'] },
                              hearing: { type: 'string', enum: ['low', 'medium', 'maximum'] },
                            },
                          },
                          {
                            properties: {
                              voice: { type: 'boolean' },
                              hearing: { type: 'boolean' },
                            },
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
              parent: {
                anyOf: [
                  { type: 'null' },
                  { $ref: '#/components/Human' },
                ],
              },
              children: {
                type: 'array',
                items: {
                  $ref: '#/components/Human',
                },
              },
            },
          },
        },
      }
      const originalSchema = {
        type: 'object',
        description: 'Simple Hierarchy',
        properties: {
          headOfHierarchy: {
            $ref: '#/components/Human',
          },
        },
      }

      const expectedNationSchema = {
        oneOf: [
          {
            title: 'Nation',
            description: 'Human Nation Definition',
            type: 'string',
            enum: ['Russian', 'American', 'Chinese'],
          },
          {
            title: 'Nation',
            description: 'Custom Nation',
            type: 'object',
            required: ['name'],
            properties: {
              name: { type: 'string' },
              homeland: { type: 'string' },
            },
          },
        ],
      }
      const expectedHuman: Record<PropertyKey, any> = {
        type: 'object',
        properties: {
          firstName: { type: 'string' },
          lastName: { type: 'string' },
          features: {
            anyOf: [
              {
                type: 'object',
                properties: {
                  height: { type: 'number' },
                  weight: { type: 'number' },
                  nation: expectedNationSchema,
                  eyes: { type: 'string', enum: ['green', 'blue', 'brown', 'gray'] },
                  nose: { type: 'string', enum: ['long', 'short'] },
                  lips: { type: 'string', enum: ['thin', 'thick'] },
                },
              },
              {
                oneOf: [
                  {
                    type: 'object',
                    properties: {
                      height: { type: 'number' },
                      weight: { type: 'number' },
                      nation: expectedNationSchema,
                      eyes: { type: 'string', enum: ['green', 'blue', 'brown', 'gray'] },
                      nose: { type: 'string', enum: ['long', 'short'] },
                      lips: { type: 'string', enum: ['thin', 'thick'] },
                      voice: { type: 'string', enum: ['alto', 'soprano', 'baritone'] },
                      hearing: { type: 'string', enum: ['low', 'medium', 'maximum'] },
                    },
                  },
                  {
                    type: 'object',
                    properties: {
                      height: { type: 'number' },
                      weight: { type: 'number' },
                      nation: expectedNationSchema,
                      eyes: { type: 'string', enum: ['green', 'blue', 'brown', 'gray'] },
                      nose: { type: 'string', enum: ['long', 'short'] },
                      lips: { type: 'string', enum: ['thin', 'thick'] },
                      voice: { type: 'boolean' },
                      hearing: { type: 'boolean' },
                    },
                  },
                ],
              },
            ],
          },
          parent: {
            anyOf: [
              { type: 'null' },
            ],
          },
          children: {
            type: 'array',
          },
        },
      }
      expectedHuman.properties.parent.anyOf[1] = expectedHuman
      expectedHuman.properties.children.items = expectedHuman
      const expectedSchema = {
        type: 'object',
        description: 'Simple Hierarchy',
        properties: {
          headOfHierarchy: expectedHuman,
        },
      }

      const actualSchema1 = normalize(originalSchema, { liftCombiners: true, source: source })
      expect(actualSchema1).toEqual(expectedSchema)
      const actualSchema2 = normalize(actualSchema1, DEFAULT_OPTIONS)
      expect(actualSchema2).toEqual(actualSchema1)
    })

    it('should support infinity oneOf item (without $ref, compatible items)', () => {
      const originalSchema = {
        type: 'string',
        maxLength: 999,
        oneOf: [
          null as unknown,
          { minLength: 1 },
        ],
      }
      originalSchema.oneOf[0] = originalSchema
      const actualSchema = normalize(originalSchema, {
        liftCombiners: true,
        syntheticTitleFlag: TEST_SYNTHETIC_TITLE_FLAG,
      })
      const expectedSchema = {
        oneOf: [
          { oneOf: null as unknown },
          {
            type: 'string',
            minLength: 1,
            maxLength: 999,
          },
        ],
      }
      expectedSchema.oneOf[0].oneOf = expectedSchema.oneOf
      expect(actualSchema).toEqual(expectedSchema)
    })
  })

  describe('Ignore specific keys', () => {
    it('should keep "inlineRefFlag" in schema after lifting combiners', () => {
      const TEST_INLINE_REF_FLAG = Symbol('Test')
      const source = {
        RobotProps: {
          description: 'Robot properties',
          oneOf: [
            {
              properties: {
                head: { type: 'string', enum: ['square', 'round'] },
                body: { type: 'string', enum: ['steel', 'wood'] },
              },
            },
            {
              properties: {
                head: { type: 'boolean', default: true },
                body: { type: 'boolean', default: true },
              },
            },
          ],
        },
      }
      const originalSchema = {
        title: 'Robot',
        type: 'object',
        properties: {
          features: {
            $ref: '#/RobotProps',
          },
        },
      }
      const expectedSchema = {
        title: 'Robot',
        type: 'object',
        properties: {
          features: {
            oneOf: [
              {
                description: 'Robot properties',
                properties: {
                  head: { type: 'string', enum: ['square', 'round'] },
                  body: { type: 'string', enum: ['steel', 'wood'] },
                },
              },
              {
                description: 'Robot properties',
                properties: {
                  head: { type: 'boolean', default: true },
                  body: { type: 'boolean', default: true },
                },
              },
            ],
            [TEST_INLINE_REF_FLAG]: ['#/RobotProps'],
          },
        },
      }
      const options: NormalizeOptions = {
        liftCombiners: true,
        inlineRefsFlag: TEST_INLINE_REF_FLAG,
        source: source,
      }
      const actualSchema1 = normalize(originalSchema, options)
      expect(actualSchema1).toEqual(expectedSchema)
      const actualSchema2 = normalize(actualSchema1, options)
      expect(actualSchema2).toEqual(actualSchema1)
    })

    it('should NOT keep other symbolic keys in schema after lifting combiners', () => {
      const TEST_SYMBOLIC_FLAG = Symbol('Test')
      const originalSchema = {
        title: 'Robot',
        type: 'object',
        properties: {
          features: {
            description: 'Robot properties',
            oneOf: [
              {
                properties: {
                  head: { type: 'string', enum: ['square', 'round'] },
                  body: { type: 'string', enum: ['steel', 'wood'] },
                },
              },
              {
                properties: {
                  head: { type: 'boolean', default: true },
                  body: { type: 'boolean', default: true },
                },
              },
            ],
            [TEST_SYMBOLIC_FLAG]: 'some value',
          },
        },
      }
      const expectedSchema = {
        title: 'Robot',
        type: 'object',
        properties: {
          features: {
            oneOf: [
              {
                description: 'Robot properties',
                properties: {
                  head: { type: 'string', enum: ['square', 'round'] },
                  body: { type: 'string', enum: ['steel', 'wood'] },
                },
              },
              {
                description: 'Robot properties',
                properties: {
                  head: { type: 'boolean', default: true },
                  body: { type: 'boolean', default: true },
                },
              },
            ],
          },
        },
      }
      const actualSchema1 = normalize(originalSchema, DEFAULT_OPTIONS)
      expect(actualSchema1).toEqual(expectedSchema)
      const actualSchema2 = normalize(actualSchema1, DEFAULT_OPTIONS)
      expect(actualSchema2).toEqual(actualSchema1)
    })
  })

  describe('Corner Cases', () => {
    it('sibling + allOf[item, oneOf[item, item]]', () => {
      const originalSchema = {
        type: 'object',
        title: 'ROBOT',
        properties: {
          head: { type: 'boolean', default: true },
          body: { type: 'string', enum: ['square', 'circle', 'triangle'] },
        },
        allOf: [
          { description: 'ROBOT Description' },
          {
            oneOf: [
              {
                properties: {
                  hands: { type: 'number', description: 'Count of hands' },
                  legs: { type: 'number', description: 'Count of legs' },
                },
              },
              {
                properties: {
                  hands: { type: 'string', enum: ['steel', 'wood'], description: 'Material of hands' },
                  legs: { type: 'string', enum: ['steel', 'wood'], description: 'Material of hands' },
                },
              },
            ],
          },
        ],
      }
      const expectedSchema = {
        oneOf: [
          {
            type: 'object',
            description: 'ROBOT Description',
            title: 'ROBOT',
            properties: {
              head: { type: 'boolean', default: true },
              body: { type: 'string', enum: ['square', 'circle', 'triangle'] },
              hands: { type: 'number', description: 'Count of hands' },
              legs: { type: 'number', description: 'Count of legs' },
            },
          },
          {
            type: 'object',
            description: 'ROBOT Description',
            title: 'ROBOT',
            properties: {
              head: { type: 'boolean', default: true },
              body: { type: 'string', enum: ['square', 'circle', 'triangle'] },
              hands: { type: 'string', enum: ['steel', 'wood'], description: 'Material of hands' },
              legs: { type: 'string', enum: ['steel', 'wood'], description: 'Material of hands' },
            },
          },
        ],
      }
      const actualSchema1 = normalize(originalSchema, DEFAULT_OPTIONS)
      expect(actualSchema1).toEqual(expectedSchema)
      const actualSchema2 = normalize(actualSchema1, DEFAULT_OPTIONS)
      expect(actualSchema2).toEqual(actualSchema1)
    })

    it('sibling + allOf[item, sibling + oneOf[item, item]]', () => {
      const originalSchema = {
        type: 'object',
        title: 'Robot',
        properties: {
          head: { type: 'boolean', default: true },
          body: { type: 'string', enum: ['square', 'circle', 'triangle'] },
        },
        allOf: [
          { required: ['head', 'body'] },
          {
            description: 'Robot Description',
            oneOf: [
              {
                properties: {
                  hands: { type: 'number', description: 'Count of hands' },
                  legs: { type: 'number', description: 'Count of legs' },
                },
              },
              {
                properties: {
                  hands: { type: 'string', enum: ['steel', 'wood'], description: 'Material of hands' },
                  legs: { type: 'string', enum: ['steel', 'wood'], description: 'Material of hands' },
                },
              },
            ],
          },
        ],
      }
      const expectedSchema = {
        oneOf: [
          {
            type: 'object',
            title: 'Robot',
            description: 'Robot Description',
            required: ['head', 'body'],
            properties: {
              head: { type: 'boolean', default: true },
              body: { type: 'string', enum: ['square', 'circle', 'triangle'] },
              hands: { type: 'number', description: 'Count of hands' },
              legs: { type: 'number', description: 'Count of legs' },
            },
          },
          {
            type: 'object',
            title: 'Robot',
            description: 'Robot Description',
            required: ['head', 'body'],
            properties: {
              head: { type: 'boolean', default: true },
              body: { type: 'string', enum: ['square', 'circle', 'triangle'] },
              hands: { type: 'string', enum: ['steel', 'wood'], description: 'Material of hands' },
              legs: { type: 'string', enum: ['steel', 'wood'], description: 'Material of hands' },
            },
          },
        ],
      }
      const actualSchema1 = normalize(originalSchema, DEFAULT_OPTIONS)
      expect(actualSchema1).toEqual(expectedSchema)
      const actualSchema2 = normalize(actualSchema1, DEFAULT_OPTIONS)
      expect(actualSchema2).toEqual(actualSchema1)
    })

    it('sibling + allOf[item, sibling + oneOf[item, allOf[item, item]]]', () => {
      const originalSchema = {
        type: 'object',
        title: 'Robot',
        properties: {
          head: { type: 'boolean', default: true },
          body: { type: 'string', enum: ['square', 'circle', 'triangle'] },
        },
        allOf: [
          { required: ['head', 'body'] },
          {
            description: 'Robot Description',
            oneOf: [
              {
                properties: {
                  hands: { type: 'number', description: 'Count of hands' },
                  legs: { type: 'number', description: 'Count of legs' },
                },
              },
              {
                allOf: [
                  {
                    properties: {
                      hands: { type: 'string', enum: ['steel', 'wood'], description: 'Material of hands' },
                    },
                  },
                  {
                    properties: {
                      legs: { type: 'string', enum: ['steel', 'wood'], description: 'Material of hands' },
                    },
                  },
                ],
              },
            ],
          },
        ],
      }
      const expectedSchema = {
        oneOf: [
          {
            type: 'object',
            title: 'Robot',
            description: 'Robot Description',
            required: ['head', 'body'],
            properties: {
              head: { type: 'boolean', default: true },
              body: { type: 'string', enum: ['square', 'circle', 'triangle'] },
              hands: { type: 'number', description: 'Count of hands' },
              legs: { type: 'number', description: 'Count of legs' },
            },
          },
          {
            type: 'object',
            title: 'Robot',
            description: 'Robot Description',
            required: ['head', 'body'],
            properties: {
              head: { type: 'boolean', default: true },
              body: { type: 'string', enum: ['square', 'circle', 'triangle'] },
              hands: { type: 'string', enum: ['steel', 'wood'], description: 'Material of hands' },
              legs: { type: 'string', enum: ['steel', 'wood'], description: 'Material of hands' },
            },
          },
        ],
      }
      const actualSchema1 = normalize(originalSchema, DEFAULT_OPTIONS)
      expect(actualSchema1).toEqual(expectedSchema)
      const actualSchema2 = normalize(actualSchema1, DEFAULT_OPTIONS)
      expect(actualSchema2).toEqual(actualSchema1)
    })

    it('sibling + oneOf[item, item] + allOf[item, oneOf[item, item]]', () => {
      const originalSchema = {
        type: 'object',
        title: 'Robot',
        properties: {
          head: { type: 'boolean', default: true },
          body: { type: 'string', enum: ['square', 'circle', 'triangle'] },
        },
        oneOf: [
          {
            properties: {
              colorHands: { type: 'string', enum: ['red', 'green', 'blue'], description: 'Color of hands' },
              colorLegs: { type: 'string', enum: ['yellow', 'purple'], description: 'Color of legs' },
            },
          },
          {
            properties: {
              transformable: { type: 'boolean', default: false },
            },
          },
        ],
        allOf: [
          { required: ['head', 'body'] },
          {
            description: 'Robot Description',
            oneOf: [
              {
                properties: {
                  hands: { type: 'number', description: 'Count of hands' },
                  legs: { type: 'number', description: 'Count of legs' },
                },
              },
              {
                properties: {
                  hands: { type: 'string', enum: ['steel', 'wood'], description: 'Material of hands' },
                  legs: { type: 'string', enum: ['steel', 'wood'], description: 'Material of hands' },
                },
              },
            ],
          },
        ],
      }
      const expectedSchema = {
        oneOf: [
          {
            required: ['head', 'body'],
            description: 'Robot Description',
            type: 'object',
            title: 'Robot',
            properties: {
              head: { type: 'boolean', default: true },
              body: { type: 'string', enum: ['square', 'circle', 'triangle'] },
              hands: { type: 'number', description: 'Count of hands' },
              legs: { type: 'number', description: 'Count of legs' },
              colorHands: { type: 'string', enum: ['red', 'green', 'blue'], description: 'Color of hands' },
              colorLegs: { type: 'string', enum: ['yellow', 'purple'], description: 'Color of legs' },
            },
          },
          {
            required: ['head', 'body'],
            description: 'Robot Description',
            type: 'object',
            title: 'Robot',
            properties: {
              head: { type: 'boolean', default: true },
              body: { type: 'string', enum: ['square', 'circle', 'triangle'] },
              hands: { type: 'number', description: 'Count of hands' },
              legs: { type: 'number', description: 'Count of legs' },
              transformable: { type: 'boolean', default: false },
            },
          },
          {
            required: ['head', 'body'],
            description: 'Robot Description',
            type: 'object',
            title: 'Robot',
            properties: {
              head: { type: 'boolean', default: true },
              body: { type: 'string', enum: ['square', 'circle', 'triangle'] },
              hands: { type: 'string', enum: ['steel', 'wood'], description: 'Material of hands' },
              legs: { type: 'string', enum: ['steel', 'wood'], description: 'Material of hands' },
              colorHands: { type: 'string', enum: ['red', 'green', 'blue'], description: 'Color of hands' },
              colorLegs: { type: 'string', enum: ['yellow', 'purple'], description: 'Color of legs' },
            },
          },
          {
            required: ['head', 'body'],
            description: 'Robot Description',
            type: 'object',
            title: 'Robot',
            properties: {
              head: { type: 'boolean', default: true },
              body: { type: 'string', enum: ['square', 'circle', 'triangle'] },
              hands: { type: 'string', enum: ['steel', 'wood'], description: 'Material of hands' },
              legs: { type: 'string', enum: ['steel', 'wood'], description: 'Material of hands' },
              transformable: { type: 'boolean', default: false },
            },
          },
        ],
      }
      const actualSchema1 = normalize(originalSchema, DEFAULT_OPTIONS)
      expect(actualSchema1).toEqual(expectedSchema)
      const actualSchema2 = normalize(actualSchema1, DEFAULT_OPTIONS)
      expect(actualSchema2).toEqual(actualSchema1)
    })

    it('sibling + allOf[oneOf[item, item], oneOf[item, item]]', () => {
      const originalSchema = {
        title: 'ROBOT',
        type: 'object',
        properties: {
          head: { type: 'boolean', default: true },
          body: { type: 'string', enum: ['square', 'circle', 'triangle'] },
        },
        allOf: [
          {
            oneOf: [
              {
                properties: {
                  hands: { type: 'number', description: 'Count of hands' },
                  legs: { type: 'number', description: 'Count of legs' },
                },
              },
              {
                properties: {
                  hands: { type: 'string', enum: ['steel', 'wood'], description: 'Material of hands' },
                  legs: { type: 'string', enum: ['steel', 'wood'], description: 'Material of hands' },
                },
              },
            ],
          },
          {
            oneOf: [
              {
                properties: {
                  colorHands: { type: 'string', enum: ['red', 'green', 'blue'], description: 'Color of hands' },
                  colorLegs: { type: 'string', enum: ['yellow', 'purple'], description: 'Color of legs' },
                },
              },
              {
                properties: {
                  transformable: { type: 'boolean', default: false },
                },
              },
            ],
          },
        ],
      }
      const expectedSchema = {
        oneOf: [
          {
            title: 'ROBOT',
            type: 'object',
            properties: {
              head: { type: 'boolean', default: true },
              body: { type: 'string', enum: ['square', 'circle', 'triangle'] },
              hands: { type: 'number', description: 'Count of hands' },
              legs: { type: 'number', description: 'Count of legs' },
              colorHands: { type: 'string', enum: ['red', 'green', 'blue'], description: 'Color of hands' },
              colorLegs: { type: 'string', enum: ['yellow', 'purple'], description: 'Color of legs' },
            },
          },
          {
            title: 'ROBOT',
            type: 'object',
            properties: {
              head: { type: 'boolean', default: true },
              body: { type: 'string', enum: ['square', 'circle', 'triangle'] },
              hands: { type: 'number', description: 'Count of hands' },
              legs: { type: 'number', description: 'Count of legs' },
              transformable: { type: 'boolean', default: false },
            },
          },
          {
            title: 'ROBOT',
            type: 'object',
            properties: {
              head: { type: 'boolean', default: true },
              body: { type: 'string', enum: ['square', 'circle', 'triangle'] },
              hands: { type: 'string', enum: ['steel', 'wood'], description: 'Material of hands' },
              legs: { type: 'string', enum: ['steel', 'wood'], description: 'Material of hands' },
              colorHands: { type: 'string', enum: ['red', 'green', 'blue'], description: 'Color of hands' },
              colorLegs: { type: 'string', enum: ['yellow', 'purple'], description: 'Color of legs' },
            },
          },
          {
            title: 'ROBOT',
            type: 'object',
            properties: {
              head: { type: 'boolean', default: true },
              body: { type: 'string', enum: ['square', 'circle', 'triangle'] },
              hands: { type: 'string', enum: ['steel', 'wood'], description: 'Material of hands' },
              legs: { type: 'string', enum: ['steel', 'wood'], description: 'Material of hands' },
              transformable: { type: 'boolean', default: false },
            },
          },
        ],
      }
      const actualSchema1 = normalize(originalSchema, DEFAULT_OPTIONS)
      expect(actualSchema1).toEqual(expectedSchema)
      const actualSchema2 = normalize(actualSchema1, DEFAULT_OPTIONS)
      expect(actualSchema2).toEqual(actualSchema1)
    })

    it('sibling + allOf[item, oneOf[item, item], oneOf[item, item]]', () => {
      const originalSchema = {
        title: 'ROBOT',
        type: 'object',
        properties: {
          head: { type: 'boolean', default: true },
          body: { type: 'string', enum: ['square', 'circle', 'triangle'] },
        },
        allOf: [
          {
            description: 'Robot Description',
            required: ['head', 'body'],
          },
          {
            oneOf: [
              {
                properties: {
                  hands: { type: 'number', description: 'Count of hands' },
                  legs: { type: 'number', description: 'Count of legs' },
                },
              },
              {
                properties: {
                  hands: { type: 'string', enum: ['steel', 'wood'], description: 'Material of hands' },
                  legs: { type: 'string', enum: ['steel', 'wood'], description: 'Material of hands' },
                },
              },
            ],
          },
          {
            oneOf: [
              {
                properties: {
                  colorHands: { type: 'string', enum: ['red', 'green', 'blue'], description: 'Color of hands' },
                  colorLegs: { type: 'string', enum: ['yellow', 'purple'], description: 'Color of legs' },
                },
              },
              {
                properties: {
                  transformable: { type: 'boolean', default: false },
                },
              },
            ],
          },
        ],
      }
      const expectedSchema = {
        oneOf: [
          {
            type: 'object',
            title: 'ROBOT',
            description: 'Robot Description',
            required: ['head', 'body'],
            properties: {
              head: { type: 'boolean', default: true },
              body: { type: 'string', enum: ['square', 'circle', 'triangle'] },
              hands: { type: 'number', description: 'Count of hands' },
              legs: { type: 'number', description: 'Count of legs' },
              colorHands: { type: 'string', enum: ['red', 'green', 'blue'], description: 'Color of hands' },
              colorLegs: { type: 'string', enum: ['yellow', 'purple'], description: 'Color of legs' },
            },
          },
          {
            type: 'object',
            title: 'ROBOT',
            description: 'Robot Description',
            required: ['head', 'body'],
            properties: {
              head: { type: 'boolean', default: true },
              body: { type: 'string', enum: ['square', 'circle', 'triangle'] },
              hands: { type: 'number', description: 'Count of hands' },
              legs: { type: 'number', description: 'Count of legs' },
              transformable: { type: 'boolean', default: false },
            },
          },
          {
            type: 'object',
            title: 'ROBOT',
            description: 'Robot Description',
            required: ['head', 'body'],
            properties: {
              head: { type: 'boolean', default: true },
              body: { type: 'string', enum: ['square', 'circle', 'triangle'] },
              hands: { type: 'string', enum: ['steel', 'wood'], description: 'Material of hands' },
              legs: { type: 'string', enum: ['steel', 'wood'], description: 'Material of hands' },
              colorHands: { type: 'string', enum: ['red', 'green', 'blue'], description: 'Color of hands' },
              colorLegs: { type: 'string', enum: ['yellow', 'purple'], description: 'Color of legs' },
            },
          },
          {
            type: 'object',
            title: 'ROBOT',
            description: 'Robot Description',
            required: ['head', 'body'],
            properties: {
              head: { type: 'boolean', default: true },
              body: { type: 'string', enum: ['square', 'circle', 'triangle'] },
              hands: { type: 'string', enum: ['steel', 'wood'], description: 'Material of hands' },
              legs: { type: 'string', enum: ['steel', 'wood'], description: 'Material of hands' },
              transformable: { type: 'boolean', default: false },
            },
          },
        ],
      }
      const actualSchema1 = normalize(originalSchema, DEFAULT_OPTIONS)
      expect(actualSchema1).toEqual(expectedSchema)
      const actualSchema2 = normalize(actualSchema1, DEFAULT_OPTIONS)
      expect(actualSchema2).toEqual(actualSchema1)
    })

    it('sibling + allOf[item, sibling + oneOf[sibling + allOf[item, item, oneOf[item, item]], item]]', () => {
      const originalSchema = {
        type: 'object',
        title: 'Robot',
        properties: {
          serialNumber: { type: 'string', format: 'FACTORYID_DEPARTMENTID_CATEGORYID_SERIESID_ITEMID' },
          head: { type: 'boolean', default: true },
          body: { type: 'string', enum: ['square', 'circle', 'triangle'] },
        },
        allOf: [
          { description: 'Robot Description' },
          {
            required: ['serialNumber'],
            oneOf: [
              {
                properties: { features: { type: 'array', description: 'Features of the Robot' } },
                allOf: [
                  { properties: { features: { items: { type: 'string' } } } },
                  { properties: { features: { enum: ['jetpack', 'laser eyes', 'coffee maker'] } } },
                  {
                    oneOf: [
                      {
                        properties: {
                          hands: { type: 'number', description: 'Count of hands' },
                          legs: { type: 'number', description: 'Count of legs' },
                        },
                      },
                      {
                        properties: {
                          hands: { type: 'string', enum: ['steel', 'wood'], description: 'Material of hands' },
                          legs: { type: 'string', enum: ['steel', 'wood'], description: 'Material of hands' },
                        },
                      },
                    ],
                  },
                ],
              },
              {
                description: 'Robot Prefab (Named set of robot params)',
                properties: {
                  prefabId: {
                    type: 'string',
                    description: 'Prefab ID',
                    enum: ['personal assistant', 'flying bot', 'military bot'],
                  },
                },
              },
            ],
          },
        ],
      }
      const expectedSchema = {
        oneOf: [
          {
            oneOf: [
              {
                description: 'Robot Description',
                required: ['serialNumber'],
                type: 'object',
                title: 'Robot',
                properties: {
                  serialNumber: { type: 'string', format: 'FACTORYID_DEPARTMENTID_CATEGORYID_SERIESID_ITEMID' },
                  head: { type: 'boolean', default: true },
                  body: { type: 'string', enum: ['square', 'circle', 'triangle'] },
                  features: {
                    type: 'array',
                    items: { type: 'string' },
                    enum: ['jetpack', 'laser eyes', 'coffee maker'],
                    description: 'Features of the Robot',
                  },
                  hands: { type: 'number', description: 'Count of hands' },
                  legs: { type: 'number', description: 'Count of legs' },
                },
              },
              {
                description: 'Robot Description',
                required: ['serialNumber'],
                type: 'object',
                title: 'Robot',
                properties: {
                  serialNumber: { type: 'string', format: 'FACTORYID_DEPARTMENTID_CATEGORYID_SERIESID_ITEMID' },
                  head: { type: 'boolean', default: true },
                  body: { type: 'string', enum: ['square', 'circle', 'triangle'] },
                  features: {
                    type: 'array',
                    items: { type: 'string' },
                    enum: ['jetpack', 'laser eyes', 'coffee maker'],
                    description: 'Features of the Robot',
                  },
                  hands: { type: 'string', enum: ['steel', 'wood'], description: 'Material of hands' },
                  legs: { type: 'string', enum: ['steel', 'wood'], description: 'Material of hands' },
                },
              },
            ],
          },
          {
            description: 'Robot Prefab (Named set of robot params)',
            required: ['serialNumber'],
            type: 'object',
            title: 'Robot',
            properties: {
              serialNumber: { type: 'string', format: 'FACTORYID_DEPARTMENTID_CATEGORYID_SERIESID_ITEMID' },
              head: { type: 'boolean', default: true },
              body: { type: 'string', enum: ['square', 'circle', 'triangle'] },
              prefabId: {
                type: 'string',
                description: 'Prefab ID',
                enum: ['personal assistant', 'flying bot', 'military bot'],
              },
            },
          },
        ],
      }
      const actualSchema1 = normalize(originalSchema, DEFAULT_OPTIONS)
      expect(actualSchema1).toEqual(expectedSchema)
      const actualSchema2 = normalize(actualSchema1, DEFAULT_OPTIONS)
      expect(actualSchema2).toEqual(actualSchema1)
    })

    it('sibling + allOf[item, sibling + allOf[item, oneOf[item, item]] + oneOf[sibling + allOf[item, oneOf[item]]]]', () => {
      const originalSchema = {
        type: 'object',
        properties: {
          serialNumber: { type: 'string', format: 'FACTORYID_DEPARTMENTID_CATEGORYID_SERIESID_ITEMID' },
        },
        allOf: [
          { title: 'Robot' },
          {
            properties: {
              head: { type: 'boolean', default: true },
              body: { type: 'string', enum: ['square', 'circle', 'triangle'] },
            },
            allOf: [
              {
                description: 'My Robot Description',
                required: ['serialNumber'],
              },
              {
                oneOf: [
                  {
                    properties: {
                      hands: { type: 'number', description: 'Count of hands' },
                      legs: { type: 'number', description: 'Count of legs' },
                    },
                  },
                  {
                    properties: {
                      hands: { type: 'string', enum: ['steel', 'wood'], description: 'Material of hands' },
                      legs: { type: 'string', enum: ['steel', 'wood'], description: 'Material of hands' },
                    },
                  },
                ],
              },
            ],
            oneOf: [
              {
                properties: {
                  hasVoice: { type: 'boolean' },
                  hasCoffeeMaker: { type: 'boolean' },
                },
              },
              {
                properties: {
                  hasLaserEyes: { type: 'boolean' },
                  hasWheels: { type: 'boolean' },
                },
              },
            ],
          },
        ],
      }
      const expectedSchema = {
        oneOf: [
          {
            title: 'Robot',
            description: 'My Robot Description',
            required: ['serialNumber'],
            properties: {
              head: { type: 'boolean', default: true },
              body: { type: 'string', enum: ['square', 'circle', 'triangle'] },
              serialNumber: { type: 'string', format: 'FACTORYID_DEPARTMENTID_CATEGORYID_SERIESID_ITEMID' },
              hands: { type: 'number', description: 'Count of hands' },
              legs: { type: 'number', description: 'Count of legs' },
              hasVoice: { type: 'boolean' },
              hasCoffeeMaker: { type: 'boolean' },
            },
            type: 'object',
          },
          {
            type: 'object',
            title: 'Robot',
            description: 'My Robot Description',
            required: ['serialNumber'],
            properties: {
              head: { type: 'boolean', default: true },
              body: { type: 'string', enum: ['square', 'circle', 'triangle'] },
              serialNumber: { type: 'string', format: 'FACTORYID_DEPARTMENTID_CATEGORYID_SERIESID_ITEMID' },
              hands: { type: 'number', description: 'Count of hands' },
              legs: { type: 'number', description: 'Count of legs' },
              hasLaserEyes: { type: 'boolean' },
              hasWheels: { type: 'boolean' },
            },
          },
          {
            type: 'object',
            title: 'Robot',
            description: 'My Robot Description',
            required: ['serialNumber'],
            properties: {
              head: { type: 'boolean', default: true },
              body: { type: 'string', enum: ['square', 'circle', 'triangle'] },
              serialNumber: { type: 'string', format: 'FACTORYID_DEPARTMENTID_CATEGORYID_SERIESID_ITEMID' },
              hands: { type: 'string', enum: ['steel', 'wood'], description: 'Material of hands' },
              legs: { type: 'string', enum: ['steel', 'wood'], description: 'Material of hands' },
              hasVoice: { type: 'boolean' },
              hasCoffeeMaker: { type: 'boolean' },
            },
          },
          {
            type: 'object',
            title: 'Robot',
            description: 'My Robot Description',
            required: ['serialNumber'],
            properties: {
              head: { type: 'boolean', default: true },
              body: { type: 'string', enum: ['square', 'circle', 'triangle'] },
              serialNumber: { type: 'string', format: 'FACTORYID_DEPARTMENTID_CATEGORYID_SERIESID_ITEMID' },
              hands: { type: 'string', enum: ['steel', 'wood'], description: 'Material of hands' },
              legs: { type: 'string', enum: ['steel', 'wood'], description: 'Material of hands' },
              hasLaserEyes: { type: 'boolean' },
              hasWheels: { type: 'boolean' },
            },
          },
        ],
      }
      const actualSchema1 = normalize(originalSchema, DEFAULT_OPTIONS)
      expect(actualSchema1).toEqual(expectedSchema)
      const actualSchema2 = normalize(actualSchema1, DEFAULT_OPTIONS)
      expect(actualSchema2).toEqual(actualSchema1)
    })

    it('Do NOT lift combiners if it is NOT necessary', () => {
      const originalSchema = {
        title: 'ROOT',
        type: 'object',
        description: 'ROOT description',
        properties: {
          first: {
            oneOf: [
              { type: 'string' },
              { type: 'number' },
            ],
          },
          second: {
            anyOf: [
              { type: 'boolean' },
              { type: 'integer' },
            ],
          },
        },
      }
      const expectedSchema = { ...originalSchema }
      const actualSchema = normalize(originalSchema, DEFAULT_OPTIONS)
      expect(actualSchema).toEqual(expectedSchema)
    })
  })

  describe('Unsupported input', () => {
    it('should ignore combiners inside "properties"', () => {
      const originalSchema = {
        type: 'object',
        properties: {
          first: {
            type: 'string',
          },
          oneOf: [
            {
              second: {
                type: 'number',
              },
              third: {
                type: 'boolean',
              },
            },
          ],
        },
      }
      const expectedSchema = originalSchema
      const actualSchema = normalize(originalSchema, DEFAULT_OPTIONS)
      expect(actualSchema).toEqual(expectedSchema)
    })

    it('should ignore combiners inside "patternProperties"', () => {
      const originalSchema = {
        type: 'object',
        patternProperties: {
          '^[a-z]$': { type: 'string' },
          '^[A-Z]$': { type: 'number' },
          oneOf: [
            { type: 'boolean' },
            { type: 'integer' },
          ],
        },
      }
      const actualSchema = normalize(originalSchema, DEFAULT_OPTIONS)
      expect(actualSchema).toEqual(originalSchema)
    })

    it('should ignore combiners inside "definitions"', () => {
      const originalSchema = {
        type: 'object',
        title: 'Root',
        definitions: {
          MyType: {
            type: 'array',
            items: {
              type: 'string',
            },
          },
          oneOf: [
            { type: 'number' },
            { type: 'boolean' },
          ],
        },
      }
      const actualSchema = normalize(originalSchema, DEFAULT_OPTIONS)
      expect(actualSchema).toEqual(originalSchema)
    })

    it('should throw for non object spec', () => {
      expect(() => {
        normalize(42)
      }).toThrow(/must be an object/)
    })
  })

  describe('Optional merge process stage', () => {
    it('should be possible to disable lifting combiners', () => {
      const originalSchema = {
        type: 'object',
        description: 'ROBOT',
        oneOf: [
          { title: 'Steel hands' },
          { title: 'Wood hands' },
        ],
        anyOf: [
          { format: 'With shoes' },
          { format: 'No shoes' },
        ],
      }
      const actualSchema = normalize(originalSchema)
      expect(actualSchema).toEqual(originalSchema)
    })
  })

  it('do not copy value if no need changes', () => {
    const sharedSchema = { title: 'Shared' }
    const originalSchema = {
      properties: {
        shared: sharedSchema,
        oneOf: {
          oneOf: [
            sharedSchema,
            sharedSchema,
          ],
        },
      },
    }
    const actualSchema = normalize(originalSchema, { originsFlag: TEST_ORIGINS_FLAG }) as typeof originalSchema
    expect(actualSchema.properties.shared).toBe(actualSchema.properties.oneOf.oneOf[0])
    expect(actualSchema.properties.shared).toBe(actualSchema.properties.oneOf.oneOf[1])
  })
})
