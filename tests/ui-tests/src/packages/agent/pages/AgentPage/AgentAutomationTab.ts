import { type Page } from '@playwright/test'
import { Tab } from '@shared/components/base'

export class AgentAutomationTab extends Tab {

  constructor(page: Page) {
    super(page.getByTestId('AutomationTabButton'), 'Automation')
  }
}
