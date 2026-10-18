import { expect, test } from '@playwright/test'
import type { Locator } from '@playwright/test'
import { createItemGetter, type ItemGetterConfig } from './item-getter'

// Mock Locator for unit testing
class MockLocator implements Partial<Locator> {
  nth(): Locator {
    return new MockLocator() as unknown as Locator
  }

  filter(): Locator {
    return new MockLocator() as unknown as Locator
  }

  locator(): Locator {
    return new MockLocator() as unknown as Locator
  }
}

// Mock component class to capture constructor parameters
class MockComponent {
  constructor(
    public locator: Locator,
    public componentName?: string,
    public componentType?: string,
  ) {}
}

test.describe('item-getter unit tests', () => {
  let mockRootLocator: Locator
  let config: ItemGetterConfig<MockComponent>

  test.beforeEach(() => {
    mockRootLocator = new MockLocator() as unknown as Locator
    config = {
      constructor: MockComponent,
      rootLocator: mockRootLocator,
      componentTypes: {
        singular: 'row',
        plural: 'rows',
      },
    }
  })

  test.describe('componentName and componentType generation', () => {
    test('should generate correct description for all items (no arguments)', () => {
      const getItem = createItemGetter(config)
      const result = getItem()

      expect.soft(result.componentName).toBe('')
      expect.soft(result.componentType).toBe('all rows')
    })

    test('should generate correct description for nth item by index', () => {
      const getItem = createItemGetter(config)

      const first = getItem(1)
      expect.soft(first.componentName).toBe('')
      expect.soft(first.componentType).toBe('1st row')

      const fourth = getItem(4)
      expect.soft(fourth.componentName).toBe('')
      expect.soft(fourth.componentType).toBe('4th row')
    })

    test('should generate correct description for item by name', () => {
      const getItem = createItemGetter(config)
      const result = getItem('test-item')

      expect.soft(result.componentName).toBe('test-item')
      expect.soft(result.componentType).toBe('row')
    })

    test('should generate correct description for item by regex', () => {
      const getItem = createItemGetter(config)
      const regex = /test-.*-item/
      const result = getItem(regex)

      expect.soft(result.componentName).toBe('test-.*-item')
      expect.soft(result.componentType).toBe('row')
    })

    test('should generate correct description for nth item by name', () => {
      const getItem = createItemGetter(config)

      const first = getItem('test-item', 1)
      expect.soft(first.componentName).toBe('test-item')
      expect.soft(first.componentType).toBe('1st row')
    })

    test('should generate correct description for nth item by regex', () => {
      const getItem = createItemGetter(config)
      const regex = /test-.*-item/

      const first = getItem(regex, 1)
      expect.soft(first.componentName).toBe('test-.*-item')
      expect.soft(first.componentType).toBe('1st row')
    })
  })

  test.describe('edge cases', () => {
    test('should handle empty string names', () => {
      const getItem = createItemGetter(config)
      const result = getItem('')

      expect.soft(result.componentName).toBe('')
      expect.soft(result.componentType).toBe('row')
    })

    test('should handle special characters in names', () => {
      const getItem = createItemGetter(config)
      const specialName = 'test-item@#$%^&*()'
      const result = getItem(specialName)

      expect.soft(result.componentName).toBe(specialName)
      expect.soft(result.componentType).toBe('row')
    })

    test('should handle very long component type names', () => {
      const longConfig: ItemGetterConfig<MockComponent> = {
        ...config,
        componentTypes: {
          singular: 'very-long-component-type-name-that-describes-something-specific',
          plural: 'very-long-component-type-names-that-describe-something-specific',
        },
      }

      const getItem = createItemGetter(longConfig)
      const result = getItem()

      expect.soft(result.componentType).toBe('all very-long-component-type-names-that-describe-something-specific')
    })
  })
})
