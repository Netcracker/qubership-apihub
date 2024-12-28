import { BoundingBox, ElementHandle, Frame, KeyInput, MouseButton, MouseMoveOptions, Page } from 'puppeteer'
import { EventEmitter } from 'events'
import * as packageJson from '../package.json'
import { JSONSchemaForNPMPackageJsonFiles as PackageJson } from '@schemastore/package'
import { NOT_DISPLAYED_ON_SCREENSHOTS_OVERLAY_ID, SVG_EXPORT_STATE_ATTR, } from '../.storybook/constants'
import { waitStoryFrame } from './util'
import {
  LEFT_PANEL_SPLITTER_POSITION,
  PREVIEW_HEIGHT,
  PREVIEW_WIDTH,
  RIGHT_PANEL_SPLITTER_POSITION,
  SCREEN_HEIGHT,
  SCREEN_WIDTH,
} from '../.config/it/constants'

const NAVIGATION_TIMEOUT = 60_000
const WAIT_COMPONENT_TIMEOUT = 60_000
const WAIT_NEXT_RENDER_TIMEOUT = 60_000
const WAIT_NEXT_RENDER_DEBOUNCE = 300

export interface DomElement {
  captureScreenshot(): Promise<Buffer>;

  waitAttributeValue(name: string, value: string): Promise<void>;
}

export interface SvgExportElement {
  captureScreenshot(): Promise<Buffer>;
}

export interface StoryComponent {
  captureScreenshot(): Promise<Buffer>;

  clickAt(clientX: number, clientY: number): Promise<void>;

  clickWithCtrlAt(clientX: number, clientY: number): Promise<void>;

  mouseMoveAt(clientX: number, clientY: number, steps?: number): Promise<void>;

  mouseDownAt(clientX: number, clientY: number): Promise<void>;

  mouseUpAt(clientX: number, clientY: number): Promise<void>;

  keyboardDown(code: KeyInput): Promise<void>;

  keyboardUp(code: KeyInput): Promise<void>;

  waitForEventDispatch(): Promise<void>;

  mouseMoveVertically(clientX: number, steps?: number): Promise<void>;

  mouseMoveVerticallyPercent(percentWidth: number, steps?: number): Promise<void>;

  mouseMoveHorizontally(clientY: number, steps?: number): Promise<void>;

  mouseMoveHorizontallyPercent(percentHeight: number, steps?: number): Promise<void>;

  startDragWithSnapWaiting(startX: number, startY: number, directionX: number, directionY: number): Promise<void>;

  dragOverWithRenderWaiting(x: number, y: number, steps?: number): Promise<void>;

  finishDragWithSnapWaiting(x: number, y: number): Promise<void>;

  addEventListener(type: string, listener: (event: CustomEvent) => void): Promise<DetachableListener>;
}

export interface StoryPage {
  domElementById(id: string): Promise<DomElement>;

  storyComponentById(componentId: string, expectedAutoFitSize?: string): Promise<StoryComponent>;

  svgExportElementById(svgElementId: string, svgContainerId?: string, exportState?: string): Promise<SvgExportElement>;

  prepareToNextRenderFinish(options?: { breakTimeout?: number, debounceInterval?: number }): Promise<void>;

  doWithWaitRenderFinish(callback: () => Promise<void>): Promise<void>;

  reset(): Promise<void>;

  close(): Promise<void>;
}

export interface DetachableListener {
  detach(): Promise<void>;
}

