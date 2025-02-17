import type { Locator } from '@playwright/test'
import { Button } from './Button'

export class TagButton extends Button {

  constructor(rootLocator: Locator, componentName?: string, componentType?: string) {
    super(rootLocator, componentName, componentType || 'tag button')
  }
}
