import type { Page } from '@playwright/test'
import { DocumentPreviewPageToolbar } from './DocumentPreviewPage/DocumentPreviewPageToolbar'
import { ApiSpecView, RawView } from '@shared/components/custom'

export class DocumentPreviewPage {

  readonly toolbar = new DocumentPreviewPageToolbar(this.page)
  readonly apiSpecView = new ApiSpecView(this.page)
  readonly rawView = new RawView(this.page)

  constructor(private readonly page: Page) { }
}
