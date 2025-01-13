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

import type { Locator } from '@playwright/test'
import { Button, Tab } from '@shared/components/base'
import { BaseDeleteDialog } from '@shared/components/custom'
import { OverviewGroupRow } from './OverviewGroupsTab/OverviewGroupRow'
import { CreateUpdateOperationGroupDialog } from './OverviewGroupsTab/CreateUpdateOperationGroupDialog'
import { EditOperationGroupDialog } from './OverviewGroupsTab/EditOperationGroupDialog'
import { nthPostfix } from '@services/utils'

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
}
