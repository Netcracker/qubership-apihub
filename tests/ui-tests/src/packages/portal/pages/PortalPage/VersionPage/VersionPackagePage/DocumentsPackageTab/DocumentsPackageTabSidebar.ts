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
