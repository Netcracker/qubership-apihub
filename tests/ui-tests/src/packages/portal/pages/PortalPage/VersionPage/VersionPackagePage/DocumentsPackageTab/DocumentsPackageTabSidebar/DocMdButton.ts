import type { Locator } from '@playwright/test'
import { DocumentButton } from './DocumentButton'
import { DocumentsMdActionMenu } from '../DocumentsMdActionMenu'

export class DocMdButton extends DocumentButton {

  readonly actionMenu = new DocumentsMdActionMenu(this.mainLocator.getByTestId('DocumentActionsButton'), this.componentName)

  constructor(rootLocator: Locator, componentName?: string, componentType?: string) {
    super(rootLocator, componentName, componentType)
  }
}
