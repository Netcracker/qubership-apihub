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

import { Tab } from '@shared/components/base'
import { OperationsTabSidebar } from '@portal/components'
import { PackageTabToolbar } from './PackageTabToolbar'
import { OperationPreview } from './OperationsPackageTab/OperationPreview'
import type { Locator } from '@playwright/test'

export abstract class BasePackageTabWithOperations extends Tab {

  readonly toolbar = new PackageTabToolbar(this.rootLocator.page())
  readonly sidebar = new OperationsTabSidebar(this.rootLocator)
  readonly operationPreview = new OperationPreview(this.rootLocator.page())

  protected constructor(readonly rootLocator: Locator, componentName?: string, componentType?: string) {
    super(rootLocator, componentName || '', componentType || '')
  }
}
