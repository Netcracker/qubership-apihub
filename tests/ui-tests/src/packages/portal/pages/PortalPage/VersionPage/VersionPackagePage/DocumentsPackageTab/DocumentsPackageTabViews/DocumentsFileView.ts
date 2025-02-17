import type { Page } from '@playwright/test'
import { DocumentsFileViewToolbar } from './DocumentsFileView/DocumentsFileViewToolbar'
import { DocumentsFileContent } from './DocumentsFileView/DocumentsFileContent'

export class DocumentsFileView {

  readonly toolbar = new DocumentsFileViewToolbar(this.page)
  readonly content = new DocumentsFileContent({
    locator: this.page.getByTestId('UnsupportedFilePlaceholder'),
    componentName: 'Unsupported file',
  })

  constructor(protected readonly page: Page) { }
}
