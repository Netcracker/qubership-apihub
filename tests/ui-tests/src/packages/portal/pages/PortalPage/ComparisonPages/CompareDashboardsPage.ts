import type { Page } from '@playwright/test'
import { CompareDashboardsContent } from './CompareDashboardsPage/CompareDashboardsContent'
import { CompareDashboardsToolbar } from './CompareDashboardsPage/CompareDashboardsToolbar'
import { ComparisonSwapper } from './ComparisonSwapper'

export class CompareDashboardsPage {

  readonly toolbar = new CompareDashboardsToolbar(this.page)
  readonly swapper = new ComparisonSwapper(this.page)
  readonly compareContent = new CompareDashboardsContent(this.page)

  constructor(private readonly page: Page) { }
}
