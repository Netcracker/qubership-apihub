import type { Locator } from '@playwright/test'
import { Button, Checkbox, Link, TableCell, TableRow } from '@shared/components/base'
import { ChangesTableCell } from '@shared/components/custom'
import { hoverableOpening } from '@shared/helpers'

export class AgentServiceRow extends TableRow {

  readonly checkbox = new Checkbox(this.mainLocator.getByRole('checkbox'), this.componentName)
  readonly expandBtn = new Button(this.mainLocator.getByTestId('KeyboardArrowRightOutlinedIcon'), this.componentName, 'expand button')
  readonly collapseBtn = new Button(this.mainLocator.getByTestId('KeyboardArrowRightOutlinedIcon'), this.componentName, 'collapse button') //UI issue collapse and expand buttons are the same
  readonly serviceCell = new TableCell(this.mainLocator.getByTestId('Cell-service-or-documentation'), this.componentName, 'service name cell')
  readonly labelsCell = new TableCell(this.mainLocator.getByTestId('Cell-service-labels'), this.componentName, 'labels cell')
  readonly baselinePackageCell = new TableCell(this.mainLocator.getByTestId('Cell-baseline-package'), this.componentName, 'baseline package cell')
  readonly publishStatusCell = new TableCell(this.mainLocator.getByTestId('Cell-publish-status'), this.componentName, 'publish status cell')
  readonly bwcStatusCell = new TableCell(this.mainLocator.getByTestId('Cell-bwc-status'), this.componentName, 'bwc status cell')
  readonly changesCell = new ChangesTableCell(this.mainLocator.getByTestId('Cell-changes'), this.componentName)
  readonly viewPackageLnk = new Link(this.mainLocator.getByTestId('ViewPackageButton'), this.componentName, 'view package link')
  readonly viewSnapshotLnk = new Link(this.mainLocator.getByTestId('ViewSnapshotButton'), this.componentName, 'view snapshot link')
  readonly viewChangesLnk = new Link(this.mainLocator.getByTestId('ViewChangesButton'), this.componentName, 'view changes link')
  readonly viewVersionLnk = new Link(this.mainLocator.getByTestId('PromotedVersionButton'), this.componentName, 'view version link')

  constructor(rootLocator: Locator, componentName?: string, componentType?: string) {
    super(rootLocator, componentName, componentType || 'service row')
  }

  async viewPackage(): Promise<void> {
    await hoverableOpening(this, this.viewPackageLnk, 'View Package')
  }

  async viewSnapshot(): Promise<void> {
    await hoverableOpening(this, this.viewSnapshotLnk, 'View Snapshot')
  }

  async viewChanges(): Promise<void> {
    await hoverableOpening(this, this.viewChangesLnk, 'View Changes')
  }

  async viewVersion(): Promise<void> {
    await hoverableOpening(this, this.viewVersionLnk, 'View Version')
  }
}
