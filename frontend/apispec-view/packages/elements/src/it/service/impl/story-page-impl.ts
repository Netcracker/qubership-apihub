import { ElementHandle, NodeFor, WaitForSelectorOptions } from 'puppeteer'
import { StoryPage } from '../story-page'
import { ViewComponentImpl } from './view-component-impl'
import { ViewComponent } from '../view-component'

interface SelectorLookup {
  waitForSelector<Selector extends string>(selector: Selector, options?: WaitForSelectorOptions): Promise<ElementHandle<NodeFor<Selector>> | null>;
}

export class StoryPageImpl implements StoryPage {
  constructor(
    private readonly _root: SelectorLookup) {
  }

  public async viewComponent(): Promise<ViewComponent> {
    // @ts-ignore
    const element = await this._root.waitForSelector('#mosaic-provider-react-aria-0-1')
    if (!element) {
      throw new Error('Unable to find view component')
    }
    return new ViewComponentImpl(element)
  }
}
