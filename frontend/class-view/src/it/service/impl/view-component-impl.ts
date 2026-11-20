import { ElementHandle } from 'puppeteer'
import { ViewComponent } from '../view-component'
import { captureScreenshot } from '../storybook-functions'
import { EventEmitter } from 'events'
import { EVENT_NAME_UPDATE_FINISH } from '../storybook-constant'

export class ViewComponentImpl implements ViewComponent {

  constructor(
    private readonly _domElement: ElementHandle,
    private readonly _renderEventTarget: EventEmitter
  ) {
  }

  public async captureScreenshot(): Promise<Uint8Array> {
    return captureScreenshot(this._domElement)
  }

  public prepareToNextRenderFinish(): Promise<void> {
    return ViewComponentImpl.startWaitingUpdateFinish(this._renderEventTarget)
  }

  public static startWaitingUpdateFinish(eventEmitter: EventEmitter): Promise<void> {
    let resolve: () => void
    const promise = new Promise<void>(x => resolve = x)
    eventEmitter.once(EVENT_NAME_UPDATE_FINISH, () => {
      resolve()
    })
    return promise
  }

  public async clickOnLabel(label: string): Promise<void> {
    const renderFinish = this.prepareToNextRenderFinish()
    const element = await this.findTextElement(label)
    await element.click()
    await renderFinish
  }

  public async clickOnCanvas(x: number, y: number): Promise<void> {
    await this._domElement.click({ offset: { x, y } })
  }

  private async findTextElement(text: string): Promise<ElementHandle> {
    let elements: ElementHandle[] = await this._domElement.$$(`::-p-xpath(.//*[name()='text'][text()='${text}'])`)
    if (elements.length === 0) {
      elements = await this._domElement.$$(`::-p-xpath(.//*[name()='tspan'][text()='${text}'])`)
    }
    if (elements.length > 0) {
      return elements[0]
    }
    throw new Error(`Element ${text} is not found`)
  }
}
