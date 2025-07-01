import type { Page } from '@playwright/test'
import { ComparePackagesContent } from './ComparePackagesPage/ComparePackagesContent'
import { ComparePackagesSidebar } from './ComparePackagesPage/ComparePackagesSidebar'
import { ComparePackagesToolbar } from './ComparePackagesPage/ComparePackagesToolbar'
import { ComparisonSwapper } from './ComparisonSwapper'

export class ComparePackagesPage {

  readonly toolbar = new ComparePackagesToolbar(this.page)
  readonly sidebar = new ComparePackagesSidebar(this.page)
  readonly swapper = new ComparisonSwapper(this.page)
  readonly compareContent = new ComparePackagesContent(this.page)

  constructor(private readonly page: Page) { }
}