export async function storyPage(page: Page, storyName: string, options?: {
  navigationTimeout?: number | undefined,
  waitRenderTimeout?: number | undefined
}): Promise<StoryPage> {
  const pkgJson = packageJson as PackageJson
  const devDependencies = pkgJson.devDependencies
  if (!devDependencies || !devDependencies['@storybook/html']) {
    throw new Error('No Storybook in devDependencies')
  }
  await page.evaluateOnNewDocument((currentStorybookVersion: string, leftPanelSplitterPosition: number, rightPanelSplitterPosition: number) => {
    localStorage.setItem('storybook-layout', JSON.stringify({
      resizerPanel: { x: rightPanelSplitterPosition, y: 0 },
      resizerNav: { x: leftPanelSplitterPosition, y: 0 },
    }))
    localStorage.setItem('@storybook/ui/store', JSON.stringify({
      ui: { enableShortcuts: false, sidebarAnimations: true, docsMode: false },
      layout: { isToolshown: true, isFullscreen: false, showPanel: true, showNav: true, panelPosition: 'right' },
      versions: {
        current: { version: currentStorybookVersion },
        latest: {
          version: currentStorybookVersion,
          info: { plain: '' },
        },
        next: {
          version: currentStorybookVersion,
          info: { plain: '' },
        },
      },
      lastVersionCheck: new Date().getTime(),
    }))

    /*
      Storybook recreates(or reloads) entire content beginning from the child of '#root'. It happens just DURING making screenshot!!!
      As the result we could see white screenshots and errors: `Attempted to use detached Frame 'C3BB63FE892E4CFB7E2F219219C661BD'`
      We do not know the root cause, but I had a proof that it happened while `page.screenshot()` or `elementHandle.screenshot()` calls.

      What we have:
      We could see that storybook handles changes of size via ResizeObservable. And also we noticed resize of element `#root > div[class='sto-rc1jbh']` from 1800x980 to 1x1!!!
      After wasting 2-3 weeks I should admit inability to fix it in a good way. Please, If you know how to fix it better, let me(Gorshkov Leonid) know.

      To continue research know that the case can be reproduced simpler with following parameters of screenshot:
      ```typescript
      // captureScreenshot:
      // ...
      const screenShotBuffer = (await page!.screenshot({encoding: "binary", type: "png", fullPage: true})) as Buffer;
      // ...
      ```
      and this test:
      ```typescript
          beforeAll(async () => {
             await jestPuppeteer.resetPage();
             story = await storyPage(page, "device-component--gigavue-hc3");
          });
          afterAll(async () => await story.close());
          beforeEach(async () => {
             component = await story.storyComponentById("device-component");
          });
          afterEach(async () => await story.reset());
          for (let i = 0; i < 5; i++) {
              it("Initial View " + i, async () => await component.captureScreenshot())
          }
      ```

      To handle the fact of strange resize you can add code here:
      ```typescript
      // node_modules/@storybook/manager/dist/chunk-Q4UME242.mjs
      createNotifier=function(onResize,setSize,handleWidth,handleHeight){return function(_a){var width=_a.width,height=_a.height;>>>>>>>if(width < 5 || height < 5){debugger;};<<<<<<<<<<<
      ```

      To handle the case of detach of frame use this code:
      ```typescript
      page.on("framedetached", async ()=>{
             require("console").log(`!!! FRAME DETACHED `, "page: ", page.url())
             if(frame?.url()) cons.log(`!!!   frame: ${frame?.url().substring(0, Math.min(frame?.url().length, 160))}...`)
         })
      ```
     */
    class MyResizeObserver extends ResizeObserver {
      constructor(delegate: ResizeObserverCallback) {
        super((entries) => {
          const filteredEntries = entries?.filter((e) => (e?.contentRect?.width ?? 0) > 1 && (e?.contentRect?.height ?? 0) > 1)
          delegate(filteredEntries, this)
        })
      }
    }

    window.ResizeObserver = MyResizeObserver
  }, devDependencies['@storybook/html'], LEFT_PANEL_SPLITTER_POSITION, RIGHT_PANEL_SPLITTER_POSITION)

  await page.setViewport({ width: SCREEN_WIDTH, height: SCREEN_HEIGHT })

  await page.goto(`${host()}?path=/story/${storyName}`, {
    waitUntil: 'networkidle2',
    timeout: options?.navigationTimeout ?? NAVIGATION_TIMEOUT,
  })

  await page.waitForSelector('#storybook-panel-root', { timeout: WAIT_COMPONENT_TIMEOUT })

  const storyFrame = await waitStoryFrame(page)
  const storyPageImpl = new StoryPageImpl(page, storyFrame, options)
  await storyPageImpl.initRenderFinishListening()
  return storyPageImpl
}

export function host(): string {
  return `http://${process.env.HOST_ADDRESS ?? 'localhost'}:9009`
}

class DomElementImpl implements DomElement {
  constructor(private readonly _domElement: ElementHandle, private readonly _storyFrame: Frame) {
  }

  public async captureScreenshot(): Promise<Buffer> {
    return captureScreenshot(this._storyFrame, this._domElement)
  }

  public async waitAttributeValue(name: string, value: string): Promise<void> {
    await waitAttributeValue(this._domElement, name, value)
  }
}

