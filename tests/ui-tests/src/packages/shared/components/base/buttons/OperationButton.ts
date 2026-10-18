import type { Locator } from '@playwright/test'
import { Button } from './Button'

export class OperationButton extends Button {

  readonly componentType: string = 'operation button'

  constructor(rootLocator: Locator, componentName?: string, componentType?: string) {
    super(rootLocator, componentName, componentType || 'operation button')
  }
}
