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
import { SearchBar, Tab } from '@shared/components/base'
import { ActivityHistoryRecord } from './OverviewActivityHistoryTab/ActivityHistoryRecord'
import { nthPostfix } from '@services/utils'

export class OverviewActivityHistoryTab extends Tab {

  readonly searchbar = new SearchBar(this.rootLocator.getByTestId('SearchInHistory'), 'Activity History')

  // readonly filterMenu = new ActivityHistoryFilterMenu(this.rootLocator) //TODO for future

  constructor(readonly rootLocator: Locator) {
    super(rootLocator.getByTestId('ActivityHistoryButton'), 'Activity History')
  }

  getHistoryRecord(text?: string): ActivityHistoryRecord
  getHistoryRecord(nth?: number): ActivityHistoryRecord
  getHistoryRecord(text?: string, nth?: number): ActivityHistoryRecord
  getHistoryRecord(textOrNth?: string | number, nth?: number): ActivityHistoryRecord {
    if (typeof textOrNth === 'string' && !nth) {
      return new ActivityHistoryRecord(this.rootLocator.getByTestId('ActivityListItem').filter({ hasText: textOrNth }), textOrNth)
    }
    if (typeof textOrNth === 'number') {
      return new ActivityHistoryRecord(this.rootLocator.getByTestId('ActivityListItem').nth(textOrNth - 1), '', `${textOrNth}${nthPostfix(textOrNth)} activity history record`)
    }
    if (!textOrNth && !nth) {
      return new ActivityHistoryRecord(this.rootLocator.getByTestId('ActivityListItem'))
    }
    if (textOrNth && nth) {
      return new ActivityHistoryRecord(this.rootLocator.getByTestId('ActivityListItem').filter({ hasText: textOrNth }).nth(nth - 1), textOrNth, `${nth}${nthPostfix(nth)} activity history record`)
    }
    throw new Error('Check arguments')
  }
}