class SvgExportElementImpl implements SvgExportElement {
  constructor(private readonly _domElement: ElementHandle, private readonly _storyFrame: Frame) {
  }

  public async captureScreenshot(): Promise<Buffer> {
    return captureScreenshot(this._storyFrame, this._domElement)
  }
}

class StorybookComponentImpl implements StoryComponent {

  constructor(
    private readonly _page: Page,
    private readonly _storyPage: StoryPageImpl,
    private readonly _domElement: ElementHandle,
    private readonly _storyFrame: Frame,
  ) {
  }

  public async captureScreenshot(): Promise<Buffer> {
    return await captureScreenshot(this._storyFrame, this._domElement)
  }

  public async clickAt(clientX: number, clientY: number): Promise<void> {
    const coords = await this.correctCoordinates(clientX, clientY)
    await this._storyPage.mouseMove(coords.screenX, coords.screenY, { steps: 5 })
    await this._storyPage.mouseDown()
    await this._storyPage.mouseUp()
  }

  public async clickWithCtrlAt(clientX: number, clientY: number): Promise<void> {
    const coords = await this.correctCoordinates(clientX, clientY)
    await this._storyPage.mouseMove(coords.screenX, coords.screenY, { steps: 5 })
    await this._storyPage.keyboardDown('Control')
    await this._storyPage.mouseDown()
    await this._storyPage.mouseUp()
    await this._storyPage.keyboardUp('Control')
  }

  public async mouseMoveAt(clientX: number, clientY: number, steps?: number): Promise<void> {
    const coords = await this.correctCoordinates(clientX, clientY)
    await this._storyPage.mouseMove(coords.screenX, coords.screenY, { steps: steps ? steps : 5 })
  }

  public async mouseMoveVertically(clientX: number, steps?: number): Promise<void> {
    const canvasBounds: BoundingBox | null = await this.getCanvasBoundingBox()

    if (canvasBounds) {
      await this.mouseMoveAt(clientX, 0, 1)
      await this.mouseMoveAt(clientX, canvasBounds.height, steps)
    }
  }

  public async mouseMoveVerticallyPercent(percentWidth: number, steps?: number): Promise<void> {
    const canvasBounds: BoundingBox | null = await this.getCanvasBoundingBox()

    if (canvasBounds) {
      await this.mouseMoveVertically(canvasBounds.width * percentWidth / 100, steps)
    }
  }

  public async mouseMoveHorizontally(clientY: number, steps?: number): Promise<void> {
    const canvasBounds: BoundingBox | null = await this.getCanvasBoundingBox()

    if (canvasBounds) {
      await this.mouseMoveAt(0, clientY, 1)
      await this.mouseMoveAt(canvasBounds.width, clientY, steps)
    }
  }

  public async mouseMoveHorizontallyPercent(percentHeight: number, steps?: number): Promise<void> {
    const canvasBounds: BoundingBox | null = await this.getCanvasBoundingBox()

    if (canvasBounds) {
      await this.mouseMoveHorizontally(canvasBounds.height * percentHeight / 100, steps)
    }
  }

  public async mouseDownAt(clientX: number, clientY: number): Promise<void> {
    const coords = await this.correctCoordinates(clientX, clientY)
    await this._storyPage.mouseMove(coords.screenX, coords.screenY, { steps: 5 })
    await this._storyPage.mouseDown()
  }

  public async mouseUpAt(clientX: number, clientY: number): Promise<void> {
    const coords = await this.correctCoordinates(clientX, clientY)
    await this._storyPage.mouseMove(coords.screenX, coords.screenY, { steps: 5 })
    await this._storyPage.mouseUp()
  }

  public async keyboardDown(code: KeyInput): Promise<void> {
    await this._storyPage.keyboardDown(code)
  }

  public async keyboardUp(code: KeyInput): Promise<void> {
    await this._storyPage.keyboardUp(code)
  }

  public async waitForEventDispatch(): Promise<void> {
    return this._page.waitForTimeout(500)
  }

  public async startDragWithSnapWaiting(startX: number, startY: number, directionX: number, directionY: number): Promise<void> {
    await this.mouseDownAt(startX, startY)

    const repaintPromise = this._storyPage.prepareToNextRenderFinish()
    const shiftX = directionX - startX
    const shiftY = directionY - startY
    const shiftLength = Math.hypot(shiftX, shiftY)
    if (shiftLength === 0) {
      await this.mouseMoveAt(startX + 5, startY + 5, 1)
      await this.mouseMoveAt(startX, startY, 1)
      await repaintPromise // wait snap guides
      return
    }
    await this.mouseMoveAt(startX + shiftX * 5 / shiftLength, startY + shiftY * 5 / shiftLength, 5)
    await repaintPromise // wait snap guides
  }

