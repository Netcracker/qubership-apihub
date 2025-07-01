import type { Page } from '@playwright/test'
import { Button } from '@shared/components/base'

export class VersionPageSidebar {
  readonly expandBtn = new Button(this.page.getByTestId('ExpandButton'), 'Expand')
  readonly collapseBtn = new Button(this.page.getByTestId('CollapseButton'), 'Collapse')

  constructor(private readonly page: Page) { }
}
