import type { Locator } from '@playwright/test'
import { Button, TableCell, TableRow } from '@shared/components/base'

export class DocumentsTagRow extends TableRow {

  readonly tagCell = new TableCell(this.mainLocator.getByTestId('TagsCell'), 'Tags')
  readonly expandBtn = new Button(this.mainLocator.getByTestId('KeyboardArrowRightOutlinedIcon'), 'Expand tag')
  readonly collapseBtn = new Button(this.mainLocator.getByTestId('KeyboardArrowDownOutlinedIcon'), 'Collapse tag')

  constructor(rootLocator: Locator, componentName?: string, componentType?: string) {
    super(rootLocator, componentName, componentType)
  }
}