  public async dragOverWithRenderWaiting(x: number, y: number, steps?: number): Promise<void> {
    const repaintPromise = this._storyPage.prepareToNextRenderFinish()
    await this.mouseMoveAt(x, y, steps)
    await repaintPromise
  }

  public async finishDragWithSnapWaiting(x: number, y: number): Promise<void> {
    await this.dragOverWithRenderWaiting(x, y) // need to wait final snap apply
    const repaintPromise = this._storyPage.prepareToNextRenderFinish()
    await this.mouseUpAt(x, y)
    await repaintPromise
  }

  public async addEventListener(type: string, listener: (event: CustomEvent) => void): Promise<DetachableListener> {
    const exposeFunctionName = (type + '_' + Math.random()).replace(/[-.]/g, '')
    const suffixForDetach = '_event_listener'
    await this._page.exposeFunction(exposeFunctionName, listener)
    await this._domElement.evaluate((_, type, exposeFunctionName, suffixForDetach) => {
      function calculateAllPublicPropertyKeys(o: object): string[] {//Object.keys doesn't work. Why?
        let objectToInspect
        let result: string[] = []
        for (objectToInspect = o; objectToInspect !== null; objectToInspect = Object.getPrototypeOf(objectToInspect)) {
          result = result.concat(Object.getOwnPropertyNames(objectToInspect))
        }
        return result.filter(key => !key.startsWith('_'))
      }

      const handler: (e: CustomEvent) => void = (e: CustomEvent) => {
        const resultWithGrabbed: { [key: string]: object } = {}
        calculateAllPublicPropertyKeys(e.detail).forEach(key => resultWithGrabbed[key] = e.detail[key]);
        (window as any)[exposeFunctionName]({ type, detail: resultWithGrabbed })
      }
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      //@ts-ignore
      document.addEventListener(type, handler);
      (window as any)[exposeFunctionName + suffixForDetach] = handler
    }, type, exposeFunctionName, suffixForDetach)
    const detachableListener = new DetachableListenerImpl(this._domElement, type, exposeFunctionName + suffixForDetach)
    await this._storyPage.addDetachableListener(detachableListener)
    return detachableListener
  }

  private async getCanvasBoundingBox(): Promise<BoundingBox | null> {
    return this._domElement.boundingBox()
  }

  private async correctCoordinates(clientX: number, clientY: number): Promise<{ screenX: number, screenY: number }> {
    const box: BoundingBox | null = await this.getCanvasBoundingBox()
    const screenX = box ? box.x + clientX : clientX
    const screenY = box ? box.y + clientY : clientY
    return Promise.resolve({ screenX, screenY })
  }
}

class DetachableListenerImpl implements DetachableListener {
  constructor(private readonly _domElement: ElementHandle, private readonly _type: string, private readonly _listenerUID: string) {
  }

  public async detach(): Promise<void> {
    await this._domElement.evaluate((_, listenerUID: string, eventType: string) => {
      const handler: (e: Event) => void = (window as any)[listenerUID]
      document.removeEventListener(eventType, handler);
      (window as any)[listenerUID] = null
    }, this._listenerUID, this._type)
  }
}

class RenderEventEmitter extends EventEmitter {}

type Disposable = { dispose: () => unknown }

class StoryPageImpl implements StoryPage {
  private readonly _renderEventTarget: EventEmitter = new RenderEventEmitter()
  private readonly _keyboardDownButtons: Set<KeyInput> = new Set()
  private readonly _mousedDownButtons: Set<MouseButton> = new Set()
  private _detachableListeners: DetachableListener[] = []
  private _disposables: Disposable[] = []

  constructor(
    private readonly _page: Page,
    private readonly _storyFrame: Frame,
    private readonly _options?: { waitRenderTimeout?: number | undefined },
  ) {
  }

  public async addDetachableListener(detachableListener: DetachableListener): Promise<void> {
    await this._detachableListeners.push(detachableListener)
  }

  public async keyboardDown(code: KeyInput): Promise<void> {
    this._keyboardDownButtons.add(code)
    await this._page.keyboard.down(code)
  }

