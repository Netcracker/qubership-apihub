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
