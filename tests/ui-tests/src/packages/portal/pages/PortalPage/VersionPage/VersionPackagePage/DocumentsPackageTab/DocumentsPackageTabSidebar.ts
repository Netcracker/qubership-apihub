import type { Page } from '@playwright/test'
import { Button, SearchBar } from '@shared/components/base'
import { DocOpenapiButton } from './DocumentsPackageTabSidebar/DocOpenapiButton'
import { DocMdButton } from './DocumentsPackageTabSidebar/DocMdButton'
import { DocFileButton } from './DocumentsPackageTabSidebar/DocFileButton'

export class DocumentsPackageTabSidebar {

  readonly searchbar = new SearchBar(this.page.getByTestId('SearchDocuments'), 'Documents')

  constructor(protected page: Page) { }

  getAllFiles(): Button {
    return new Button(this.page.getByTestId('DocumentButton'), '', 'file')
  }

  getDocRestButton(docName: string): DocOpenapiButton {
    return new DocOpenapiButton(this.page.getByTestId('DocumentsList').getByRole('button', {
      name: docName,
      exact: true,
    }), docName)
  }

  getDocMdButton(fileSlug: string): DocMdButton {
    return new DocMdButton(this.page.getByTestId('DocumentsList').getByRole('button', {
      name: fileSlug,
      exact: true,
    }), fileSlug)
  }

  getDocFileButton(fileSlug: string): DocFileButton {
    return new DocFileButton(this.page.getByTestId('DocumentsList').getByRole('button', {
      name: fileSlug,
      exact: true,
    }), fileSlug)
  }
}