  public async keyboardUp(code: KeyInput): Promise<void> {
    this._keyboardDownButtons.delete(code)
    await this._page.keyboard.up(code)
  }

  public async mouseDown(button: MouseButton = MouseButton.Left): Promise<void> {
    this._mousedDownButtons.add(button)
    await this._page.mouse.down({ button: button })
  }

  public async mouseUp(button: MouseButton = MouseButton.Left): Promise<void> {
    this._mousedDownButtons.delete(button)
    await this._page.mouse.up({ button: button })
  }

  public async mouseMove(x: number, y: number, options?: MouseMoveOptions): Promise<void> {
    await this._page.mouse.move(x, y, options)
  }

  public async domElementById(id: string): Promise<DomElement> {
    const element = await this._storyFrame.waitForSelector(`#${id}`, { timeout: WAIT_COMPONENT_TIMEOUT })
    if (!element) {
      throw new Error(`Component with id '${id}' not found!`)
    }
    return new DomElementImpl(element, this._storyFrame)
  }

  public async initRenderFinishListening(): Promise<void> {
    await this._page.exposeFunction('renderFinish', () => this._renderEventTarget.emit('render-event'))
  }

  public async storyComponentById(componentId: string, expectedAutoFitSize = `${PREVIEW_WIDTH}x${PREVIEW_HEIGHT}`): Promise<StoryComponent> {
    const element = await this._storyFrame.waitForSelector(`#${componentId}`, { timeout: WAIT_COMPONENT_TIMEOUT })
    if (!element) {
      throw new Error(`Component with id '${componentId}' not found!`)
    }
    this._disposables.push(element)
    await element.evaluate(async (component, expectedSize) => {
      const callbackFunction = (window as any)['renderFinish']
      if (!callbackFunction) {
        throw 'Now body listen render-finish event. This is a mistake at current moment'
      }
      const pingTimeout = 100
      const checkLastRenderingTime = (resolve: (value: void | PromiseLike<void>) => void): void => {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        if (!component.lastRenderingTime) {
          setTimeout(() => resolve(new Promise(checkLastRenderingTime)), pingTimeout)
        } else {
          //may be we shod do following code for ANY rendering wait
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          const lastRenderTime = component.lastRenderingTime.getTime()
          const currentTime = new Date().getTime()
          if (currentTime - lastRenderTime >= 500 /*we need more lucky*/) {
            resolve()
          } else {
            setTimeout(() => resolve(new Promise(checkLastRenderingTime)), pingTimeout)
          }
        }
      }
      //decorators#enableAutoFitContent - root cause for this checks. We should wait until component size will become as expected
      const checkAutoFitDone = (resolve: (value: void | PromiseLike<void>) => void): void => {
        const boundingClientRect = component.getBoundingClientRect()
        const actualSize = `${boundingClientRect.width.toFixed(0)}x${boundingClientRect.height.toFixed(0)}`
        if (actualSize === expectedSize) {
          resolve()
        } else {
          setTimeout(() => resolve(new Promise(checkAutoFitDone)), pingTimeout)
        }
      }
      await new Promise(checkAutoFitDone)
      await new Promise(checkLastRenderingTime)

      component.addEventListener('render-finish', () => {
        callbackFunction()
      })
    }, expectedAutoFitSize)

    return new StorybookComponentImpl(this._page, this, element, this._storyFrame)
  }

