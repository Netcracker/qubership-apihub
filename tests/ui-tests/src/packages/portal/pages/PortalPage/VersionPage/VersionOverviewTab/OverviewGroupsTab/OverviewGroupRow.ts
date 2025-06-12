import type { Locator } from '@playwright/test'
import { Button, TableCell, TableRow } from '@shared/components/base'
import { test as report } from 'playwright/test'
import { GroupNameCell } from './OverviewGroupRow/GroupNameCell'

export class OverviewGroupRow extends TableRow {

  readonly nameCell = new GroupNameCell(this.mainLocator, this.componentName)
  readonly groupTypeCell = new TableCell(this.mainLocator.getByTestId('Cell-group-type'), this.componentName, 'group type cell')
  readonly descriptionCell = new TableCell(this.mainLocator.getByTestId('Cell-description'), this.componentName, 'description cell')
  readonly apiTypeCell = new TableCell(this.mainLocator.getByTestId('Cell-api-type'), this.componentName, 'API type cell')
  readonly operationsNumberCell = new TableCell(this.mainLocator.getByTestId('Cell-operations-number'), this.componentName, 'operations number cell')
  readonly addBtn = new Button(this.mainLocator.getByTestId('AddButton'), this.componentName, 'add button')
  readonly editBtn = new Button(this.mainLocator.getByTestId('EditButton'), this.componentName, 'edit button')
  readonly exportBtn = new Button(this.mainLocator.getByTestId('ExportButton'), this.componentName, 'export button')
  readonly deleteBtn = new Button(this.mainLocator.getByTestId('DeleteButton'), this.componentName, 'delete button')

  constructor(rootLocator: Locator, componentName?: string, componentType?: string) {
    super(rootLocator, componentName, componentType || 'group row')
  }

  async openEditGroupDialog(): Promise<void> {
    await report.step(`Open "Edit group" dialog for the "${this.componentName}" group`, async () => {
      await this.hover()
      await this.addBtn.click()
    })
  }

  async openEditGroupParametersDialog(): Promise<void> {
    await report.step(`Open "Edit group parameters" dialog for the "${this.componentName}" group`, async () => {
      await this.hover()
      await this.editBtn.click()
    })
  }

  async openExportDialog(): Promise<void> {
    await report.step(`Open "Export settings" dialog for the "${this.componentName}" group`, async () => {
      await this.hover()
      await this.exportBtn.click()
    })
  }

  async openDeleteGroupDialog(): Promise<void> {
    await report.step(`Open "Delete group" dialog for the "${this.componentName}" group`, async () => {
      await this.hover()
      await this.deleteBtn.click()
    })
  }
}
