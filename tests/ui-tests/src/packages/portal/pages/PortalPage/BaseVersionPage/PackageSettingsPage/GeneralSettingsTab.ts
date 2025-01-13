/**
 * Copyright 2024-2025 NetCracker Technology Corporation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import type { Page } from '@playwright/test'
import { Autocomplete, Button, Content, Switch, TextField } from '@shared/components/base'
import { BaseDeleteDialog } from '@shared/components/custom'
import { BaseSettingsTab } from './BaseSettingsTab'

export class GeneralSettingsTab extends BaseSettingsTab {

  readonly editBtn = new Button(this.page.getByTestId('EditButton'), 'Edit')
  readonly deleteBtn = new Button(this.page.getByTestId('DeleteButton'), 'Delete')
  readonly saveBtn = new Button(this.page.getByTestId('SaveButton'), 'Save')
  readonly cancelBtn = new Button(this.page.getByTestId('CancelButton'), 'Cancel')
  readonly packageName = new Content(this.page.getByTestId('PackageNameContent'), 'Package Name')
  readonly packageNameTxtFld = new TextField(this.page.getByTestId('PackageNameTextField'), 'Package Name')
  readonly dashboardName = new Content(this.page.getByTestId('PackageNameContent'), 'Dashboard Name')
  readonly dashboardNameTxtFld = new TextField(this.page.getByTestId('PackageNameTextField'), 'Dashboard Name')
  readonly groupName = new Content(this.page.getByTestId('PackageNameContent'), 'Group Name')
  readonly groupNameTxtFld = new TextField(this.page.getByTestId('PackageNameTextField'), 'Group Name')
  readonly alias = new Content(this.page.getByTestId('AliasContent'), 'Alias')
  readonly serviceName = new Content(this.page.getByTestId('ServiceNameContent'), 'Service Name')
  readonly serviceNameTxtFld = new TextField(this.page.getByTestId('ServiceNameTextField'), 'Service Name')
  readonly parentGroup = new Content(this.page.getByTestId('ParentGroupContent'), 'Parent Group')
  readonly packageVisibility = new Content(this.page.getByTestId('PackageVisibilityContent'), 'Package Visibility')
  readonly packageVisibilitySwitch = new Switch(this.page.getByTestId('PackageVisibilitySwitch'), 'Package Visibility')
  readonly description = new Content(this.page.getByTestId('DescriptionContent'), 'Description')
  readonly descriptionTxtFld = new TextField(this.page.getByTestId('DescriptionTextField'), 'Description')
  readonly configurationBtn = new Button(this.page.getByTestId('ConfigurationAccordionButton'), 'Configuration Accordion')
  readonly defReleaseVersion = new Content(this.page.getByTestId('DefaultReleaseVersionContent'), 'Default Release Version')
  readonly defReleaseVersionAc = new Autocomplete(this.page.getByTestId('DefaultReleaseVersionAutocomplete'), 'Default Release Version')
  readonly pattern = new Content(this.page.getByTestId('ReleaseVersionPatternContent'), 'Release Version Pattern')
  readonly patternTxtFld = new TextField(this.page.getByTestId('ReleaseVersionPatternTextField'), 'Release Version Pattern')
  readonly deletePackageDialog = new BaseDeleteDialog(this.page)

  constructor(page: Page) {
    super(page.getByTestId('TabButton-general'), 'General')
  }
}