  public async svgExportElementById(svgElementId: string, svgContainerId?: string, exportState?: string): Promise<SvgExportElement> {
    if (svgContainerId && exportState) {
      await waitElementWithAttributeValue(await this._storyFrame, svgContainerId, SVG_EXPORT_STATE_ATTR, exportState)
    }

    const element = await this._storyFrame.waitForSelector(`#${svgElementId}`, { timeout: WAIT_COMPONENT_TIMEOUT })
    if (!element) {
      throw new Error(`Component with id '${svgElementId}' not found!`)
    }
    await element.evaluate((component) => {
      const textElements: SVGTextElement[] = []
      const texts = component.getElementsByTagNameNS('http://www.w3.org/2000/svg', 'text')
      for (let i = 0; i < texts.length; i++) {
        textElements.push(texts.item(i) as SVGTextElement)
      }
      textElements.forEach(text => {
        const numberOfChars = text.getNumberOfChars()
        if (numberOfChars == 0) {
          return
        }

        const transform = text.getAttribute('transform')
        const fontSize = parseFloat(getComputedStyle(text).fontSize || '0')
        const fontFill = text.style.fill
        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
        if (transform) {
          rect.setAttribute('transform', transform)
        }
        rect.style.fill = fontFill
        let minX = Number.MAX_SAFE_INTEGER
        let minY = Number.MAX_SAFE_INTEGER
        let maxX = Number.MIN_SAFE_INTEGER
        let maxY = Number.MIN_SAFE_INTEGER
        const longestLine: Map<number, number> = new Map()
        for (let char = 0; char < numberOfChars; char++) {
          const start = text.getStartPositionOfChar(char)
          const end = text.getEndPositionOfChar(char)
          minY = Math.min(start.y - fontSize * 0.75, minY)
          maxY = Math.max(end.y + fontSize * 0.25, maxY)
          minX = Math.min(start.x, minX)
          maxX = Math.max(end.x, maxX)
          longestLine.set(end.y, (longestLine.get(end.y) || 0) + 1)
        }

        let crossBrowserFakeTextWidth = Math.round(Array.from(longestLine.values()).reduce((p, c) => Math.max(p, c), 0) * fontSize / 2.0)

        rect.x.baseVal.newValueSpecifiedUnits(SVGLength.SVG_LENGTHTYPE_PX, minX)
        rect.y.baseVal.newValueSpecifiedUnits(SVGLength.SVG_LENGTHTYPE_PX, minY)
        rect.width.baseVal.newValueSpecifiedUnits(SVGLength.SVG_LENGTHTYPE_PX, /*maxX - minX*/crossBrowserFakeTextWidth)
        rect.height.baseVal.newValueSpecifiedUnits(SVGLength.SVG_LENGTHTYPE_PX, maxY - minY)
        const parentElement = text.parentElement
        if (parentElement) {
          // Try to reduce substrate. Remove this later. But we need test for text in export.
          const substrate = parentElement.querySelector('rect[data-substrate-marker-width-just-for-test-dont-use-it]')
          if (substrate instanceof SVGRectElement) {
            crossBrowserFakeTextWidth = parseFloat(substrate.dataset.substrateMarkerWidthJustForTestDontUseIt || '0')
            substrate.width.baseVal.newValueSpecifiedUnits(SVGLength.SVG_LENGTHTYPE_CM, crossBrowserFakeTextWidth)
            rect.width.baseVal.newValueSpecifiedUnits(SVGLength.SVG_LENGTHTYPE_CM, crossBrowserFakeTextWidth)
          }
          parentElement.insertBefore(rect, text)
          parentElement.removeChild(text)
        }
      })
    })

    return new SvgExportElementImpl(element, this._storyFrame)
  }

  public prepareToNextRenderFinish(options?: {
    timeout?: number,
    debounceInterval?: number
  } | undefined): Promise<void> {
    const breakTimeout: number = options?.timeout ?? this._options?.waitRenderTimeout ?? WAIT_NEXT_RENDER_TIMEOUT
    const debounceInterval: number = options?.debounceInterval ?? WAIT_NEXT_RENDER_DEBOUNCE
    let resolve: () => void
    let reject: (err: unknown) => void
    const promise = new Promise<void>((x, y) => {
      resolve = x
      reject = y
    })
    let timeout: number | undefined
    let guardTimeout: number | undefined
    const waitFunction = () => {
      if (timeout) {
        clearTimeout(timeout)
      }
      // fixme: waiting XXXms after last event. Better understand why we need this delay
      timeout = setTimeout(() => {
        if (guardTimeout) {
          clearTimeout(guardTimeout)
        }
        timeout = undefined
        guardTimeout = undefined
        this._renderEventTarget.off('render-event', waitFunction)
        resolve()
      }, debounceInterval) as unknown as number
    }
    guardTimeout = setTimeout(() => {
      if (timeout) {
        clearTimeout(timeout)
      }
      timeout = undefined
      guardTimeout = undefined
      this._renderEventTarget.off('render-event', waitFunction)
      reject(new Error(`Timeout ${breakTimeout} of waiting of next render event is exceed`))
    }, breakTimeout) as unknown as number
    this._renderEventTarget.on('render-event', waitFunction)
    return promise
  }

  public async doWithWaitRenderFinish(callback: () => Promise<void>): Promise<void> {
    const promise = this.prepareToNextRenderFinish()
    await callback()
    return promise
  }

