import type { Page } from '@playwright/test'
import { createItemGetter, type ItemGetterConfig } from '@services/utils'
import { Chip, Link, Placeholder, Tab } from '@shared/components/base'
import { RawView } from '@shared/components/custom/views/RawView'
import { ValidatedDocumentSelect } from './ValidatedDocumentSelect'
import { ValidationResultsTableRow } from './ValidationResultsTableRow'

export class ApiQualityTab extends Tab {
  readonly noResultsPlaceholder = new Placeholder(
    this.page.getByTestId('ApiQualityNoResultsPlaceholder'),
    'API Quality no results',
  )
  readonly documentSlt = new ValidatedDocumentSelect(this.page)
  readonly nameLink = new Link(
    this.page.getByTestId('ValidationRulesetLinkName'),
    'Quality validation',
    'ruleset link',
  )
  readonly apiTypeChip = new Chip(
    this.page.getByTestId('ValidationRulesetApiTypeChip'),
    'Quality validation',
    'ruleset API type chip',
  )
  readonly statusChip = new Chip(
    this.page.getByTestId('ValidationRulesetStatusChip'),
    'Quality validation',
    'ruleset status chip',
  )
  readonly rawView = new RawView(this.page)

  private readonly problemRowConfig: ItemGetterConfig<ValidationResultsTableRow> = {
    constructor: ValidationResultsTableRow,
    rootLocator: this.page.getByTestId('Cell-message'),
    navigateToParent: true,
    componentTypes: {
      singular: 'problem row',
      plural: 'problem rows',
    },
  }

  readonly getProblemRow = createItemGetter(this.problemRowConfig)

  constructor(protected readonly page: Page) {
    super(page.getByTestId('ApiQualityButton'), 'API Quality')
  }
}
