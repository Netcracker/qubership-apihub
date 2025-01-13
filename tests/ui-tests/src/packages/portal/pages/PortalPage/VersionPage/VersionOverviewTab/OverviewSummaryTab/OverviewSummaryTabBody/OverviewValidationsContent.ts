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
import { Content } from '@shared/components/base'

export class OverviewValidationsContent {

  readonly operations = new Content(this.locator.getByTestId('NumberOfOperationsTypography'), 'Number of operations')
  readonly deprecatedOperations = new Content(this.locator.getByTestId('NumberOfDeprecatedOperationsTypography'), 'Number of deprecated operations')
  readonly noBwcOperations = new Content(this.locator.getByTestId('NumberOfNoBwcOperationsTypography'), 'Number of no-BWC operations')
  readonly bwcErrors = new Content(this.locator.getByTestId('NumberOfBwcErrorsTypography'), 'Number of BWC errors')
  readonly breakingChanges = new Content(this.locator.getByTestId('breaking'), 'Breaking changes')
  readonly semiBreakingChanges = new Content(this.locator.getByTestId('semi-breaking'), 'Semi-breaking changes')
  readonly deprecatedChanges = new Content(this.locator.getByTestId('deprecated'), 'Deprecated changes')
  readonly nonBreakingChanges = new Content(this.locator.getByTestId('non-breaking'), 'Non-breaking changes')
  readonly annotationChanges = new Content(this.locator.getByTestId('annotation'), 'Annotation changes')
  readonly unclassifiedChanges = new Content(this.locator.getByTestId('unclassified'), 'Unclassified changes')

  constructor(private readonly locator: Locator) { }
}
