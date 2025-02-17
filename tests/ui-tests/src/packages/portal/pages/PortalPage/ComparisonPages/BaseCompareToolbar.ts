import type { Page } from '@playwright/test'
import { Breadcrumbs, Button } from '@shared/components/base'
import { ComparisonPagePackageSelect } from './BaseCompareToolbar/ComparisonPagePackageSelect'

export abstract class BaseCompareToolbar {

  readonly locator = this.page.getByTestId('ComparisonToolbar')
  readonly breadcrumbs = new Breadcrumbs(this.locator.getByTestId('ComparedPackagesBreadcrumbs'), 'Comparison')
  readonly backBtn = new Button(this.locator.getByTestId('BackButton'), 'Back')
  readonly packageSlt = new ComparisonPagePackageSelect(this.page)
  readonly breakingChangesFilterBtn = new Button(this.locator.getByTestId('ChangesFilterButton-breaking'), 'Breaking changes filter')
  readonly semiBreakingChangesFilterBtn = new Button(this.page.getByTestId('ChangesFilterButton-semi-breaking'), 'Semi-breaking changes filter')
  readonly deprecatedChangesFilterBtn = new Button(this.locator.getByTestId('ChangesFilterButton-deprecated'), 'Deprecated changes filter')
  readonly nonBreakingChangesFilterBtn = new Button(this.locator.getByTestId('ChangesFilterButton-non-breaking'), 'Non-breaking changes filter')
  readonly annotationChangesFilterBtn = new Button(this.locator.getByTestId('ChangesFilterButton-annotation'), 'Annotation changes filter')
  readonly unclassifiedChangesFilterBtn = new Button(this.locator.getByTestId('ChangesFilterButton-unclassified'), 'Unclassified changes filter')

  protected constructor(protected readonly page: Page) { }
}
