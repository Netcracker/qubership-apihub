import type { Locator } from '@playwright/test'
import { Button, Icon, TableCell, TableRow } from '@shared/components/base'

export class ConfigureVersionFileRow extends TableRow {

  readonly fileCell = new TableCell(this.mainLocator.getByTestId('Cell-file-column'), this.componentName, 'filename cell')
  readonly labelsCell = new TableCell(this.mainLocator.getByTestId('Cell-labels-column'), this.componentName, 'labels cell')
  readonly infoIcon = new Icon(this.mainLocator.getByTestId('InfoIcon'), this.componentName, 'info icon')
  readonly restoreBtn = new Button(this.mainLocator.getByTestId('RestoreButton'), this.componentName, 'restore button')
  readonly fileBtn = new Button(this.mainLocator.getByTestId('FileTitleButton'), this.componentName)
  readonly removeBtn = new Button(this.mainLocator.getByTestId('RemoveButton'), this.componentName, 'remove button')
  readonly editBtn = new Button(this.mainLocator.getByTestId('EditButton'), this.componentName, 'edit button')

  constructor(rootLocator: Locator, componentName?: string, componentType?: string) {
    super(rootLocator, componentName, componentType || 'file row')
  }
}
