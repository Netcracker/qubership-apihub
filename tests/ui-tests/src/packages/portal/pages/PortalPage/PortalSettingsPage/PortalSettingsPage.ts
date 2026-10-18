import type { Page } from '@playwright/test'
import { Button } from '@shared/components/base'
import { RulesetManagementTab } from './RulesetManagementTab/RulesetManagementTab'

export class PortalSettingsPage {
  readonly rulesetManagementTab = new RulesetManagementTab(this.page)
  // TODO: Temporary - remove when full PortalSettingsPage POM is implemented
  readonly userRolesTabBtn = new Button(this.page.getByTestId('UserRolesTabButton'), 'User Roles')
  readonly createRoleBtn = new Button(this.page.getByTestId('CreateRoleButton'), 'Create Role')

  constructor(private readonly page: Page) {}
}
