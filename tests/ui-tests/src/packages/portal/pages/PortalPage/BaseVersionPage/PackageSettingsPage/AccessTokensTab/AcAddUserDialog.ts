import { type Page } from '@playwright/test'
import { Autocomplete } from '@shared/components/base'
import { BaseAddDialog } from '@shared/components/custom'
import type { Roles } from '@shared/entities'

export class AcAddUserDialog extends BaseAddDialog {

  readonly usersAc = new Autocomplete(this.rootLocator.getByTestId('UsersAutocomplete'), 'Users')
  readonly rolesAc = new Autocomplete(this.rootLocator.getByTestId('RolesAutocomplete'), 'Roles')

  constructor(page: Page) {
    super(page)
  }

  async fillForm(user?: string, role?: Roles): Promise<void>
  async fillForm(user?: string, roles?: Roles[]): Promise<void>
  async fillForm(users?: string[], role?: Roles): Promise<void>
  async fillForm(users?: string[], roles?: Roles[]): Promise<void>
  async fillForm(users?: string | string[], roles?: Roles | Roles[]): Promise<void> {
    if (users) {
      await this.usersAc.set(users, { fillItemName: true })
    }
    if (roles) {
      await this.rolesAc.set(roles, { fillItemName: true })
    }
  }
}
