import type { Locator } from '@playwright/test'
import { Button } from '@shared/components/base'
import type { HoverOptions } from '@shared/entities'
import { descriptiveHover } from '@shared/components/decorator'

export class ExchangeButton extends Button {

  constructor(rootLocator: Locator, componentName?: string, componentType?: string) {
    super(rootLocator, componentName, componentType || 'exchange button')
  }

  async hover(options?: HoverOptions): Promise<void> {
    const parentBtn = new Button(this.mainLocator.locator('..'), this.componentName, this.componentType)
    await descriptiveHover(parentBtn, options)
  }
}
