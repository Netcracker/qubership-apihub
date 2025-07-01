import type { Page } from '@playwright/test'
import { BaseSettingsTab } from './BaseSettingsTab'
import { Button, SearchBar } from '@shared/components/base'
import { AcUserRow } from './AccessControlTab/AcUserRow'
import { AcAddUserDialog } from './AccessTokensTab/AcAddUserDialog'
import { BaseRemoveDialog } from '@shared/components/custom'
import { nthPostfix } from '@services/utils'

export class AccessControlTab extends BaseSettingsTab {

  readonly helpBtn = new Button(this.page.getByTestId('AcHelpButton'), 'Help')
  readonly addUserBtn = new Button(this.page.getByTestId('AddUserButton'), 'Add User')
  readonly searchbar = new SearchBar(this.page.getByTestId('SearchUser'), 'Search User')
  readonly addUserDialog = new AcAddUserDialog(this.page)
  readonly deleteUserDialog = new BaseRemoveDialog(this.page)

  constructor(page: Page) {
    super(page.getByTestId('TabButton-members'), 'Access Control')
  }

  getUserRow(userName?: string): AcUserRow
  getUserRow(nth?: number): AcUserRow
  getUserRow(userName?: string, nth?: number): AcUserRow
  getUserRow(userNameOrNth?: string | number, nth?: number): AcUserRow {
    if (typeof userNameOrNth === 'string' && !nth) {
      return new AcUserRow(this.page.getByRole('cell', {
        name: userNameOrNth,
        exact: true,
      }).locator('..'), userNameOrNth)
    }
    if (typeof userNameOrNth === 'number') {
      return new AcUserRow(this.page.getByTestId('Cell-user').nth(userNameOrNth - 1).locator('..'), '', `${userNameOrNth}${nthPostfix(userNameOrNth)} user row`)
    }
    if (!userNameOrNth && !nth) {
      return new AcUserRow(this.page.getByTestId('Cell-user').locator('..'))
    }
    if (userNameOrNth && nth) {
      return new AcUserRow(this.page.getByRole('cell', {
          name: userNameOrNth,
          exact: true,
        }).locator('..').nth(nth - 1),
        userNameOrNth,
        `${nth}${nthPostfix(nth)} user row`)
    }
    throw new Error('Check arguments')
  }
}
