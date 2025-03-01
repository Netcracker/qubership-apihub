import type { Locator } from '@playwright/test'
import { Button } from '@shared/components/base'
import type { HoverOptions } from '@shared/entities'
import { descriptive } from '@shared/components/decorator'

export class ExchangeButton extends Button {

  constructor(rootLocator: Locator, componentName?: string, componentType?: string) {
    super(rootLocator, componentName, componentType || 'exchange button')
  }

  @descriptive('Hover', true)
  async hover(options?: HoverOptions): Promise<void> {
    const parentBtn = new Button(this.mainLocator.locator('..'), this.componentName, this.componentType)
    await parentBtn.hover(options)
  }
}
