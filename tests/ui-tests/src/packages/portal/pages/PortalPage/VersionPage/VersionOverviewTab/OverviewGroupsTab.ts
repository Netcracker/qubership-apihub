import { Locator, test as report } from '@playwright/test'
import { Button, Tab } from '@shared/components/base'
import { BaseDeleteDialog } from '@shared/components/custom'
import { OverviewGroupRow } from './OverviewGroupsTab/OverviewGroupRow'
import { CreateUpdateOperationGroupDialog } from './OverviewGroupsTab/CreateUpdateOperationGroupDialog'
import { EditOperationGroupDialog } from './OverviewGroupsTab/EditOperationGroupDialog'
import { getDownloadedFile, nthPostfix } from '@services/utils'
import type { DownloadedTestFile } from '@shared/entities'
import { PUBLISH_TIMEOUT } from '@test-setup'

export class OverviewGroupsTab extends Tab {

  readonly createGroupBtn = new Button(this.rootLocator.getByTestId('CreateGroupButton'), 'Create Group')
  readonly createUpdateOperationGroupDialog = new CreateUpdateOperationGroupDialog(this.page)
  readonly deleteOperationGroupDialog = new BaseDeleteDialog(this.page)
  readonly editOperationGroupDialog = new EditOperationGroupDialog(this.page)

  constructor(readonly rootLocator: Locator) {
    super(rootLocator.getByTestId('OperationGroupsButton'), 'Groups')
  }

  getGroupRow(groupName?: string, options?: { exact: boolean }): OverviewGroupRow
  getGroupRow(nth?: number): OverviewGroupRow
  getGroupRow(groupName?: string, options?: { exact: boolean }, nth?: number): OverviewGroupRow
  getGroupRow(groupNameOrNth?: string | number, options = { exact: false }, nth?: number): OverviewGroupRow {
    if (typeof groupNameOrNth === 'string' && !nth) {
      return new OverviewGroupRow(this.rootLocator.getByRole('cell', { name: groupNameOrNth, ...options }).locator('..'), groupNameOrNth)
    }
    if (typeof groupNameOrNth === 'number') {
      return new OverviewGroupRow(this.rootLocator.getByTestId('Cell-group-name').nth(groupNameOrNth - 1).locator('..'), '', `${groupNameOrNth}${nthPostfix(groupNameOrNth)} group row`)
    }
    if (!groupNameOrNth && !nth) {
      return new OverviewGroupRow(this.rootLocator.getByTestId('Cell-group-name').locator('..'))
    }
    if (groupNameOrNth && nth) {
      return new OverviewGroupRow(this.rootLocator.getByRole('cell', { name: groupNameOrNth, ...options }).locator('..').nth(nth - 1),
        groupNameOrNth,
        `${nth}${nthPostfix(nth)} group row`)
    }
    throw new Error('Check arguments')
  }

  async performExport(action: Promise<void>): Promise<DownloadedTestFile> {
    let file!: DownloadedTestFile
    await report.step('Export', async () => {
      const downloadPromise = this.page.waitForEvent('download', { timeout: PUBLISH_TIMEOUT })
      await action
      const download = await downloadPromise
      file = await getDownloadedFile(download)
    })
    return file
  }
}