  private async detachAllListeners(): Promise<void> {
    for (const listener of this._detachableListeners) {
      await listener.detach()
    }
    this._detachableListeners = []
  }

  /* To avoid memory leaks */
  private async disposeAll(): Promise<void> {
    for (const disposable of this._disposables) {
      await disposable.dispose()
    }
    this._disposables = []
  }

  public async reset(): Promise<void> {
    /* To avoid memory leaks. See "objects may be retained by debugger context and DevTools console" in https://developer.chrome.com/docs/devtools/memory-problems/get-started?hl=en */
    // eslint-disable-next-line no-restricted-syntax
    await this._page.evaluate(() => console.clear())
    await this.detachAllListeners()
    await this.disposeAll()
    const button: ElementHandle | undefined = await this._page.waitForXPath('//button[text()="Reset" and not(@name)]', { timeout: WAIT_COMPONENT_TIMEOUT }) as ElementHandle<HTMLButtonElement>
    if (!button) {
      throw new Error('Unable to find Reset button')
    }
    try {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      for (const downButton of this._keyboardDownButtons) {
        await this.keyboardUp(downButton)
      }
      for (const mouseButton of this._mousedDownButtons) {
        await this.mouseUp(mouseButton)
      }
      await button.click()
      await this.mouseMove(0, 0, { steps: 0 })

    } catch (e) {
      // ignore
      console.error(e)
    } finally {
      await button.dispose()
      if (this._keyboardDownButtons.size) {
        // eslint-disable-next-line no-unsafe-finally
        throw new Error(`Not all keyboard keys are up (${this._keyboardDownButtons}). It make affect next tests. Check the implementation. `)
      }
      if (this._mousedDownButtons.size) {
        // eslint-disable-next-line no-unsafe-finally
        throw new Error(`Not all mouse buttons are up (${this._mousedDownButtons}). It make affect next tests. Check the implementation. `)
      }
    }
  }

  public async close(): Promise<void> {
    await this.detachAllListeners()
  }
}

async function captureScreenshot(storyFrame: Frame, domElement: ElementHandle): Promise<Buffer> {
  await storyFrame.$(`#${NOT_DISPLAYED_ON_SCREENSHOTS_OVERLAY_ID}`)
    .then((overlay: ElementHandle<Element> | null) => overlay ? overlay.evaluate((element: Element) => (element as HTMLElement).style.visibility = 'hidden') : Promise.resolve(null))

  const screenShotBuffer = (await domElement!.screenshot({ encoding: 'binary', type: 'png' })) as Buffer
  await storyFrame.$(`#${NOT_DISPLAYED_ON_SCREENSHOTS_OVERLAY_ID}`)
    .then((overlay: ElementHandle<Element> | null) => overlay ? overlay.evaluate((element: Element) => (element as HTMLElement).style.visibility = 'visible') : Promise.resolve(null))
  return screenShotBuffer
}

async function waitElementWithAttributeValue(executionContext: Frame, domElementId: string, name: string, value: string): Promise<void> {
  await executionContext.evaluate(async (domElementId, name, value) => {
    const pingTimeout = 100
    const check = (resolve: (value: void | PromiseLike<void>) => void): void => {
      const htmlElement = document.getElementById(domElementId)
      if (!htmlElement) {
        setTimeout(() => resolve(new Promise(check)), pingTimeout)
      } else {
        const actualValue = htmlElement.getAttribute('data-' + name)
        if (!actualValue) {
          setTimeout(() => resolve(new Promise(check)), pingTimeout)
        } else {
          if (actualValue === value) {
            resolve()
          } else {
            setTimeout(() => resolve(new Promise(check)), pingTimeout)
          }
        }
      }
    }
    await new Promise(check)
  }, domElementId, name, value)
}

async function waitAttributeValue(domElement: ElementHandle, name: string, value: string): Promise<void> {
  await domElement.evaluate(async (component, name, value) => {
    const pingTimeout = 100
    const check = (resolve: (value: void | PromiseLike<void>) => void): void => {
      const actualValue = component.getAttribute('data-' + name)
      if (!actualValue) {
        setTimeout(() => resolve(new Promise(check)), pingTimeout)
      } else {
        if (actualValue === value) {
          resolve()
        } else {
          setTimeout(() => resolve(new Promise(check)), pingTimeout)
        }
      }
    }
    await new Promise(check)
  }, name, value)
}
