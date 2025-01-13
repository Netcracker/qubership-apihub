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
import { Icon, TableCell } from '@shared/components/base'

export class DashboardPackagesTreeCell extends TableCell {

  readonly conflictAlertIcon = new Icon(this.mainLocator.getByTestId('ConflictAlert'), 'Conflict Alert', 'package icon')
  readonly notExistAlertIcon = new Icon(this.mainLocator.getByTestId('NotExistAlert'), 'Not exist Alert', 'package icon')
  readonly conflictIndicatorIcon = new Icon(this.mainLocator.getByTestId('ConflictIndicator'), 'Conflict Indicator', 'package icon')
  readonly notExistIndicatorIcon = new Icon(this.mainLocator.getByTestId('NotExistIndicator'), 'Not exist Indicator', 'package icon')

  constructor(rootLocator: Locator, componentName?: string, componentType?: string) {
    super(rootLocator, componentName, componentType)
  }
}
