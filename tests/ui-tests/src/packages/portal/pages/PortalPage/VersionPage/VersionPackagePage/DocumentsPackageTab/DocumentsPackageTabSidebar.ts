import type { Page } from '@playwright/test'
import { Button, SearchBar } from '@shared/components/base'
import { DocumentsFileButton } from './DocumentsPackageTabSidebar/DocumentsFileButton'

export class DocumentsPackageTabSidebar {

  readonly searchbar = new SearchBar(this.page.getByTestId('SearchDocuments'), 'Documents')

  constructor(protected page: Page) { }

  getAllFiles(): Button {
    return new Button(this.page.getByTestId('DocumentButton'), '', 'file')
  }

  getFileButton(fileName: string): DocumentsFileButton {
    return new DocumentsFileButton(this.page.getByTestId('DocumentsList').getByRole('button', {
      name: fileName,
      exact: true,
    }), fileName)
  }
}
