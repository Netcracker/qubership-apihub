import type { Page } from '@playwright/test'
import { DocumentsMdViewToolbar } from './DocumentsMdView/DocumentsMdViewToolbar'
import { MdView } from '@shared/components/custom'

export class DocumentsMdView {

  readonly toolbar = new DocumentsMdViewToolbar(this.page)
  readonly viewer = new MdView(this.page)

  constructor(protected readonly page: Page) { }
}
