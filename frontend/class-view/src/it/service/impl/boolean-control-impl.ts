import { ElementHandle } from 'puppeteer'
import { BooleanControl } from '../controls'

export class BooleanControlImpl implements BooleanControl {

  constructor(
    private readonly _domElement: ElementHandle,
    private readonly _prepareToNextRenderFinish: () => Promise<void>
  ) {
  }

  public async click(waitUpdate = true): Promise<void> {
    const promise = waitUpdate ? this._prepareToNextRenderFinish() : new Promise<void>(r => setTimeout(r, 1))
    // Storybook 10 renders the switch over a 1x1 px checkbox, so a mouse click at its center misses it.
    await this._domElement.evaluate(input => (input as HTMLInputElement).click())
    return promise
  }

  public async checked(): Promise<boolean> {
    return this._domElement.evaluate(input => (input as HTMLInputElement).checked, this._domElement)
  }
}
