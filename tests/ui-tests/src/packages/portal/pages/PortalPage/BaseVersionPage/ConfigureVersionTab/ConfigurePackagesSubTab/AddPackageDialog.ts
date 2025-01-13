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

import type { Page } from '@playwright/test'
import { Autocomplete } from '@shared/components/base'
import { BaseAddDialog } from '@shared/components/custom'

export class AddPackageDialog extends BaseAddDialog {

  readonly workspaceAc = new Autocomplete(this.rootLocator.getByTestId('WorkspaceAutocomplete'), 'Workspace')
  readonly packageAc = new Autocomplete(this.rootLocator.getByTestId('PackageAutocomplete'), 'Package / Dashboard')
  readonly versionAc = new Autocomplete(this.rootLocator.getByTestId('VersionAutocomplete'), 'Version')

  constructor(protected page: Page) {
    super(page)
  }

  async fillForm(params: {
    workspaceName?: string
    packageId: string
    version: string
  }): Promise<void> {
    if (params.workspaceName) {
      await this.workspaceAc.click()
      await this.workspaceAc.getListItem(params.workspaceName).click()
    }
    await this.packageAc.click()
    await this.packageAc.getListItem(params.packageId, { exact: false }).click()
    await this.versionAc.click()
    await this.versionAc.getListItem(params.version, { exact: false }).click()
  }
}
