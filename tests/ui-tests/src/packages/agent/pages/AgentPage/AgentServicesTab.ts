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

import { type Page, test as report } from '@playwright/test'
import type { AgentConfig, PromoteConfig, SnapshotConfig } from '@agent/entities'
import { BWC_ERRORS_FILTER, NO_BASELINE_FILTER, NO_BWC_ERRORS_FILTER, SUCCESS_STEP_STATUS } from '@agent/entities'
import { AgentPage } from '../AgentPage'
import { AgentSpecViewPopup } from './ServicesTab/AgentSpecViewPopup'
import { Autocomplete, Button, Checkbox, Content, SearchBar, Select, Tab } from '@shared/components/base'
import { AgentServiceRow } from './ServicesTab/AgentServiceRow'
import { AgentDocRow } from './ServicesTab/AgentDocRow'
import { expect } from '@services/expect-decorator'
import { DISCOVERY_TIMEOUT, SNAPSHOT_TIMEOUT } from '@test-setup'
import { AgentServicesStepper } from './ServicesTab/AgentServicesStepper'
import { nthPostfix } from '@services/utils'

export class AgentServicesTab extends Tab {

  readonly stepper = new AgentServicesStepper(this.page)
  readonly searchBar = new SearchBar(this.page.getByTestId('SearchBar'))
  readonly runDiscoveryBtn = new Button(this.page.getByTestId('RunDiscoveryButton'), 'Run Discovery')
  readonly restartDiscoveryBtn = new Button(this.page.getByTestId('RestartDiscoveryButton'), 'Restart Discovery')
  readonly snapshotNameAc = new Autocomplete(this.page.getByTestId('SnapshotNameAutocomplete'), 'Snapshot Name')
  readonly baselineAc = new Autocomplete(this.page.getByTestId('BaselineAutocomplete'), 'Baseline')
  readonly resetBtn = new Button(this.page.getByTestId('ResetButton'), 'Reset')
  readonly createSnapshotBtn = new Button(this.page.getByTestId('CreateSnapshotButton'), 'Create Snapshot')
  readonly bwcErrorsBtn = new Button(this.page.locator(`button[value="${BWC_ERRORS_FILTER}"]`), 'BWC Errors')
  readonly noBwcErrorsBtn = new Button(this.page.locator(`button[value="${NO_BWC_ERRORS_FILTER}"]`), 'No BWC Errors')
  readonly noBaselineBtn = new Button(this.page.locator(`button[value="${NO_BASELINE_FILTER}"]`), 'No Baseline')
  readonly versionAc = new Autocomplete(this.page.getByTestId('VersionAutocomplete'), 'Version')
  readonly previousVersionAc = new Autocomplete(this.page.getByTestId('PreviousVersionAutocomplete'), 'Previous Version')
  readonly statusSlt = new Select(this.page.getByTestId('StatusSelect').getByRole('button'), 'Status')
  readonly promoteVersionBtn = new Button(this.page.getByTestId('PromoteVersionButton'), 'Promote Version')
  readonly rePromoteVersionBtn = new Button(this.page.getByTestId('RePromoteVersionButton'), 'Re-Promote Version')
  readonly versionFormatError = new Content(this.page.getByTestId('VersionFormatErrorTypography'), 'Version Format Error')
  readonly onlyAvailableServicesCbx = new Checkbox(this.page.getByTestId('OnlyPromotableCheckbox').getByRole('checkbox'), 'Only available services')
  readonly allServicesCbx = new Checkbox(this.page.getByTestId('HeadCell-selection').getByRole('checkbox'), 'All services')
  readonly specViewPopup = new AgentSpecViewPopup(this.page)

  constructor(page: Page) {
    super(page.getByTestId('ServicesTabButton'), 'Cloud Services')
  }

  async discoverIfNot(): Promise<void> {
    if (!await this.isDiscovered()) {
      await this.runDiscovery()
    }
  }

