import type { CheckOptions } from '@shared/entities'
import { BaseComponent } from './BaseComponent'
import { descriptiveCheck, descriptiveUncheck } from '@shared/components/decorator'
import type { Locator } from '@playwright/test'

export class Checkbox extends BaseComponent {

  constructor(rootLocator: Locator, componentName?: string, componentType?: string) {
    super(rootLocator, componentName, componentType || 'checkbox')
  }

  async check(options?: CheckOptions): Promise<void> {
    await descriptiveCheck(this, options)
  }

  async uncheck(options?: CheckOptions): Promise<void> {
    await descriptiveUncheck(this, options)
  }
}
