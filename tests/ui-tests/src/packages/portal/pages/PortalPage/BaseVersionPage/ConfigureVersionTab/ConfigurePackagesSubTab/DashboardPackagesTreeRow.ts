import type { Locator } from '@playwright/test'
import { Button, TableCell } from '@shared/components/base'
import { DashboardPackagesTreeCell } from './DashboardPackagesTreeRow/DashboardPackagesTreeCell'

export class DashboardPackagesTreeRow extends TableCell {

  readonly expandBtn = new Button(this.mainLocator.getByTestId('ExpandButton'), 'Expand')
  readonly collapseBtn = new Button(this.mainLocator.getByTestId('CollapseButton'), 'Collapse')
  readonly packageCell = new DashboardPackagesTreeCell(this.rootLocator, this.componentName)
  readonly versionCell = new TableCell(this.mainLocator.getByTestId('VersionCell'), 'Version')
  readonly statusCell = new TableCell(this.mainLocator.getByTestId('StatusCell'), 'Status')
  readonly removeBtn = new Button(this.mainLocator.getByTestId('RemoveButton'), 'Status')

  constructor(rootLocator: Locator, componentName?: string, componentType?: string) {
    super(rootLocator, componentName, componentType)
  }
}