  async restartDiscovery(): Promise<void> {
    await report.step('Restart Discovery', async () => {
      await this.restartDiscoveryBtn.click()
      await expect(this.stepper.discoverIndicator.progressBar).toBeVisible()
      await expect(this.stepper.discoverIndicator.progressBar).toBeHidden({ timeout: DISCOVERY_TIMEOUT })
      await expect(this.restartDiscoveryBtn).toBeVisible()
    })
  }

  getServiceRow(serviceName?: string, exact?: boolean): AgentServiceRow
  getServiceRow(nth?: number): AgentServiceRow
  getServiceRow(serviceName?: string, exact?: boolean, nth?: number): AgentServiceRow
  getServiceRow(serviceNameOrNth?: string | number, exact = true, nth?: number): AgentServiceRow {
    if (typeof serviceNameOrNth === 'string' && !nth) {
      return new AgentServiceRow(this.page.getByRole('cell', {
        name: serviceNameOrNth,
        exact: exact,
      }).locator('..'), serviceNameOrNth)
    }
    if (typeof serviceNameOrNth === 'number') {
      return new AgentServiceRow(this.page.getByTestId('Cell-service-or-documentation').nth(serviceNameOrNth - 1).locator('..'), '', `${serviceNameOrNth}${nthPostfix(serviceNameOrNth)} service row`)
    }
    if (!serviceNameOrNth && !nth) {
      return new AgentServiceRow(this.page.getByTestId('Cell-service-or-documentation').locator('..'))
    }
    if (serviceNameOrNth && nth) {
      return new AgentServiceRow(this.page.getByRole('cell', {
          name: serviceNameOrNth,
          exact: exact,
        }).locator('..').nth(nth - 1),
        serviceNameOrNth,
        `${nth}${nthPostfix(nth)} service row`)
    }
    throw new Error('Check arguments')
  }

  getDocRow(docName?: string, exact?: boolean): AgentDocRow
  getDocRow(nth?: number): AgentDocRow
  getDocRow(docName?: string, exact?: boolean, nth?: number): AgentDocRow
  getDocRow(docNameOrNth?: string | number, exact = true, nth?: number): AgentDocRow {
    if (typeof docNameOrNth === 'string' && !nth) {
      return new AgentDocRow(this.page.getByRole('cell', {
        name: docNameOrNth,
        exact: exact,
      }).locator('..'), docNameOrNth)
    }
    if (typeof docNameOrNth === 'number') {
      return new AgentDocRow(this.page.getByTestId('Cell-service-or-documentation').nth(docNameOrNth - 1).locator('..'), '', `${docNameOrNth}${nthPostfix(docNameOrNth)} doc row`)
    }
    if (!docNameOrNth && !nth) {
      return new AgentDocRow(this.page.getByTestId('Cell-service-or-documentation').locator('..'))
    }
    if (docNameOrNth && nth) {
      return new AgentDocRow(this.page.getByRole('cell', {
          name: docNameOrNth,
          exact: exact,
        }).locator('..').nth(nth - 1),
        docNameOrNth,
        `${nth}${nthPostfix(nth)} doc row`)
    }
    throw new Error('Check arguments')
  }

  async fillSnapshotProps(config: SnapshotConfig): Promise<void> {
    await report.step(`Fill "${config.name}" snapshot props`, async () => {
      await this.snapshotNameAc.fill(config.name)
      await this.baselineAc.focus()
      await this.baselineAc.set(config.baseline, { fillItemName: true })
      if (config.allServices) {
        await this.allServicesCbx.click()
      } else {
        for (const service of config.services!) {
          await this.getServiceRow(service).checkbox.click()
        }
      }
    })
  }

