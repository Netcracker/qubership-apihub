import { BaseComponent, Indicator } from '@shared/components/base'
import type { ComponentParams } from '@shared/components/types'
import { OperationComparisonSummary } from './OperationComparisonSummary'
import type { Locator } from '@playwright/test'

export class OperationComparisonRow extends BaseComponent {

  readonly componentType: string = 'comparison row'
  readonly changeSeverityIndicator = new Indicator(this.rootLocator.getByTestId('ChangeSeverityIndicator'), `${this.componentName} Changes Severity`)
  readonly leftSummary = new OperationComparisonSummary(this.rootLocator.getByTestId('LeftComparisonSummary'), `Left ${this.componentName}`)
  readonly rightSummary = new OperationComparisonSummary(this.rootLocator.getByTestId('RightComparisonSummary'), `Right ${this.componentName}`)

  constructor(rootLocator: Locator, componentName?: string, componentType?: string) {
    super(rootLocator, componentName, componentType)
  }
}
