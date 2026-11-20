import { ElementHandle, Page } from 'puppeteer'
import { TextControl } from '../controls'

export class TextControlImpl implements TextControl {
  constructor(
    private readonly _domElement: ElementHandle,
    private readonly _page: Page,
    private readonly _prepareToNextRenderFinish: () => Promise<void>
  ) {
  }

  public async fill(text: string, waitUpdate = true): Promise<void> {
    const promise = waitUpdate ? this._prepareToNextRenderFinish() : new Promise<void>(r => setTimeout(r, 1))
    await this._page.evaluate((newContent, element) => {
      // WA for react component https://stackoverflow.com/questions/23892547/what-is-the-best-way-to-trigger-onchange-event-in-react-js
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
      nativeInputValueSetter.call(element, newContent)
      const ev2 = new Event('input', { bubbles: true })
      element.dispatchEvent(ev2)
    }, text, this._domElement)
    return promise
  }
}
