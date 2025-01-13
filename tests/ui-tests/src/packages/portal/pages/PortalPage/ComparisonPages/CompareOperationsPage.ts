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
import { ComparisonSwapper } from './ComparisonSwapper'
import { CompareOperationsToolbar } from './CompareOperationsPage/CompareOperationsToolbar'
import { CompareOperationsSidebar } from './CompareOperationsPage/CompareOperationsSidebar'
import { DiffDocView, DiffRawView } from '@shared/components/custom'

export class CompareOperationsPage {

  readonly toolbar = new CompareOperationsToolbar(this.page)
  readonly sidebar = new CompareOperationsSidebar(this.page)
  readonly swapper = new ComparisonSwapper(this.page)
  readonly docView = new DiffDocView(this.page)
  readonly rawView = new DiffRawView(this.page)

  constructor(private readonly page: Page) { }
}
