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
