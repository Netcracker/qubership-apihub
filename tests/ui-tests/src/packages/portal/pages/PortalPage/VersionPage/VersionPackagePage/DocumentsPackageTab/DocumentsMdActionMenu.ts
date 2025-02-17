import type { Locator } from '@playwright/test'
import { ListItem } from '@shared/components/base'
import { DocumentsFileActionMenu } from './DocumentsFileActionMenu'

export class DocumentsMdActionMenu extends DocumentsFileActionMenu {

  readonly shareSourceLink = new ListItem(this.page.getByRole('menu').getByTestId('ShareSourceLinkMenuItem'), 'Public link to source')
  readonly shareDocPage = new ListItem(this.page.getByRole('menu').getByTestId('ShareDocumentLinkMenuItem'), 'Link to document page')
  readonly sharePageTemplate = new ListItem(this.page.getByRole('menu').getByTestId('ShareTemplateMenuItem'), 'Page template')

  constructor(rootLocator: Locator, componentName?: string, componentType?: string) {
    super(rootLocator, componentName, componentType)
  }
}
