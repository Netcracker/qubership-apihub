import type { Page } from '@playwright/test'
import { Button, Link, SearchBar } from '@shared/components/base'
import { ApiTypeSelect } from '@portal/components'
import { PackageTabExportMenu } from './BasePackageTabToolbar/PackageTabExportMenu'

export class PackageTabToolbar {

  readonly comparedToLnk = new Link(this.page.getByTestId('ComparedToLink'), 'Compared to')
  readonly sltApiType = new ApiTypeSelect(this.page)
  readonly breakingChangesFilterBtn = new Button(this.page.getByTestId('ChangesFilterButton-breaking'), 'Breaking Сhanges filter')
  readonly semiBreakingChangesFilterBtn = new Button(this.page.getByTestId('ChangesFilterButton-semi-breaking'), 'Changes Requiring Attention filter')
  readonly deprecatedChangesFilterBtn = new Button(this.page.getByTestId('ChangesFilterButton-deprecated'), 'Deprecated Сhanges filter')
  readonly nonBreakingChangesFilterBtn = new Button(this.page.getByTestId('ChangesFilterButton-non-breaking'), 'Non-breaking Сhanges filter')
  readonly annotationChangesFilterBtn = new Button(this.page.getByTestId('ChangesFilterButton-annotation'), 'Annotation Сhanges filter')
  readonly unclassifiedChangesFilterBtn = new Button(this.page.getByTestId('ChangesFilterButton-unclassified'), 'Unclassified Сhanges filter')
  readonly searchbar = new SearchBar(this.page.getByTestId('SearchOperations'), 'Operations')
  readonly filtersBtn = new Button(this.page.getByTestId('FiltersButton'), 'Filters')
  readonly listViewBtn = new Button(this.page.locator('button[value=list]'), 'List View')
  readonly detailedViewBtn = new Button(this.page.locator('button[value=detailed]'), 'Detailed View')
  readonly exportMenu = new PackageTabExportMenu(this.page)

  constructor(protected readonly page: Page) { }
}
