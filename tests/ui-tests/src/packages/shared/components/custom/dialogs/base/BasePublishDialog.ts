import { test as report, type Page } from '@playwright/test'
import { Autocomplete, Button, Content } from '@shared/components/base'
import { ARCHIVED_VERSION_STATUS, DRAFT_VERSION_STATUS, RELEASE_VERSION_STATUS, type VersionStatuses } from '@shared/entities'
import { BaseDialog } from './BaseDialog'
import { VersionStatusAutocomplete } from './BasePublishDialog/VersionStatusAutocomplete'

export abstract class BasePublishDialog extends BaseDialog {

  readonly versionAc = new Autocomplete(this.rootLocator.getByTestId('VersionAutocomplete'), 'Version')
  readonly statusAc = new VersionStatusAutocomplete(this.page)
  readonly labelsAc = new Autocomplete(this.rootLocator.getByTestId('LabelsAutocomplete'), 'Labels')
  readonly errorMsg = new Content(this.rootLocator.getByTestId('ErrorTypography'), 'Error')
  readonly closeBtn = new Button(this.rootLocator.getByTestId('CancelButton'), 'Close')

  protected constructor(page: Page) {
    super(page)
  }

  async fillForm(params: BasePublishParams): Promise<void> {
    if (params.version) {
      await report.step('Set "Version"', async () => {
        await this.versionAc.fill(params.version!)
        await this.clickEmptySpace()
      })
    }
    if (params.status) {
      await report.step('Set "Status"', async () => {
        await this.statusAc.click()
        switch (params.status) {
          case RELEASE_VERSION_STATUS: {
            await this.statusAc.releaseItm.click()
            break
          }
          case DRAFT_VERSION_STATUS: {
            await this.statusAc.draftItm.click()
            break
          }
          case ARCHIVED_VERSION_STATUS: {
            await this.statusAc.archivedItm.click()
            break
          }
        }
      })
    }
    if (params.labels) {
      await report.step('Set "Labels"', async () => {
        for (const label of params.labels!) {
          await this.labelsAc.fill(label)
          await this.page.keyboard.press('Enter')
        }
      })
    }
  }
}

export type BasePublishParams = {
  version?: string
  status?: VersionStatuses
  labels?: string[]
}
