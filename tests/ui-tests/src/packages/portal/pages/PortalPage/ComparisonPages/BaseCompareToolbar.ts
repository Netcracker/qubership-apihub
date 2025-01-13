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
import { Breadcrumbs, Button } from '@shared/components/base'
import { ComparisonPagePackageSelect } from './BaseCompareToolbar/ComparisonPagePackageSelect'

export abstract class BaseCompareToolbar {

  readonly locator = this.page.getByTestId('ComparisonToolbar')
  readonly breadcrumbs = new Breadcrumbs(this.locator.getByTestId('ComparedPackagesBreadcrumbs'), 'Comparison')
  readonly backBtn = new Button(this.locator.getByTestId('BackButton'), 'Back')
  readonly packageSlt = new ComparisonPagePackageSelect(this.page)
  readonly breakingChangesFilterBtn = new Button(this.locator.getByTestId('ChangesFilterButton-breaking'), 'Breaking changes filter')
  readonly semiBreakingChangesFilterBtn = new Button(this.page.getByTestId('ChangesFilterButton-semi-breaking'), 'Semi-breaking changes filter')
  readonly deprecatedChangesFilterBtn = new Button(this.locator.getByTestId('ChangesFilterButton-deprecated'), 'Deprecated changes filter')
  readonly nonBreakingChangesFilterBtn = new Button(this.locator.getByTestId('ChangesFilterButton-non-breaking'), 'Non-breaking changes filter')
  readonly annotationChangesFilterBtn = new Button(this.locator.getByTestId('ChangesFilterButton-annotation'), 'Annotation changes filter')
  readonly unclassifiedChangesFilterBtn = new Button(this.locator.getByTestId('ChangesFilterButton-unclassified'), 'Unclassified changes filter')

  protected constructor(protected readonly page: Page) { }
}
