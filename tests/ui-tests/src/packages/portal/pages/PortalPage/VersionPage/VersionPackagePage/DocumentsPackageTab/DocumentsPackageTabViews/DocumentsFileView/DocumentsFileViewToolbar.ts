import { type Page } from '@playwright/test'
import { Title } from '@shared/components/base'
import { DocumentsFileActionMenu } from '../../DocumentsFileActionMenu'

export class DocumentsFileViewToolbar {

  readonly title = new Title(this.page.getByTestId('DocumentToolbarTitle'), 'Document')
  readonly downloadMenu = new DocumentsFileActionMenu(this.page.getByTestId('DocumentToolbar').getByTestId('DocumentActionsButton'), 'File')

  constructor(protected readonly page: Page) { }
}
