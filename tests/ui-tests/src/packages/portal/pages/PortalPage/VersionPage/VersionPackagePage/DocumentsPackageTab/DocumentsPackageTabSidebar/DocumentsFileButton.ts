import type { Locator } from '@playwright/test'
import { Button } from '@shared/components/base'
import { DocumentsActionMenu } from '../DocumentsActionMenu'

export class DocumentsFileButton extends Button {

  readonly componentType: string = 'file button'
  readonly actionMenu = new DocumentsActionMenu(this.mainLocator.getByTestId('DocumentActionsButton'), this.componentName)

  constructor(rootLocator: Locator, componentName?: string, componentType?: string) {
    super(rootLocator, componentName, componentType)
  }

  async openActionMenu(): Promise<void> {
    await this.hover()
    await this.actionMenu.click()
  }
}
