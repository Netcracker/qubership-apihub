import type { Locator } from '@playwright/test'
import { DropdownMenu, ListItem } from '@shared/components/base'

export class MainUserMenu extends DropdownMenu {

  readonly logoutItm = new ListItem(this.page.getByTestId('LogoutMenuItem'), 'Logout')

  constructor(private readonly parentLocator: Locator) {
    super(parentLocator.getByTestId('UserMenuButton'), 'User')
  }
}
