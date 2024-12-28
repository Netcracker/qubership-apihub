import { ElementHandle } from 'puppeteer'
import { ViewComponent } from '../view-component'
import { captureScreenshot } from '../storybook-functions'

export class ViewComponentImpl implements ViewComponent {

  constructor(
    private readonly _domElement: ElementHandle,
  ) {
  }

  public async captureScreenshot(): Promise<Buffer | string> {
    return captureScreenshot(this._domElement)
  }
}
