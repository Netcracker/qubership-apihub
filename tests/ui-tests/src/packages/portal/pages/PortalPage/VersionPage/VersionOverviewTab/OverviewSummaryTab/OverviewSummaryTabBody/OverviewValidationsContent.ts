import type { Locator } from '@playwright/test'
import { Content } from '@shared/components/base'

export class OverviewValidationsContent {

  readonly operations = new Content(this.locator.getByTestId('NumberOfOperationsTypography'), 'Number of operations')
  readonly deprecatedOperations = new Content(this.locator.getByTestId('NumberOfDeprecatedOperationsTypography'), 'Number of deprecated operations')
  readonly noBwcOperations = new Content(this.locator.getByTestId('NumberOfNoBwcOperationsTypography'), 'Number of no-BWC operations')
  readonly bwcErrors = new Content(this.locator.getByTestId('NumberOfBwcErrorsTypography'), 'Number of BWC errors')
  readonly breakingChanges = new Content(this.locator.getByTestId('breaking'), 'Breaking Сhanges')
  readonly semiBreakingChanges = new Content(this.locator.getByTestId('semi-breaking'), 'Changes Requiring Attention')
  readonly deprecatedChanges = new Content(this.locator.getByTestId('deprecated'), 'Deprecated Сhanges')
  readonly nonBreakingChanges = new Content(this.locator.getByTestId('non-breaking'), 'Non-breaking Сhanges')
  readonly annotationChanges = new Content(this.locator.getByTestId('annotation'), 'Annotation Сhanges')
  readonly unclassifiedChanges = new Content(this.locator.getByTestId('unclassified'), 'Unclassified Сhanges')

  constructor(private readonly locator: Locator) { }
}
