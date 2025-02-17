import type { Page } from '@playwright/test'
import { PackageComparisonRow } from './CompareDashboardsContent/PackageComparisonRow'
import { Placeholder } from '@shared/components/base'

export class CompareDashboardsContent {

  readonly noDiffPh = new Placeholder(this.page.getByTestId('NoDifferencesPlaceholder'), 'No Differences')

  constructor(private readonly page: Page) { }

  getPackageRow(pkg?: { name: string }): PackageComparisonRow {
    if (pkg) {
      return new PackageComparisonRow(this.page.getByRole('link').filter({ hasText: pkg.name }), pkg.name)
    }
    return new PackageComparisonRow(this.page.getByTestId('ComparisonRow'))
  }
}
