import { type Page } from '@playwright/test'
import { DocumentsOpenapiActionMenu } from '../../../DocumentsPackageTab/DocumentsOpenapiActionMenu'
import { Button, SearchBar, Title } from '@shared/components/base'

export class DocumentsOpenapiViewToolbar {

  readonly title = new Title(this.page.getByTestId('DocumentToolbarTitle'), 'Document')
  readonly searchbar = new SearchBar(this.page.getByTestId('SearchOperations'), 'Operations')
  readonly overviewBtn = new Button(this.page.locator('button[value=overview]'), 'Overview')
  readonly operationsBtn = new Button(this.page.locator('button[value=operations]'), 'Operations')
  readonly downloadMenu = new DocumentsOpenapiActionMenu(this.page.getByTestId('DocumentToolbar').getByTestId('DocumentActionsButton'), 'Markdown')

  constructor(private readonly page: Page) { }
}
