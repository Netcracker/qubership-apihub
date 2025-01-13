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

import type { Locator } from '@playwright/test'
import { BaseComponent, Button, Content } from '@shared/components/base'

abstract class UploadedFilePreview extends BaseComponent {

  readonly fileName = new Content(this.rootLocator.locator('div').first(), 'File Name')
  readonly deleteBtn = new Button(this.rootLocator.getByTestId('DeleteButton'), 'Delete')

  protected constructor(rootLocator: Locator, componentName: string) {
    super(rootLocator, componentName, 'preview')
  }
}

export class DownloadableFilePreview extends UploadedFilePreview {
  constructor(rootLocator: Locator) {
    super(rootLocator.getByTestId('DownloadableFilePreview'), 'Downloadable File')
  }
}

export class NotDownloadableFilePreview extends UploadedFilePreview {
  constructor(rootLocator: Locator) {
    super(rootLocator.getByTestId('NotDownloadableFilePreview'), 'Not Downloadable File')
  }
}
