import type { Locator } from '@playwright/test'
import { BaseComponent } from './BaseComponent'

export class Placeholder extends BaseComponent {

  constructor(rootLocator: Locator, componentName?: string, componentType?: string) {
    super(rootLocator, componentName, componentType || 'placeholder')
  }
}
