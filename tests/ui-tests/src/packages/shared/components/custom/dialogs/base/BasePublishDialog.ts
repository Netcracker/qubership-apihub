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
