import { type Locator } from '@playwright/test'
import { DropdownMenu, ListItem } from '@shared/components/base'

export class GroupDownloadMenu extends DropdownMenu {

  readonly combinedYamlItm = new ListItem(this.page.getByTestId('DownloadCombinedYamlMenuItem'), 'Combined YAML')
  readonly combinedJsonItm = new ListItem(this.page.getByTestId('DownloadCombinedJsonMenuItem'), 'Combined JSON')
  readonly reducedYamlItm = new ListItem(this.page.getByTestId('DownloadReducedYamlMenuItem'), 'Reduced YAML')
  readonly reducedJsonItm = new ListItem(this.page.getByTestId('DownloadReducedJsonMenuItem'), 'Reduced JSON')
  readonly reducedHtmlItm = new ListItem(this.page.getByTestId('DownloadReducedHtmlMenuItem'), 'Reduced HTML')

  constructor(rootLocator: Locator) {
    super(rootLocator.getByTestId('DownloadMenuButton'), 'Group Download')
  }
}
