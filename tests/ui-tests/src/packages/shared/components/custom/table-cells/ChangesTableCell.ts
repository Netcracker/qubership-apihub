import type { Locator } from '@playwright/test'
import { Content, TableCell } from '@shared/components/base'

export class ChangesTableCell extends TableCell {

  readonly breakingChanges = new Content(this.mainLocator.getByTestId('breaking'), 'Breaking changes')
  readonly deprecatedChanges = new Content(this.mainLocator.getByTestId('deprecated'), 'Deprecated changes')
  readonly nonBreakingChanges = new Content(this.mainLocator.getByTestId('non-breaking'), 'Non-breaking changes')
  readonly semiBreakingChanges = new Content(this.mainLocator.getByTestId('semi-breaking'), 'Risky changes')
  readonly annotationChanges = new Content(this.mainLocator.getByTestId('annotation'), 'Annotation changes')
  readonly unclassifiedChanges = new Content(this.mainLocator.getByTestId('unclassified'), 'Unclassified changes')

  constructor(rootLocator: Locator, componentName?: string, componentType?: string) {
    super(rootLocator, componentName, componentType || 'changes cell')
  }
}
