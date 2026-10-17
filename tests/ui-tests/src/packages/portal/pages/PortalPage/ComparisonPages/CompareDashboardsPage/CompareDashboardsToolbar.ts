import type { Page } from '@playwright/test'
import { BaseCompareToolbar } from '../BaseCompareToolbar'

export class CompareDashboardsToolbar extends BaseCompareToolbar {

  constructor(protected readonly page: Page) {
    super(page)
  }
}
