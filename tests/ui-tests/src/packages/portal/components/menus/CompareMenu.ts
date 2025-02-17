import type { Page } from '@playwright/test'
import { DropdownMenu, ListItem } from '@shared/components/base'

export class CompareMenu extends DropdownMenu {

  readonly versionsItm = new ListItem(this.page.getByTestId('VersionsMenuItem'), 'Versions')
  readonly operationsItm = new ListItem(this.page.getByTestId('OperationsMenuItem'), 'Operations')
  readonly revisionsItm = new ListItem(this.page.getByTestId('RevisionsMenuItem'), 'Revisions')
  readonly groupsItm = new ListItem(this.page.getByTestId('RestGroupsMenuItem'), 'REST Groups')

  constructor(page: Page) {
    super(page.getByTestId('CompareMenuButton'), 'Compare')
  }
}
