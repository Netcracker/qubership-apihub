import type { Page } from '@playwright/test'
import { Breadcrumbs, Button } from '@shared/components/base'
import { ComparisonPagePackageSelect } from './BaseCompareToolbar/ComparisonPagePackageSelect'

export abstract class BaseCompareToolbar {

  readonly locator = this.page.getByTestId('ComparisonToolbar')
  readonly breadcrumbs = new Breadcrumbs(this.locator.getByTestId('ComparedPackagesBreadcrumbs'), 'Comparison')
  readonly backBtn = new Button(this.locator.getByTestId('BackButton'), 'Back')
  readonly packageSlt = new ComparisonPagePackageSelect(this.page)
  readonly breakingChangesFilterBtn = new Button(this.locator.getByTestId('ChangesFilterButton-breaking'), 'Breaking Сhanges filter')
  readonly semiBreakingChangesFilterBtn = new Button(this.page.getByTestId('ChangesFilterButton-semi-breaking'), 'Changes Requiring Attention filter')
  readonly deprecatedChangesFilterBtn = new Button(this.locator.getByTestId('ChangesFilterButton-deprecated'), 'Deprecated Сhanges filter')
  readonly nonBreakingChangesFilterBtn = new Button(this.locator.getByTestId('ChangesFilterButton-non-breaking'), 'Non-breaking Сhanges filter')
  readonly annotationChangesFilterBtn = new Button(this.locator.getByTestId('ChangesFilterButton-annotation'), 'Annotation Сhanges filter')
  readonly unclassifiedChangesFilterBtn = new Button(this.locator.getByTestId('ChangesFilterButton-unclassified'), 'Unclassified Сhanges filter')

  protected constructor(protected readonly page: Page) { }
}
