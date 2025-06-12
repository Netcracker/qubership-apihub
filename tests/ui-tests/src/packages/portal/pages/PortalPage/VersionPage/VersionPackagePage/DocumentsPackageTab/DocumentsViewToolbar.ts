import { type Page } from '@playwright/test'
import { DocumentsActionMenu } from './DocumentsActionMenu'
import { Button, SearchBar, Title } from '@shared/components/base'

export class DocumentsViewToolbar {

  readonly title = new Title(this.page.getByTestId('DocumentToolbarTitle'), 'Document')
  readonly searchbar = new SearchBar(this.page.getByTestId('SearchOperations'), 'Operations')
  readonly overviewBtn = new Button(this.page.locator('button[value=overview]'), 'Overview')
  readonly operationsBtn = new Button(this.page.locator('button[value=operations]'), 'Operations')
  readonly moreMenu = new DocumentsActionMenu(this.page.getByTestId('DocumentToolbar').getByTestId('DocumentActionsButton'), 'More')

  constructor(private readonly page: Page) { }
}
