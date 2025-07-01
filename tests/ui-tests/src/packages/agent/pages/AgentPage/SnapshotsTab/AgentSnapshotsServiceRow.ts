import type { Locator } from '@playwright/test'
import { Link, TableCell, TableRow } from '@shared/components/base'
import { ChangesTableCell } from '@shared/components/custom'
import { hoverableOpening } from '@shared/helpers'

export class AgentSnapshotsServiceRow extends TableRow {

  readonly serviceCell = new TableCell(this.mainLocator.getByTestId('Cell-snapshot-or-service'), this.componentName, 'service name cell')
  readonly bwcStatusCell = new TableCell(this.mainLocator.getByTestId('Cell-baseline-or-bwc-status'), this.componentName, 'bwc status cell')
  readonly changesCell = new ChangesTableCell(this.mainLocator.getByTestId('Cell-changes'), this.componentName)
  readonly viewChangesLnk = new Link(this.mainLocator.getByTestId('Cell-view-changes-url').getByRole('link'), this.componentName, 'view changes link')

  constructor(rootLocator: Locator, componentName?: string, componentType?: string) {
    super(rootLocator, componentName, componentType || 'service row')
  }

  async viewChanges(): Promise<void> {
    await hoverableOpening(this, this.viewChangesLnk, 'View Changes')
  }
}
