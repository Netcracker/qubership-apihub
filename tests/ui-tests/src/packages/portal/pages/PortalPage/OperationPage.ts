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
import { GraphView } from '@shared/components/custom/views/GraphView'
import { OperationPageToolbar } from './OperationPage/OperationPageToolbar'
import { OperationModelList } from './OperationPage/OperationModelList'
import { DocView, RawView } from '@shared/components/custom'
import { DependantOperationsWindow } from './OperationPage/DependantOperationsWindow'
import { ExamplesPanel } from './OperationPage/ExamplesPanel'
import { PlaygroundPanel } from './OperationPage/PlaygroundPanel'

export class OperationPage {

  readonly toolbar = new OperationPageToolbar(this.page)
  readonly sidebar = new OperationModelList(this.page)
  readonly docView = new DocView(this.page)
  readonly graphView = new GraphView(this.page)
  readonly rawView = new RawView(this.page)
  readonly playgroundPanel = new PlaygroundPanel(this.page)
  readonly examplesPanel = new ExamplesPanel(this.page)
  readonly dependantOperationsWindow = new DependantOperationsWindow(this.page)

  constructor(private readonly page: Page) { }
}
