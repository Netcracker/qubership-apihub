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
import { ComparePackagesContent } from './ComparePackagesPage/ComparePackagesContent'
import { ComparePackagesSidebar } from './ComparePackagesPage/ComparePackagesSidebar'
import { ComparePackagesToolbar } from './ComparePackagesPage/ComparePackagesToolbar'
import { ComparisonSwapper } from './ComparisonSwapper'

export class ComparePackagesPage {

  readonly toolbar = new ComparePackagesToolbar(this.page)
  readonly sidebar = new ComparePackagesSidebar(this.page)
  readonly swapper = new ComparisonSwapper(this.page)
  readonly compareContent = new ComparePackagesContent(this.page)

  constructor(private readonly page: Page) { }
}
