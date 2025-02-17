import type { Locator } from '@playwright/test'
import { BaseComponent, Indicator } from '@shared/components/base'
import { PackageComparisonSummary } from './PackageComparisonSummary'

export class PackageComparisonRow extends BaseComponent {

  readonly componentType: string = 'comparison row'
  readonly changeSeverityIndicator = new Indicator(this.mainLocator.getByTestId('ChangeSeverityIndicator'), `${this.componentName} Changes Severity`)
  readonly leftSummary = new PackageComparisonSummary(this.mainLocator.getByTestId('LeftComparisonSummary'), `Left ${this.componentName}`)
  readonly rightSummary = new PackageComparisonSummary(this.mainLocator.getByTestId('RightComparisonSummary'), `Right ${this.componentName}`)

  constructor(rootLocator: Locator, componentName?: string, componentType?: string) {
    super(rootLocator, componentName, componentType)
  }
}
