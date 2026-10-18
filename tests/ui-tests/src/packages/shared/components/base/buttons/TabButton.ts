import type { Locator } from '@playwright/test'
import { Button } from './Button'

/** @deprecated Use **Tab** */
export class TabButton extends Button {

  constructor(rootLocator: Locator, componentName?: string, componentType?: string) {
    super(rootLocator, componentName, componentType || 'tab button')
  }
}
