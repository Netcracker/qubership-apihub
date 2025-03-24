import type { Locator } from '@playwright/test'
import { Content, TableCell } from '@shared/components/base'

export class ChangesTableCell extends TableCell {

  readonly breakingChanges = new Content(this.mainLocator.getByTestId('breaking'), 'Breaking Сhanges')
  readonly deprecatedChanges = new Content(this.mainLocator.getByTestId('deprecated'), 'Deprecated Сhanges')
  readonly nonBreakingChanges = new Content(this.mainLocator.getByTestId('non-breaking'), 'Non-breaking Сhanges')
  readonly semiBreakingChanges = new Content(this.mainLocator.getByTestId('semi-breaking'), 'Changes Requiring Attention')
  readonly annotationChanges = new Content(this.mainLocator.getByTestId('annotation'), 'Annotation Сhanges')
  readonly unclassifiedChanges = new Content(this.mainLocator.getByTestId('unclassified'), 'Unclassified Сhanges')

  constructor(rootLocator: Locator, componentName?: string, componentType?: string) {
    super(rootLocator, componentName, componentType || 'changes cell')
  }
}
