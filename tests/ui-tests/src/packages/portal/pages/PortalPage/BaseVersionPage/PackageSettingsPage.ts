import type { Page } from '@playwright/test'
import { Breadcrumbs, Button, Title } from '@shared/components/base'
import { GeneralSettingsTab } from './PackageSettingsPage/GeneralSettingsTab'
import { ApiSpecConfigTab } from './PackageSettingsPage/ApiSpecConfigTab'
import { VersionsTab } from './PackageSettingsPage/VersionsTab'
import { AccessControlTab } from './PackageSettingsPage/AccessControlTab'
import { AccessTokensTab } from './PackageSettingsPage/AccessTokensTab'

export class PackageSettingsPage {

  readonly breadcrumbs = new Breadcrumbs(this.page.getByTestId('PackageBreadcrumbs'), 'Package settings')
  readonly title = new Title(this.page.getByTestId('ToolbarTitleTypography'), 'Package settings')
  readonly exitBtn = new Button(this.page.getByTestId('ExitButton'), 'Exit')
  readonly generalTab = new GeneralSettingsTab(this.page)
  readonly apiSpecConfigTab = new ApiSpecConfigTab(this.page)
  readonly versionsTab = new VersionsTab(this.page)
  readonly accessTokensTab = new AccessTokensTab(this.page)
  readonly accessControlTab = new AccessControlTab(this.page)

  constructor(private readonly page: Page) { }
}
