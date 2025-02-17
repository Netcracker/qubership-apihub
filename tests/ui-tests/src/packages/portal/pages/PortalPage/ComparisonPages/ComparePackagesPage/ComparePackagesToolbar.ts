import type { Page } from '@playwright/test'
import { BaseCompareToolbar } from '../BaseCompareToolbar'

export class ComparePackagesToolbar extends BaseCompareToolbar {

  constructor(protected readonly page: Page) {
    super(page)
  }
}
