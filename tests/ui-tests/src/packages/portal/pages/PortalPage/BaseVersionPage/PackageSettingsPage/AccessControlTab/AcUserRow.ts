import { type Locator, test as report } from '@playwright/test'
import { Button, Checkbox, TableCell, TableRow } from '@shared/components/base'
import { BaseRemoveDialog } from '@shared/components/custom'

export class AcUserRow extends TableRow {

  private readonly page = this.mainLocator.page()
  readonly userCell = new TableCell(this.mainLocator.getByTestId('Cell-user'), this.componentName, 'name cell')
  readonly adminChx = new Checkbox(this.mainLocator.getByTestId('Cell-admin').getByRole('checkbox'), this.componentName, 'admin checkbox')
  readonly ownerChx = new Checkbox(this.mainLocator.getByTestId('Cell-owner').getByRole('checkbox'), this.componentName, 'owner checkbox')
  readonly releaseManagerChx = new Checkbox(this.mainLocator.getByTestId('Cell-release-manager').getByRole('checkbox'), this.componentName, 'release manager checkbox')
  readonly editorChx = new Checkbox(this.mainLocator.getByTestId('Cell-editor').getByRole('checkbox'), this.componentName, 'editor checkbox')
  readonly viewerChx = new Checkbox(this.mainLocator.getByTestId('Cell-viewer').getByRole('checkbox'), this.componentName, 'viewer checkbox')
  readonly deleteBtn = new Button(this.mainLocator.getByTestId('DeleteButton'), this.componentName, 'delete button')
  readonly removeUserDialog = new BaseRemoveDialog(this.page)

  constructor(rootLocator: Locator, componentName?: string, componentType?: string) {
    super(rootLocator, componentName, componentType || 'user row')
  }

  async openRemoveUserDialog(): Promise<void> {
    await report.step(`Open "${this.componentName}" remove user dialog`, async () => {
      await this.hover()
      await this.deleteBtn.click()
    })
  }
}
