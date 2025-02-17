import type { Locator } from '@playwright/test'
import { Button, type DropdownMenu } from '@shared/components/base'

export abstract class DocumentButton extends Button {

  readonly componentType: string = 'document button'
  abstract readonly actionMenu: DropdownMenu

  protected constructor(rootLocator: Locator, componentName?: string, componentType?: string) {
    super(rootLocator, componentName, componentType)
  }

  async openActionMenu(): Promise<void> {
    await this.hover()
    await this.actionMenu.click()
  }
}
