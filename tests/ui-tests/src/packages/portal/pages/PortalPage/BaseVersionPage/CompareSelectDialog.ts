import type { Page } from '@playwright/test'
import { Autocomplete, Button } from '@shared/components/base'
import { BaseCancelDialog } from '@shared/components/custom'
import type { Operation } from '@shared/entities'
import { expect } from '@services/expect-decorator'

export class CompareSelectDialog extends BaseCancelDialog {

  readonly previousWorkspaceAc = new Autocomplete(this.rootLocator.getByTestId('PreviousWorkspaceAutocomplete'), 'Previous Workspace')
  readonly currentWorkspaceAc = new Autocomplete(this.rootLocator.getByTestId('CurrentWorkspaceAutocomplete'), 'Current Workspace')
  readonly previousPackageAc = new Autocomplete(this.rootLocator.getByTestId('PreviousPackageAutocomplete'), 'Previous Package')
  readonly currentPackageAc = new Autocomplete(this.rootLocator.getByTestId('CurrentPackageAutocomplete'), 'Current Package')
  readonly previousDashboardAc = new Autocomplete(this.rootLocator.getByTestId('PreviousPackageAutocomplete'), 'Previous Dashboard')
  readonly currentDashboardAc = new Autocomplete(this.rootLocator.getByTestId('CurrentPackageAutocomplete'), 'Current Dashboard')
  readonly previousVersionAc = new Autocomplete(this.rootLocator.getByTestId('PreviousVersionAutocomplete'), 'Previous Version')
  readonly currentVersionAc = new Autocomplete(this.rootLocator.getByTestId('CurrentVersionAutocomplete'), 'Current Version')
  readonly previousRevisionAc = new Autocomplete(this.rootLocator.getByTestId('PreviousRevisionAutocomplete'), 'Previous Revision')
  readonly currentRevisionAc = new Autocomplete(this.rootLocator.getByTestId('CurrentRevisionAutocomplete'), 'Current Revision')
  readonly previousGroupAc = new Autocomplete(this.rootLocator.getByTestId('OriginalGroupAutocomplete'), 'Previous Group')
  readonly currentGroupAc = new Autocomplete(this.rootLocator.getByTestId('ChangedGroupAutocomplete'), 'Current Group')
  readonly previousOperationAc = new Autocomplete(this.rootLocator.getByTestId('OriginalOperationAutocomplete'), 'Previous Operation')
  readonly currentOperationAc = new Autocomplete(this.rootLocator.getByTestId('ChangedOperationAutocomplete'), 'Current Operation')
  readonly compareBtn = new Button(this.rootLocator.getByTestId('CompareButton'), 'Compare')
  readonly swapBtn = new Button(this.rootLocator.getByTestId('SwapButton'), 'Swap')
  readonly changePackagesBtn = new Button(this.rootLocator.getByTestId('ChangePackagesButton'), 'Change Packages')
  readonly changeDashboardsBtn = new Button(this.rootLocator.getByTestId('ChangePackagesButton'), 'Change Dashboards')

  constructor(page: Page) {
    super(page)
  }

  async fillForm(params: Partial<{
    previousWorkspace: string
    currentWorkspace: string
    previousPackage: string
    currentPackage: string
    previousVersion: string
    currentVersion: string
    previousRevision: string
    currentRevision: string
    previousGroup: string
    currentGroup: string
    previousOperation: Operation
    currentOperation: Operation
  }>): Promise<void> {
    if (params.previousWorkspace || params.currentWorkspace || params.previousPackage || params.currentPackage) {
      await this.changePackagesBtn.click()
      await expect(this.previousWorkspaceAc).not.toBeEmpty() //to prevent fields data resetting
    }
    if (params.previousWorkspace) {
      await this.previousWorkspaceAc.click()
      await this.previousWorkspaceAc.getListItem(params.previousWorkspace).click()
    }
    if (params.currentWorkspace) {
      await this.currentWorkspaceAc.click()
      await this.currentWorkspaceAc.getListItem(params.currentWorkspace).click()
    }
    if (params.previousPackage) {
      await this.previousPackageAc.clear()
      await this.previousPackageAc.click()
      await this.previousPackageAc.getListItem(params.previousPackage).click()
    }
    if (params.currentPackage) {
      await this.previousPackageAc.clear()
      await this.currentPackageAc.click()
      await this.currentPackageAc.getListItem(params.currentPackage).click()
    }
    if (params.previousVersion) {
      await this.previousVersionAc.click()
      await this.previousVersionAc.getListItem(params.previousVersion).click()
    }
    if (params.currentVersion) {
      await this.currentVersionAc.click()
      await this.currentVersionAc.getListItem(params.currentVersion).click()
    }
    if (params.previousRevision) {
      await this.previousRevisionAc.click()
      await this.previousRevisionAc.getListItem(params.previousRevision, { exact: false }).click()
    }
    if (params.currentRevision) {
      await this.currentRevisionAc.click()
      await this.currentRevisionAc.getListItem(params.currentRevision, { exact: false }).click()
    }
    if (params.previousGroup) {
      await this.previousGroupAc.click()
      await this.previousGroupAc.getListItem(params.previousGroup).click()
    }
    if (params.currentGroup) {
      await this.currentGroupAc.click()
      await this.currentGroupAc.getListItem(params.currentGroup).click()
    }
    if (params.previousOperation) {
      await this.previousOperationAc.clear()
      await this.previousOperationAc.click()
      await this.previousOperationAc.getListItem(`${params.previousOperation.title} ${params.previousOperation.path} ${params.previousOperation.method}`).click()
    }
    if (params.currentOperation) {
      await this.previousOperationAc.clear()
      await this.previousOperationAc.click()
      await this.previousOperationAc.getListItem(`${params.currentOperation.title} ${params.currentOperation.path} ${params.currentOperation.method}`).click()
    }
  }
}
