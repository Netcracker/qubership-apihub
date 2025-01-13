/**
 * Copyright 2024-2025 NetCracker Technology Corporation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

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
