import type { Locator } from '@playwright/test'
import { Content } from '@shared/components/base'
import { QualityValidationSection } from './QualityValidationSection'

/**
 * Validations content section (REST or GraphQL) within the Overview Summary tab.
 *
 * NOTE: This class should be refactored to extend BaseComponent because it has
 * a dedicated container element with its own testId in the UI (e.g., 'ValidationsContent-rest',
 * 'ValidationsContent-graphql'). Once refactored, it can be used directly in expect()
 * assertions like `expect(restApi).toBeVisible()`. Currently, it uses a Locator directly,
 * which limits its usage in assertions. For now, use child elements in assertions,
 * e.g., `expect(restApi.operations).toBeVisible()` instead of `expect(restApi).toBeVisible()`.
 */
export class OverviewValidationsContent {
  readonly operations = new Content(this.locator.getByTestId('NumberOfOperationsTypography'), 'Number of operations')
  readonly deprecatedOperations = new Content(
    this.locator.getByTestId('NumberOfDeprecatedOperationsTypography'),
    'Number of deprecated operations',
  )
  readonly noBwcOperations = new Content(
    this.locator.getByTestId('NumberOfNoBwcOperationsTypography'),
    'Number of no-BWC operations',
  )
  readonly bwcErrors = new Content(this.locator.getByTestId('NumberOfBwcErrorsTypography'), 'Number of BWC errors')
  readonly breakingChanges = new Content(this.locator.getByTestId('breaking'), 'Breaking changes')
  readonly riskyChanges = new Content(this.locator.getByTestId('risky'), 'Changes Requiring Attention')
  readonly deprecatedChanges = new Content(this.locator.getByTestId('deprecated'), 'Deprecated changes')
  readonly nonBreakingChanges = new Content(this.locator.getByTestId('non-breaking'), 'Non-breaking changes')
  readonly annotationChanges = new Content(this.locator.getByTestId('annotation'), 'Annotation changes')
  readonly unclassifiedChanges = new Content(this.locator.getByTestId('unclassified'), 'Unclassified changes')
  readonly qualityValidation = new QualityValidationSection(this.locator)

  constructor(private readonly locator: Locator) {}
}
