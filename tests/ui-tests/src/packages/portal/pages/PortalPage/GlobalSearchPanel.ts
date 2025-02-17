import type { Page } from '@playwright/test'
import type { ApiTypeTitles } from '@shared/entities/api-types'
import { BaseComponent, SearchBar, TabButton } from '@shared/components/base'
import { GsFilters } from './GlobalSearchPanel/GsFilters'
import { GsSearchResults } from './GlobalSearchPanel/GsSearchResults'

export class GlobalSearchPanel extends BaseComponent {

  readonly searchbar = new SearchBar(this.mainLocator.getByTestId('SearchBar'), 'Global')
  readonly filters = new GsFilters(this.mainLocator)
  readonly searchResults = new GsSearchResults(this.mainLocator)
  readonly tabBtnOperations = new TabButton(this.mainLocator.getByTestId('ApiOperationsTabButton'), 'Operations')
  readonly tabBtnDocuments = new TabButton(this.mainLocator.getByTestId('DocumentsTabButton'), 'Documents')
  readonly tabBtnPackages = new TabButton(this.mainLocator.getByTestId('PackagesTabButton'), 'Packages')

  constructor(page: Page) {
    super(page.getByTestId('GlobalSearchPanel'), 'Global Search', 'panel')
  }

  async setFilters(config: FiltersConfig): Promise<void> {
    const filters = new GsFilters(this.mainLocator)
    await filters.acVersionStatus.hover()
    await filters.acVersionStatus.clearBtn.click()
    await filters.acWorkspace.click()
    await filters.acWorkspace.getListItem(config.workspace).click()
    await filters.acGroup.click()
    await filters.acGroup.getListItem(config.group).click()
    if (config.apiType) {
      await filters.chxSearchOnly.click()
      await filters.acApiType.click()
      await filters.acApiType.getListItem(config.apiType).click()
    }
  }
}

export type FiltersConfig = {
  workspace: string
  group: string
  apiType?: ApiTypeTitles
}
