import type { Locator } from '@playwright/test'
import { BaseComponent } from './BaseComponent'

export class Tab extends BaseComponent {

  protected readonly page = this.rootLocator.page()

  constructor(rootLocator: Locator, componentName?: string, componentType?: string) {
    super(rootLocator, componentName, componentType || 'tab')
  }
}
