import type { Locator } from '@playwright/test'
import { BaseComponent } from './BaseComponent'

export class Backdrop extends BaseComponent {

  constructor(rootLocator: Locator, componentName?: string, componentType?: string) {
    super(rootLocator, componentName, componentType || 'backdrop')
  }
}
