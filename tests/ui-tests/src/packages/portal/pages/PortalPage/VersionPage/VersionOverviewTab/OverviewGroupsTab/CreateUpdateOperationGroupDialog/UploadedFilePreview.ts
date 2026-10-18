import type { Locator } from '@playwright/test'
import { BaseComponent, Button, Content } from '@shared/components/base'

abstract class UploadedFilePreview extends BaseComponent {

  readonly fileName = new Content(this.rootLocator.locator('div').first(), 'File Name')
  readonly deleteBtn = new Button(this.rootLocator.getByTestId('DeleteButton'), 'Delete')

  protected constructor(rootLocator: Locator, componentName: string) {
    super(rootLocator, componentName, 'preview')
  }
}

export class DownloadableFilePreview extends UploadedFilePreview {
  constructor(rootLocator: Locator) {
    super(rootLocator.getByTestId('DownloadableFilePreview'), 'Downloadable File')
  }
}

export class NotDownloadableFilePreview extends UploadedFilePreview {
  constructor(rootLocator: Locator) {
    super(rootLocator.getByTestId('NotDownloadableFilePreview'), 'Not Downloadable File')
  }
}
