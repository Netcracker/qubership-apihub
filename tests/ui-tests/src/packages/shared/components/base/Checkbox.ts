import type { CheckOptions } from '@shared/entities'
import { BaseComponent } from './BaseComponent'
import { descriptive } from '@shared/components/decorator'
import type { Locator } from '@playwright/test'

export class Checkbox extends BaseComponent {

  constructor(rootLocator: Locator, componentName?: string, componentType?: string) {
    super(rootLocator, componentName, componentType || 'checkbox')
  }

  @descriptive('Check')
  async check(options?: CheckOptions): Promise<void> {
    await this.mainLocator.check(options)
  }

  @descriptive('Uncheck')
  async uncheck(options?: CheckOptions): Promise<void> {
    await this.mainLocator.uncheck(options)
  }
}
