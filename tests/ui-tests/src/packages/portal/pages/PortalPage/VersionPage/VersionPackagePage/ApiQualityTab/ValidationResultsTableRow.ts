import type { Locator } from '@playwright/test'
import { TableCell, TableRow } from '@shared/components/base'

export class ValidationResultsTableRow extends TableRow {
  readonly typeCell = new TableCell(
    this.rootLocator.getByTestId('Cell-type'),
    this.componentName,
    'type cell',
  )
  readonly messageCell = new TableCell(
    this.rootLocator.getByTestId('Cell-message'),
    this.componentName,
    'message cell',
  )

  constructor(rootLocator: Locator, componentName?: string, componentType?: string) {
    super(rootLocator, componentName, componentType ?? 'validation result row')
  }
}
