import type { Page } from '@playwright/test'
import { Autocomplete, Checkbox, TextField } from '@shared/components/base'
import { BaseCreateDialog } from '@shared/components/custom'

export class PortalCreatePackageDialog extends BaseCreateDialog {

  readonly nameTxtFld = new TextField(this.page.getByTestId('NameTextField'), 'Name')
  readonly parentAc = new Autocomplete(this.page.getByTestId('ParentAutocomplete'), 'Workspace / Parent Group')
  readonly aliasTxtFld = new TextField(this.page.getByTestId('AliasTextField'), 'Alias')
  readonly descriptionTxtFld = new TextField(this.page.getByTestId('DescriptionTextField'), 'Description')
  readonly privateChx = new Checkbox(this.page.getByTestId('PackageVisibilityCheckbox'), 'Private')

  constructor(page: Page) {
    super(page)
  }

  async fillForm(params: Partial<{
    name: string
    parentName: string
    alias: string
    description: string
    isPrivate: boolean
  }>): Promise<void> {
    if (params.name) {
      await this.nameTxtFld.fill(params.name)
    }
    if (params.parentName) {
      await this.parentAc.clear()
      await this.parentAc.click()
      await this.parentAc.fill(params.parentName)
      await this.parentAc.getListItem(params.parentName).click()
    }
    if (params.alias) {
      await this.aliasTxtFld.fill(params.alias)
    }
    if (params.description) {
      await this.descriptionTxtFld.fill(params.description)
    }
    if (params.isPrivate) {
      await this.privateChx.click()
    }
  }
}
