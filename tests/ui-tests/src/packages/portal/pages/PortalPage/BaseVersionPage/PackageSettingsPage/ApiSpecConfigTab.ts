import type { Page } from '@playwright/test'
import { Button, Content, Icon } from '@shared/components/base'
import { BaseSettingsTab } from './BaseSettingsTab'
import { EditRestGroupingPrefixDialog } from './ApiSpecConfigTab/EditRestGroupingPrefixDialog'

export class ApiSpecConfigTab extends BaseSettingsTab {

  readonly prefix = new Content(this.page.getByTestId('PrefixContent').getByTestId('SettingsParameterContent'), 'REST Path Prefix for Grouping')
  readonly infoIcon = new Icon(this.page.getByTestId('InfoIcon'), 'Info')
  readonly editBtn = new Button(this.page.getByTestId('EditButton'), 'Edit')
  readonly editPrefixDialog = new EditRestGroupingPrefixDialog(this.page)

  constructor(page: Page) {
    super(page.getByTestId('TabButton-configuration'), 'API Specific Configuration')
  }
}
