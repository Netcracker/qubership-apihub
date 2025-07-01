import { type Locator } from '@playwright/test'
import { Icon, TableCell } from '@shared/components/base'
import { FILE_ICON } from '@shared/entities'

export class GroupNameCell extends TableCell {

  readonly templateIcon = new Icon(this.rootLocator.getByTestId(FILE_ICON), this.componentName, 'template icon')

  constructor(rootLocator: Locator, componentName: string | undefined) {
    super(rootLocator.getByTestId('Cell-group-name'), componentName, 'name cell')
  }
}
