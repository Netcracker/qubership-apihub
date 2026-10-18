import type { Locator } from '@playwright/test'
import { Button } from './Button'

export class ActionMenuButton extends Button {

  constructor(rootLocator: Locator, componentName?: string, componentType?: string) {
    super(rootLocator, componentName, componentType || 'action menu button')
  }
}
