import { type Page } from '@playwright/test'
import { Tab, Title } from '@shared/components/base'

export class AgentAutomationTab extends Tab {

  readonly title = new Title(this.page.getByTestId('CardHeaderTitle'), 'Automation')

  constructor(page: Page) {
    super(page.getByTestId('AutomationTabButton'), 'Automation')
  }
}
