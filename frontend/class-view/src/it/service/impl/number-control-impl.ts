import { ElementHandle, Page } from 'puppeteer'
import { NumberControl } from '../controls'

export class NumberControlImpl implements NumberControl {
  constructor(
    private readonly _domElement: ElementHandle,
    private readonly _prepareToNextRenderFinish: () => Promise<void>,
    private readonly _page: Page
  ) {
  }

  public async set(value: number, waitUpdate = true): Promise<void> {
    const promise = waitUpdate ? this._prepareToNextRenderFinish() : Promise.resolve()
    await this._page.evaluate((newContent, element) => {
      // WA for react component https://stackoverflow.com/questions/23892547/what-is-the-best-way-to-trigger-onchange-event-in-react-js
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
      nativeInputValueSetter.call(element, newContent)
      const ev2 = new Event('input', { bubbles: true })
      element.dispatchEvent(ev2)
    }, value, this._domElement)
    return promise
  }
}
