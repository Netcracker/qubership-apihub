import { type Locator, test as report } from '@playwright/test'
import { Button, Link, TableCell, TableRow } from '@shared/components/base'
import { quoteName } from '@services/utils'

export class PackageSettingsVersionRow extends TableRow {

  readonly versionCell = new TableCell(this.mainLocator.getByTestId('Cell-version'), this.componentName, 'version cell')
  readonly versionLink = new Link(this.mainLocator.getByRole('link'), this.componentName)
  readonly statusCell = new TableCell(this.mainLocator.getByTestId('Cell-version-status'), this.componentName, 'status cell')
  readonly labelsCell = new TableCell(this.mainLocator.getByTestId('Cell-labels'), this.componentName, 'labels cell')
  readonly publicationDateCell = new TableCell(this.mainLocator.getByTestId('Cell-publication-date'), this.componentName, 'publication date cell')
  readonly publishedByCell = new TableCell(this.mainLocator.getByTestId('Cell-published-by'), this.componentName, 'published by cell')
  readonly previousVersionCell = new TableCell(this.mainLocator.getByTestId('Cell-previous-version'), this.componentName, 'previous version cell')
  readonly editBtn = new Button(this.mainLocator.getByTestId('EditButton'), this.componentName, 'edit button')
  readonly deleteBtn = new Button(this.mainLocator.getByTestId('DeleteButton'), this.componentName, 'delete button')

  constructor(rootLocator: Locator, componentName?: string, componentType?: string) {
    super(rootLocator, componentName, componentType || 'version row')
  }

  async openEditVersionDialog(): Promise<void> {
    await report.step(`Open "Edit Version" dialog for ${quoteName(this.componentName)} version`, async () => {
      await this.hover()
      await this.editBtn.click()
    })
  }

  async openDeleteVersionDialog(): Promise<void> {
    await report.step(`Open "Delete Version" dialog for ${quoteName(this.componentName)} version`, async () => {
      await this.hover()
      await this.deleteBtn.click()
    })
  }
}
