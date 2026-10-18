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
