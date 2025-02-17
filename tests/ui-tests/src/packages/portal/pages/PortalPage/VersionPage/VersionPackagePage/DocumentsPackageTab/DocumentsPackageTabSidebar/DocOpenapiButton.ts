import type { Locator } from '@playwright/test'
import { DocumentButton } from './DocumentButton'
import { DocumentsOpenapiActionMenu } from '../DocumentsOpenapiActionMenu'

export class DocOpenapiButton extends DocumentButton {

  readonly actionMenu = new DocumentsOpenapiActionMenu(this.mainLocator.getByTestId('DocumentActionsButton'), this.componentName)

  constructor(rootLocator: Locator, componentName?: string, componentType?: string) {
    super(rootLocator, componentName, componentType)
  }
}
