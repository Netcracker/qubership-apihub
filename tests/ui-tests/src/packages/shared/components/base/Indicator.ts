import { BaseComponent } from './BaseComponent'
import type { Locator } from '@playwright/test'

export class Indicator extends BaseComponent {

  constructor(rootLocator: Locator, componentName?: string, componentType?: string) {
    super(rootLocator, componentName, componentType || 'indicator')
  }
}
