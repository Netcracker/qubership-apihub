import type { Page } from '@playwright/test'
import { ComparisonSwapper } from './ComparisonSwapper'
import { CompareOperationsToolbar } from './CompareOperationsPage/CompareOperationsToolbar'
import { CompareOperationsSidebar } from './CompareOperationsPage/CompareOperationsSidebar'
import { DiffDocView, DiffRawView } from '@shared/components/custom'

export class CompareOperationsPage {

  readonly toolbar = new CompareOperationsToolbar(this.page)
  readonly sidebar = new CompareOperationsSidebar(this.page)
  readonly swapper = new ComparisonSwapper(this.page)
  readonly docView = new DiffDocView(this.page)
  readonly rawView = new DiffRawView(this.page)

  constructor(private readonly page: Page) { }
}
