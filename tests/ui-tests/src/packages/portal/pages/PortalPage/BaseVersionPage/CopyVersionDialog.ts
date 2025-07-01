import { test as report, type Page } from '@playwright/test'
import { Autocomplete, Button } from '@shared/components/base'
import type { BasePublishParams } from '@shared/components/custom'
import { BasePublishDialog } from '@shared/components/custom'

export class CopyVersionDialog extends BasePublishDialog {

  readonly workspaceAc = new Autocomplete(this.rootLocator.getByTestId('WorkspaceAutocomplete'), 'Workspace')
  readonly packageAc = new Autocomplete(this.rootLocator.getByTestId('PackageAutocomplete'), 'Package')
  readonly previousVersionAc = new Autocomplete(this.rootLocator.getByTestId('PreviousReleaseVersionAutocomplete'), 'Previous release version')
  readonly copyBtn = new Button(this.rootLocator.getByTestId('CopyButton'), 'Copy')

  constructor(protected readonly page: Page) {
    super(page)
  }

  async fillForm(params: CopyVersionParams): Promise<void> {
    if (params.workspace) {
      await report.step('Set "Workspace"', async () => {
        await this.workspaceAc.fill(params.workspace!.name)
        await this.workspaceAc.getListItem(`${params.workspace!.name} ${params.workspace!.packageId}`).click()
      })
    }
    if (params.package) {
      await report.step('Set "Package"', async () => {
        await this.packageAc.click()
        await this.packageAc.getListItem(`${params.package!.name} ${params.package!.packageId}`).click()
      })
    }
    await super.fillForm(params)
    if (params.previousVersion) {
      await report.step('Set "Previous release version"', async () => {
        await this.previousVersionAc.click()
        await this.previousVersionAc.getListItem(params.previousVersion).click()
      })
    }
  }
}

export type CopyVersionParams = BasePublishParams & {
  workspace?: {
    name: string
    packageId: string
  }
  package?: {
    name: string
    packageId: string
  }
  previousVersion?: string
}
