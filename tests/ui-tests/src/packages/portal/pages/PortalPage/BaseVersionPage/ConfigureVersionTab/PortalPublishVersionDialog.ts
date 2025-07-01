import { test as report, type Page } from '@playwright/test'
import { Autocomplete, Button } from '@shared/components/base'
import type { BasePublishParams } from '@shared/components/custom'
import { BasePublishDialog } from '@shared/components/custom'

export class PortalPublishVersionDialog extends BasePublishDialog {

  readonly previousVersionAc = new Autocomplete(this.rootLocator.getByTestId('PreviousReleaseVersionAutocomplete'), 'Previous release version')
  readonly publishBtn = new Button(this.rootLocator.getByTestId('PublishButton'), 'Publish')

  constructor(protected readonly page: Page) {
    super(page)
  }

  async fillForm(params: PortalPublishParams): Promise<void> {
    await super.fillForm(params)
    if (params.previousVersion) {
      await report.step('Fill "Previous release version"', async () => {
        await this.previousVersionAc.click()
        await this.previousVersionAc.getListItem(params.previousVersion).click()
      })
    }
  }
}

export type PortalPublishParams = BasePublishParams & {
  previousVersion?: string
}
