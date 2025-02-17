import type { Locator } from '@playwright/test'
import { DropdownMenu, ListItem } from '@shared/components/base'

export class CreatePackageMenu extends DropdownMenu {

  readonly groupItm = new ListItem(this.page.getByTestId('GroupMenuItem'), 'Group')
  readonly packageItm = new ListItem(this.page.getByTestId('PackageMenuItem'), 'Package')
  readonly dashboardItm = new ListItem(this.page.getByTestId('DashboardMenuItem'), 'Dashboard')

  constructor(parentLocator: Locator) {
    super(parentLocator.getByTestId('CreatePackageMenuButton'), 'Create Package')
  }
}
