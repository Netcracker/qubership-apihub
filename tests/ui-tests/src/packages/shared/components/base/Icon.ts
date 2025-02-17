import { BaseComponent } from './BaseComponent'
import type { Locator } from '@playwright/test'

export class Icon extends BaseComponent {

  constructor(rootLocator: Locator, componentName?: string, componentType?: string) {
    super(rootLocator, componentName, componentType || 'icon')
  }
}
