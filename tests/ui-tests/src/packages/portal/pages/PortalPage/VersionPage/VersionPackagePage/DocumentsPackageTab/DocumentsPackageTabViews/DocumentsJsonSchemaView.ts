import type { Page } from '@playwright/test'
import { DocumentsFileViewToolbar } from './DocumentsFileView/DocumentsFileViewToolbar'
import { JsonSchemaView } from '@shared/components/custom'

export class DocumentsJsonSchemaView {

  readonly toolbar = new DocumentsFileViewToolbar(this.page)
  readonly viewer = new JsonSchemaView(this.page)

  constructor(protected readonly page: Page) { }
}
