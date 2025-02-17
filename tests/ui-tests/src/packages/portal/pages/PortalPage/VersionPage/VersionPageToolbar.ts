import type { Page } from '@playwright/test'
import { CompareMenu } from '@portal/components'
import { Breadcrumbs, Button, Content, Title } from '@shared/components/base'
import { VersionSelect } from './BasePackageVersionPageToolbar/VersionSelect'

export class VersionPageToolbar {

  readonly breadcrumbs = new Breadcrumbs(this.page.getByTestId('PackageBreadcrumbs'), 'Package')
  readonly title = new Title(this.page.getByTestId('ToolbarTitleTypography'), 'Package')
  readonly status = new Content(this.page.getByTestId('VersionStatusChip'), 'Version Status')
  readonly versionSlt = new VersionSelect(this.page)
  readonly addNewVersionBtn = new Button(this.page.getByTestId('AddNewVersionButton'), 'Add New Version')
  readonly copyBtn = new Button(this.page.getByTestId('CopyVersionButton'), 'Copy')
  readonly exportBtn = new Button(this.page.getByTestId('ExportVersionButton'), 'Export')
  readonly compareMenu = new CompareMenu(this.page)
  readonly editVersionBtn = new Button(this.page.getByTestId('EditButton'), 'Edit Version')
  readonly settingsBtn = new Button(this.page.getByTestId('PackageSettingsButton'), 'Package Settings')
  readonly createVersionBtn = new Button(this.page.getByTestId('CreateVersionButton'), 'Create Version')

  constructor(protected readonly page: Page) { }
}
