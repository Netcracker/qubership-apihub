import type { Locator } from '@playwright/test'
import { Button } from './Button'

export class RadioButton extends Button {

  constructor(rootLocator: Locator, componentName?: string, componentType?: string) {
    super(rootLocator, componentName, componentType || 'radio button')
  }
}
