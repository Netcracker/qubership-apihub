import type { Locator } from '@playwright/test'
import { createItemGetter, type ItemGetterConfig } from '@services/utils'
import { Content, Icon, Link, Placeholder, Title } from '@shared/components/base'
import { ValidationRuleset } from './QualityValidationSection/ValidationRuleset'

/**
 * Quality Validation section within the Overview Summary tab.
 *
 * NOTE: This class does NOT extend BaseComponent because there is no dedicated
 * container element (with its own testId) for the Quality Validation section in the UI.
 * The section's elements are rendered directly inside the parent ValidationsContent container.
 * Therefore, this class cannot be used directly in expect() assertions like `expect(qualityValidation).toBeVisible()`.
 * Instead, use specific child elements for assertions, e.g., `expect(qualityValidation.title).toBeVisible()`.
 */
export class QualityValidationSection {
  readonly title = new Title(this.rootLocator.getByTestId('QualityValidationTitle'), 'Quality Validation')
  readonly alertIcon = new Icon(this.rootLocator.getByTestId('ValidationFailedAlert'), 'Validation failed')
  readonly placeholder = new Placeholder(
    this.rootLocator.getByTestId('QualityValidationPlaceholder'),
    'Quality Validation',
  )
  readonly runValidationLink = new Link(this.rootLocator.getByTestId('RunValidationLink'), 'Run Validation')
  readonly errorCount = new Content(this.rootLocator.getByTestId('IssueCount-error'), 'Error count')
  readonly warningCount = new Content(this.rootLocator.getByTestId('IssueCount-warning'), 'Warning count')
  readonly infoCount = new Content(this.rootLocator.getByTestId('IssueCount-info'), 'Info count')
  readonly hintCount = new Content(this.rootLocator.getByTestId('IssueCount-hint'), 'Hint count')
  readonly failedDocuments = new Content(
    this.rootLocator.getByTestId('FailedDocumentsContainer'),
    'Failed documents',
  )
  readonly failedDocumentsInfoIcon = new Icon(
    this.failedDocuments.mainLocator.getByTestId('InfoIcon'),
    'Failed documents info',
  )

  private readonly validationRulesetConfig: ItemGetterConfig<ValidationRuleset> = {
    constructor: ValidationRuleset,
    rootLocator: this.rootLocator.getByTestId('ValidationRulesetContainer'),
    componentTypes: {
      singular: 'validation ruleset',
      plural: 'validation rulesets',
    },
    defaultExact: false,
  }

  readonly getValidationRuleset = createItemGetter(this.validationRulesetConfig)

  constructor(private readonly rootLocator: Locator) {}
}
