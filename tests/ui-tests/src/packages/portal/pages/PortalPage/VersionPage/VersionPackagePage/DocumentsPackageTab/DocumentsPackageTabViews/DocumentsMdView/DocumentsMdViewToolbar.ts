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

import { type Page } from '@playwright/test'
import { DocumentsFileViewToolbar } from '../DocumentsFileView/DocumentsFileViewToolbar'
import { DocumentsMdActionMenu } from '../../../DocumentsPackageTab/DocumentsMdActionMenu'

export class DocumentsMdViewToolbar extends DocumentsFileViewToolbar {

  readonly downloadMenu = new DocumentsMdActionMenu(this.page.getByTestId('DocumentToolbar').getByTestId('DocumentActionsButton'), 'Markdown')

  constructor(protected readonly page: Page) {
    super(page)
  }
}
