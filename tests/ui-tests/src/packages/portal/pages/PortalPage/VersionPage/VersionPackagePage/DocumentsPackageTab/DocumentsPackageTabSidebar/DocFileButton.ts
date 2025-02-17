import type { Locator } from '@playwright/test'
import { DocumentButton } from './DocumentButton'
import { DocumentsFileActionMenu } from '../DocumentsFileActionMenu'

export class DocFileButton extends DocumentButton {

  readonly componentType: string = 'file button'
  readonly actionMenu = new DocumentsFileActionMenu(this.mainLocator.getByTestId('DocumentActionsButton'), this.componentName)

  constructor(rootLocator: Locator, componentName?: string, componentType?: string) {
    super(rootLocator, componentName, componentType)
  }
}
