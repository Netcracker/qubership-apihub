import type { Locator } from '@playwright/test'

export type ComponentParams = {
  locator: Locator
  componentName?: string
  componentType?: string
}
