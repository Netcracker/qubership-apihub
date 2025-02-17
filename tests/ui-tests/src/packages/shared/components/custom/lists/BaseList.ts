import type { Locator } from '@playwright/test'

/** @deprecated */
export abstract class BaseList {

  abstract getListItem(itemName: string, options?: {exact: boolean}): Locator
}
