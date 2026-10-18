import type { Page } from '@playwright/test'
import { Autocomplete } from '@shared/components/base'
import { DocumentsPackageTabSidebar } from '../../VersionPackagePage/DocumentsPackageTab/DocumentsPackageTabSidebar'

export class DocumentsDashboardTabSidebar extends DocumentsPackageTabSidebar {

  readonly packageFilterAc = new Autocomplete(this.page.getByTestId('PackageFilter'), 'Package Filter')

  constructor(protected page: Page) {
    super(page)
  }
}
