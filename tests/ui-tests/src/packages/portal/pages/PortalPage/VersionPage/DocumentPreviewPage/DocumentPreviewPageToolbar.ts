import type { Page } from '@playwright/test'
import { Breadcrumbs, Button, Title } from '@shared/components/base'
import { DocumentsActionMenu } from '@portal/pages/PortalPage/VersionPage/VersionPackagePage/DocumentsPackageTab/DocumentsActionMenu'

export class DocumentPreviewPageToolbar {

  readonly breadcrumbs = new Breadcrumbs(this.page.getByTestId('PackageBreadcrumbs'), 'Document')
  readonly title = new Title(this.page.getByTestId('ToolbarTitleTypography'), 'Document')

  readonly backBtn = new Button(this.page.getByTestId('BackButton'), 'Back')
  readonly simpleBtn = new Button(this.page.locator('button[value=simple]'), 'Simple')
  readonly detailedBtn = new Button(this.page.locator('button[value=detailed]'), 'Detailed')
  readonly docBtn = new Button(this.page.locator('button[value=doc]'), 'Doc')
  readonly rawBtn = new Button(this.page.locator('button[value=raw]'), 'Raw')
  readonly moreMenu = new DocumentsActionMenu(this.page.getByTestId('ExportDocumentMenuButton'), 'More')

  constructor(protected readonly page: Page) { }
}
