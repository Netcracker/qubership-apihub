import type { Locator } from '@playwright/test'
import { BaseComponent, Content } from '@shared/components/base'

export class LineNumberContainer extends BaseComponent {
  readonly marker = new Content(this.rootLocator.locator('..').locator('.cmdr'), 'marker')

  constructor(rootLocator: Locator, componentName?: string) {
    super(rootLocator, componentName, 'line number')
  }
}
