import type { Locator } from '@playwright/test'
import { nthPostfix } from './strings'

/**
 * Configuration for creating an item getter function
 */
export interface ItemGetterConfig<T> {
  /** Class constructor for the item */
  constructor: new(locator: Locator, componentName?: string, componentType?: string) => T
  /** Root locator to search within */
  rootLocator: Locator
  /** Use exact text matching by default */
  defaultExact?: boolean
  /** Navigate to parent element after filtering (useful for table rows) */
  navigateToParent?: boolean
  /** Component type names for descriptions */
  componentTypes: {
    singular: string
    plural: string
  }
}

/**
 * Item getter function with multiple overloads
 */
export interface ItemGetter<T> {
  (): T
  (nth: number): T
  (name: string | RegExp, nth?: number, options?: { exact?: boolean }): T
}

/**
 * Creates a flexible item getter function that can find elements by index or name
 * @param config - Configuration object
 * @returns Function that can get items by index, name, or return all items
 */
export function createItemGetter<T>(config: ItemGetterConfig<T>): ItemGetter<T> {
  function getItem(): T
  function getItem(nth: number): T
  function getItem(name: string | RegExp, nth?: number, options?: { exact?: boolean }): T
  /**
   * Gets items by different criteria
   * @param nameOrNth - Item name/regex or index number
   * @param nth - Which occurrence to get (when searching by name)
   * @param options - Search options
   * @returns The matching item(s)
   */
  function getItem(
    nameOrNth?: string | RegExp | number,
    nth?: number,
    options?: { exact?: boolean },
  ): T {
    // No arguments - return all items
    if (nameOrNth === undefined) {
      let locator = config.rootLocator
      if (config.navigateToParent) {
        locator = locator.locator('..')
      }
      return new config.constructor(locator, '', `all ${config.componentTypes.plural}`)
    }

    // First argument is number - get by index
    if (typeof nameOrNth === 'number') {
      let locator = config.rootLocator.nth(nameOrNth - 1)
      if (config.navigateToParent) {
        locator = locator.locator('..')
      }
      return new config.constructor(locator, '', `${nameOrNth}${nthPostfix(nameOrNth)} ${config.componentTypes.singular}`)
    }

    // First argument is string or RegExp - get by name
    const filterLocator = createFilteredLocator(config, nameOrNth, options)
    const nameStr = nameOrNth instanceof RegExp ? nameOrNth.source : nameOrNth

    // If nth is specified, get the nth match
    if (nth !== undefined) {
      const locator = filterLocator.nth(nth - 1)
      return new config.constructor(locator, `${nameStr}`, `${nth}${nthPostfix(nth)} ${config.componentTypes.singular}`)
    }

    // Return all matching elements
    return new config.constructor(filterLocator, `${nameStr}`, config.componentTypes.singular)
  }

  return getItem
}

/**
 * Creates a filtered locator based on name or regex
 * @param config - Item getter configuration
 * @param nameOrRegex - Text or regex to filter by
 * @param options - Filter options
 * @returns Filtered locator
 */
function createFilteredLocator<T>(
  config: ItemGetterConfig<T>,
  nameOrRegex: string | RegExp,
  options?: { exact?: boolean },
): Locator {
  let filterLocator: Locator

  if (nameOrRegex instanceof RegExp) {
    filterLocator = config.rootLocator.filter({ hasText: nameOrRegex })
  } else {
    const exact = options?.exact ?? config.defaultExact ?? true
    if (exact) {
      // Escape regex special characters to treat user input as literal text ($& = matched character replaced with itself but escaped)
      const escapedName = nameOrRegex.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const exactRegex = new RegExp(`^${escapedName}$`)
      filterLocator = config.rootLocator.filter({ hasText: exactRegex })
    } else {
      filterLocator = config.rootLocator.filter({ hasText: nameOrRegex })
    }
  }

  return config.navigateToParent ? filterLocator.locator('..') : filterLocator
}
