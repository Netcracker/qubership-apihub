import { type Page, test } from '@playwright/test'
import { createItemGetter, type ItemGetterConfig } from '@services/utils'
import { Button, Select, Tab, Title } from '@shared/components/base'
import { BaseDeleteDialog } from '@shared/components/custom'
import { ActivateRulesetDialog } from './ActivateRulesetDialog'
import { CreateRulesetDialog } from './CreateRulesetDialog'
import { RulesetTableRow } from './RulesetTableRow/RulesetTableRow'

export class RulesetManagementTab extends Tab {
  readonly title = new Title(this.page.getByTestId('CardHeaderTitle'), 'API Quality Ruleset Management')
  readonly rulesetTypeSlt = new Select(this.page.getByTestId('RulesetTypeSelect'), 'Ruleset API Type')
  readonly addRulesetBtn = new Button(this.page.getByTestId('AddRulesetButton'), 'Add Ruleset')

  readonly createRulesetDialog = new CreateRulesetDialog(this.page)
  readonly activateRulesetDialog = new ActivateRulesetDialog(this.page)
  readonly deleteRulesetDialog = new BaseDeleteDialog(this.page)

  private readonly rulesetRowConfig: ItemGetterConfig<RulesetTableRow> = {
    constructor: RulesetTableRow,
    rootLocator: this.page.getByTestId('Cell-ruleset-name'),
    navigateToParent: true,
    componentTypes: {
      singular: 'ruleset row',
      plural: 'ruleset rows',
    },
  }

  readonly getRulesetRow = createItemGetter(this.rulesetRowConfig)

  async openCreateRulesetDialog(): Promise<void> {
    await test.step('Open Create Ruleset dialog', async () => {
      await this.addRulesetBtn.click()
    })
  }

  constructor(protected readonly page: Page) {
    super(page.getByTestId('RulesetManagementTabButton'), 'API Quality Ruleset Management')
  }
}
