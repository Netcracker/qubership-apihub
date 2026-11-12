import { ElementHandle } from 'puppeteer'
import { EmbeddedOptionsControl } from '../controls'

export class EmbeddedOptionsControlImpl implements EmbeddedOptionsControl {
  constructor(
    private readonly _domElement: ElementHandle,
    private readonly _prepareToNextRenderFinish: () => Promise<void>
  ) {
  }

  public async check(name: string, waitUpdate = true): Promise<void> {
    const promise = waitUpdate ? this._prepareToNextRenderFinish() : new Promise<void>(r => setTimeout(r, 1))
    const input = await this._domElement.waitForSelector(`input[value="${name}"]`)
    if (!input) {
      throw new Error(`Unable to find input ${name}`)
    }
    await input.click()
    return promise
  }
}
