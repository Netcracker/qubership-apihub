import { test as report, type Page } from '@playwright/test'
import { Autocomplete, Button } from '@shared/components/base'
import type { BasePublishParams } from '@shared/components/custom'
import { BasePublishDialog } from '@shared/components/custom'

export class PortalPublishVersionDialog extends BasePublishDialog {

  readonly previousVersionPackageAc = new Autocomplete(this.rootLocator.getByTestId('PreviousVersionPackageAutocomplete'), 'Previous version package')
  readonly previousVersionAc = new Autocomplete(this.rootLocator.getByTestId('PreviousReleaseVersionAutocomplete'), 'Previous version')
  readonly publishBtn = new Button(this.rootLocator.getByTestId('PublishButton'), 'Publish')

  constructor(protected readonly page: Page) {
    super(page)
  }

  async fillForm(params: PortalPublishParams): Promise<void> {
    await super.fillForm(params)
    if (params.previousVersionPackage) {
      const { name, packageId } = params.previousVersionPackage
      await report.step('Set "Previous version package"', async () => {
        await this.previousVersionPackageAc.fill(name)
        await this.previousVersionPackageAc.getListItem(`${name} ${packageId}`).click()
      })
    }
    if (params.previousVersion) {
      await report.step('Fill "Previous version"', async () => {
        await this.previousVersionAc.click()
        await this.previousVersionAc.getListItem(params.previousVersion).click()
      })
    }
  }
}

export type PortalPublishParams = BasePublishParams & {
  /** Selecting a package resets "Previous version", so it is set before it */
  previousVersionPackage?: {
    name: string
    packageId: string
  }
  previousVersion?: string
}
