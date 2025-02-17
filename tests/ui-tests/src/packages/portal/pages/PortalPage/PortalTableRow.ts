import type { Locator } from '@playwright/test'
import { Button, Link, TableCell, TableRow } from '@shared/components/base'
import { test as report } from 'playwright/test'

export class PortalTableRow extends TableRow {

  readonly favoriteBtn = new Button(this.mainLocator.getByTestId('Cell-favorite'), this.componentName, 'favorite button')
  readonly nameCell = new TableCell(this.mainLocator.getByTestId('Cell-name'), this.componentName, 'name cell')
  readonly link = new Link(this.mainLocator.getByRole('link'), this.componentName)
  readonly packageSettingsButton = new Button(this.mainLocator.getByTestId('PackageSettingsButton'), this.componentName, 'package settings button')
  readonly idCell = new TableCell(this.mainLocator.getByTestId('Cell-id'), this.componentName, 'ID cell')
  readonly descriptionCell = new TableCell(this.mainLocator.getByTestId('Cell-description'), this.componentName, 'description cell')
  readonly groupCell = new TableCell(this.mainLocator.getByTestId('Cell-group'), this.componentName, 'group cell')
  readonly serviceNameCell = new TableCell(this.mainLocator.getByTestId('Cell-serviceName'), this.componentName, 'service name cell')
  readonly lastReleaseCell = new TableCell(this.mainLocator.getByTestId('Cell-lastVersion'), this.componentName, 'last release cell')
  readonly bwcStatusCell = new TableCell(this.mainLocator.getByTestId('Cell-bwcErrors'), this.componentName, 'bwc status cell')

  constructor(rootLocator: Locator, componentName?: string, componentType?: string) {
    super(rootLocator, componentName, componentType)
  }

  async openSettings(): Promise<void> {
    await report.step(`Open "${this.componentName}" settings`, async () => {
      await this.hover()
      await this.packageSettingsButton.click()
    })
  }
}
