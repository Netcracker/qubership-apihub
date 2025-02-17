import type { Locator } from '@playwright/test'
import { Link, TableCell, TableRow } from '@shared/components/base'

export class AgentDocRow extends TableRow {

  readonly docCell = new TableCell(this.mainLocator.getByTestId('Cell-service-or-documentation'), this.componentName, 'doc name cell')
  readonly link = new Link(this.mainLocator.locator('a'), this.componentName, 'document link')

  constructor(rootLocator: Locator, componentName?: string, componentType?: string) {
    super(rootLocator, componentName, componentType || 'service row')
  }
}
