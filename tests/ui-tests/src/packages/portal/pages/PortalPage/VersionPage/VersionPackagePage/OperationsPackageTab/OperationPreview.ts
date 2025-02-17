import type { Page } from '@playwright/test'
import { BaseComponent, Button, Content, Placeholder } from '@shared/components/base'
import { DocView, RawView } from '@shared/components/custom'

export class OperationPreview extends BaseComponent {

  readonly operationTitle = new Content(this.mainLocator.getByTestId('OperationTitle'), 'Operation Title')
  readonly btnDoc = new Button(this.mainLocator.getByTestId('ModeButton-doc'), 'Doc')
  readonly btnSimple = new Button(this.mainLocator.getByTestId('ModeButton-simple'), 'Simple')
  readonly btnRaw = new Button(this.mainLocator.getByTestId('ModeButton-raw'), 'Raw')
  readonly viewDoc = new DocView(this.page)
  readonly viewRaw = new RawView(this.page)
  readonly phNoContent = new Placeholder(this.mainLocator.getByTestId('NoContentPlaceholder'), 'No content')

  constructor(private readonly page: Page) {
    super(page.getByTestId('OperationPreview'), 'Operation Preview')
  }
}