  async createSnapshot(config: SnapshotConfig): Promise<void> {
    await report.step(`Create "${config.name}" snapshot`, async () => {
      await expect(this.getServiceRow(1)).toBeVisible({ timeout: SNAPSHOT_TIMEOUT })
      await this.fillSnapshotProps(config)
      await this.createSnapshotBtn.click()
      await expect(this.stepper.snapshotIndicator.status).toHaveText(SUCCESS_STEP_STATUS, { timeout: SNAPSHOT_TIMEOUT })
    })
  }

  async fillPromoteProps(config: PromoteConfig): Promise<void> {
    await report.step(`Fill "${config.version}" version props`, async () => {
      await this.versionAc.fill(config.version)
      await this.statusSlt.click()
      await this.statusSlt.getListItem(config.status).click()
      if (config.allServices) {
        await this.allServicesCbx.click()
      } else {
        for (const service of config.services!) {
          await this.getServiceRow(service).checkbox.click()
        }
      }
    })
  }

  async promoteVersion(config: PromoteConfig): Promise<void> {
    await report.step(`Promote "${config.version}" version with "${config.status}" status`, async () => {
      await this.fillPromoteProps(config)
      await this.promoteVersionBtn.click()
      await expect(this.stepper.promoteIndicator.status).toHaveText(SUCCESS_STEP_STATUS, { timeout: SNAPSHOT_TIMEOUT })
    })
  }

  async gotoSnapshotStep(config?: AgentConfig): Promise<void> {
    const agentPage = new AgentPage(this.page)
    await agentPage.gotoServicesTab(config)
    await this.discoverIfNot()
    await report.step('Navigate to the \'Create Snapshot\' step', async () => {
      await this.stepper.nextBtn.click()
      await expect(this.createSnapshotBtn).toBeVisible()
    })
  }

  async gotoValidationStep(snapshot: SnapshotConfig, config?: AgentConfig): Promise<void> {
    await this.gotoSnapshotStep(config)
    await this.createSnapshot(snapshot)
    await report.step('Navigate to the \'Validation Results\' step', async () => {
      await this.stepper.nextBtn.click()
      await expect(this.noBwcErrorsBtn).toBeVisible()
    })
  }

  async gotoPromoteStep(snapshot: SnapshotConfig, config?: AgentConfig): Promise<void> {
    await this.gotoValidationStep(snapshot, config)
    await report.step('Navigate to the \'Promote Version\' step', async () => {
      await this.stepper.nextBtn.click()
      await expect(this.promoteVersionBtn).toBeVisible()
      await expect(this.getServiceRow(1)).toBeVisible()
    })
  }

  async gotoPromoteFromDiscover(snapshot: SnapshotConfig): Promise<void> {
    await report.step('Navigate to the \'Promote Version\' step', async () => {
      await this.stepper.nextBtn.click()
      await expect(this.createSnapshotBtn).toBeVisible()
      await this.createSnapshot(snapshot)
      await this.stepper.nextBtn.click()
      await expect(this.noBwcErrorsBtn).toBeVisible()
      await this.stepper.nextBtn.click()
      await expect(this.promoteVersionBtn).toBeVisible()
      await expect(this.getServiceRow(1)).toBeVisible()
    })
  }

  private async runDiscovery(): Promise<void> {
    await report.step('Run Discovery', async () => {
      await this.runDiscoveryBtn.click()
      await expect(this.stepper.discoverIndicator.progressBar).toBeVisible()
      await expect(this.stepper.discoverIndicator.progressBar).toBeHidden({ timeout: DISCOVERY_TIMEOUT })
      await expect(this.restartDiscoveryBtn).toBeVisible()
    })
  }

  private async isDiscovered(): Promise<boolean> {
    let result = false
    await report.step('Check if this Namespace has already been discovered', async () => {
      let timeout = 2_000
      for (let i = 0; i < 2; i++) {
        await this.page.waitForTimeout(timeout)
        if (await this.restartDiscoveryBtn.mainLocator.isVisible()) {
          result = true
          return
        }
        timeout *= 2
      }
    })
    return result
  }
}
