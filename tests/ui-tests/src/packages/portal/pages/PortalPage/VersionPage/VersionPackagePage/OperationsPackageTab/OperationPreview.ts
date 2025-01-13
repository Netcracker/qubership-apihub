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
import { BaseComponent, Button, Content, Placeholder } from '@shared/components/base'
import { DocView, RawView } from '@shared/components/custom'

export class OperationPreview extends BaseComponent {

  readonly operationTitle = new Content(this.mainLocator.getByTestId('OperationTitle'), 'Operation Title')
  readonly btnDoc = new Button(this.mainLocator.getByTestId('ModeButton-doc'), 'Doc')
  readonly btnSimple = new Button(this.mainLocator.getByTestId('ModeButton-simple'), 'Simple')
  readonly btnRaw = new Button(this.mainLocator.getByTestId('ModeButton-raw'), 'Raw')
  readonly viewDoc = new DocView(this.page)
  readonly viewRaw = new RawView(this.page)
  readonly phNoContent = new Placeholder(this.mainLocator.getByTestId('NoContentPlaceholder'), 'No content')

  constructor(private readonly page: Page) {
    super(page.getByTestId('OperationPreview'), 'Operation Preview')
  }
}
