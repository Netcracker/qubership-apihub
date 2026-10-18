import { type Locator } from '@playwright/test'
import { Checkbox } from '@shared/components/base'

export class Switch extends Checkbox {

  constructor(rootLocator: Locator, componentName?: string, componentType?: string) {
    super(rootLocator, componentName, componentType || 'switch')
  }
}
