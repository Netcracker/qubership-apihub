import type { Locator } from '@playwright/test'
import { Button, TableCell, TableRow } from '@shared/components/base'

export class AgentSnapshotsSnapshotRow extends TableRow {

  readonly expandBtn = new Button(this.mainLocator.getByTestId('KeyboardArrowRightOutlinedIcon'), this.componentName, 'expand button')
  readonly collapseBtn = new Button(this.mainLocator.getByTestId('KeyboardArrowDownOutlinedIcon'), this.componentName, 'collapse button')
  readonly snapshotCell = new TableCell(this.mainLocator.getByTestId('Cell-snapshot-or-service'), this.componentName, 'snapshot name cell')
  readonly publishDateCell = new TableCell(this.mainLocator.getByTestId('Cell-published-date'), this.componentName, 'publish date cell')
  readonly baselinePackageCell = new TableCell(this.mainLocator.getByTestId('Cell-baseline-or-bwc-status'), this.componentName, 'baseline package cell')

  constructor(rootLocator: Locator, componentName?: string, componentType?: string) {
    super(rootLocator, componentName, componentType || 'service row')
  }
}
