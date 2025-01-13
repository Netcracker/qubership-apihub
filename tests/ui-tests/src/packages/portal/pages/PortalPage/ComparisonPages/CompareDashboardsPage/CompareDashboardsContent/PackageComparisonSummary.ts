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
import { BaseComponent, Content } from '@shared/components/base'
import { OperationChangesSummary } from '../../ComparePackagesPage/ComparePackagesContent/OperationChangesSummary'

export class PackageComparisonSummary extends BaseComponent {

  readonly componentType: string = 'comparison summary'
  readonly dashboardPath = new Content(this.mainLocator.getByTestId('DashboardPath'), `Path of ${this.componentName}`)
  readonly packageVersionTitle = new Content(this.mainLocator.getByTestId('PackageVersionTitle'), `Version title of ${this.componentName}`)
  readonly packageVersionStatus = new Content(this.mainLocator.getByTestId('PackageVersionStatus'), `Publish status of ${this.componentName}`)
  readonly restApiChanges = new OperationChangesSummary(this.mainLocator.getByTestId('ChangesApiType-rest').getByTestId('ChangesSummary'), `REST API changes of ${this.componentName}`)
  readonly graphQlChanges = new OperationChangesSummary(this.mainLocator.getByTestId('ChangesApiType-graphql').getByTestId('ChangesSummary'), `GraphQL changes of ${this.componentName}`)

  constructor(rootLocator: Locator, componentName?: string, componentType?: string) {
    super(rootLocator, componentName, componentType)
  }
}
