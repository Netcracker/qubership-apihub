import { type Page } from '@playwright/test'
import { DocumentsFileViewToolbar } from '../DocumentsFileView/DocumentsFileViewToolbar'
import { DocumentsMdActionMenu } from '../../../DocumentsPackageTab/DocumentsMdActionMenu'

export class DocumentsMdViewToolbar extends DocumentsFileViewToolbar {

  readonly downloadMenu = new DocumentsMdActionMenu(this.page.getByTestId('DocumentToolbar').getByTestId('DocumentActionsButton'), 'Markdown')

  constructor(protected readonly page: Page) {
    super(page)
  }
}
