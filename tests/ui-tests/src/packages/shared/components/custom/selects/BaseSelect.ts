import type { Locator } from '@playwright/test'
import type { BaseList } from '@shared/components/custom/lists'

/** @deprecated */
export abstract class BaseSelect {

  abstract readonly button: Locator
  abstract readonly list: BaseList
}
