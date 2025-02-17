import type { Page } from '@playwright/test'
import { DocumentsDashboardTabSidebar } from './DocumentsDashboardTab/DocumentsDashboardTabSidebar'
import { Tab } from '@shared/components/base'

export class DocumentsDashboardTab extends Tab {

  readonly sidebar = new DocumentsDashboardTabSidebar(this.page)

  constructor(page: Page) {
    super(page.getByTestId('DocumentsButton'), 'Documents')
  }
}
