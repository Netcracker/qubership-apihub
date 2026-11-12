import FontFaceObserver from 'fontfaceobserver'

import { FontFamily, FontWeight, Pixel } from 'main/domain'
import {
  DEFAULT_CLASS_TITLE_FONT_SIZE,
  DEFAULT_CLASS_TITLE_FONT_WEIGHT,
  DEFAULT_LEAF_PROPERTY_FONT_SIZE,
  DEFAULT_LEAF_PROPERTY_FONT_WEIGHT,
  DEFAULT_PROPERTIES_GROUP_FONT_SIZE,
  DEFAULT_PROPERTIES_GROUP_FONT_WEIGHT,
} from 'main/defaults'
import { createFarFarAwaySvg, createSvgTextElement, createSvgTSpanElement } from 'main/core/utils'

export class FontObserver {
  private readonly _defaultFont

  constructor(private readonly _container: HTMLElement) {
    const fontFamily = getComputedStyle(this._container).fontFamily.split(',')[0]
    this._defaultFont = this.waitFontLoad(fontFamily,
      [...new Set([DEFAULT_CLASS_TITLE_FONT_WEIGHT, DEFAULT_LEAF_PROPERTY_FONT_WEIGHT, DEFAULT_PROPERTIES_GROUP_FONT_WEIGHT])],
      [...new Set([DEFAULT_CLASS_TITLE_FONT_SIZE, DEFAULT_LEAF_PROPERTY_FONT_SIZE, DEFAULT_PROPERTIES_GROUP_FONT_SIZE])],
    )
  }

  public load(): Promise<unknown> {
    return this._defaultFont
  }

  private async waitFontLoad(fontFamily: FontFamily, fontWeights: FontWeight[], fontSizes: Pixel[]): Promise<unknown> {
    const promises = fontWeights.map(fontWeight =>
      new FontFaceObserver(fontFamily, { weight: fontWeight }).load(null, 10_000)
        .then(() =>
          new Promise<void>(resolve => {
            const svg = createFarFarAwaySvg(this._container)
            this._container.appendChild(svg)
            const textElement = createSvgTextElement(svg)
            const textTspan = createSvgTSpanElement(svg, fontSizes[0], fontWeight, 'Loading...')
            textElement.appendChild(textTspan)
            const resizeObserver = new ResizeObserver(entries => {
              for (const entry of entries) {
                if (entry.target === textElement) {
                  resizeObserver.unobserve(textElement)
                  svg.removeChild(textElement)
                  this._container.removeChild(svg)
                  resolve()
                  return
                }
              }
              resizeObserver.unobserve(textElement)
              svg.removeChild(textElement)
              this._container.removeChild(svg)
            })
            resizeObserver.observe(textElement)
            svg.appendChild(textElement)
          }),
        ),
    )
    try {
      return await Promise.all(promises)
    } catch (e) {
      return console.error(`Application is failed. Fonts: [${fontFamily}] have not been loaded`, e)
    }
  }
}


