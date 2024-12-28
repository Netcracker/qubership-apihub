/**
 * Copyright 2024-2025 NetCracker Technology Corporation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { FontWeight, Integer, OneLineText, Optional, Pixel, Ratio } from 'main/domain'
import { DEFAULT_ELLIPSIS_CHARACTER } from 'main/defaults'
import { createFarFarAwaySvg, createSvgTextElement, createSvgTSpanElement, isDefine } from 'main/core/utils'

interface TextCropRule {
  readonly text: OneLineText;
  readonly fontSize: Pixel;
  readonly fontWeight: FontWeight;
  readonly cropRatio?: Optional<Ratio>;
}

export interface TextService {
  cropOneLineTextHorizontally(totalWidth: Pixel, parts: TextCropRule[], ellipsis?: OneLineText): OneLineText[/*parts.length*/]
}

interface TextPart {
  readonly rule: TextCropRule;
  readonly element: SVGTSpanElement;
  readonly currentLength: Pixel;
  result: Optional<OneLineText>;
}

export class TextServiceImpl implements TextService {
  private readonly _svg: SVGSVGElement

  constructor(
    container: HTMLElement,
  ) {
    this._svg = createFarFarAwaySvg(container)
    container.appendChild(this._svg)
  }

  cropOneLineTextHorizontally(totalWidth: Pixel, rules: TextCropRule[], ellipsis: OneLineText = DEFAULT_ELLIPSIS_CHARACTER): OneLineText[] {
    if (rules.length === 0) {
      return []
    }
    const textElement = createSvgTextElement(this._svg)
    try {
      this._svg.appendChild(textElement)
      const partToTSpan: Map<TextCropRule, TextPart> = new Map(rules
        .map(rule => {
          const element = createSvgTSpanElement(this._svg, rule.fontSize, rule.fontWeight, rule.text)
          textElement.appendChild(element)
          return [rule, {
            rule: rule,
            element: element,
            currentLength: element.getComputedTextLength(),
            result: undefined,
          } satisfies TextPart]
        }))
      if (textElement.getComputedTextLength() <= totalWidth) {
        return rules.map(value => value.text)
      } else {
        let textParts = [...partToTSpan.values()]
          .sort((a, b) => a.currentLength < b.currentLength ? -1 : a.currentLength === b.currentLength ? 0 : 1)
        const availableWidthAfterFixed = textParts
          .reduce((availableWidth, part) => {
            if (!isDefine(part.rule.cropRatio)) {
              part.result = part.rule.text
              return availableWidth - part.currentLength
            }
            return availableWidth
          }, totalWidth)
        const availableWidthAfterSmall = (
          textParts = textParts.filter(part => !isDefine(part.result))
        )
          .reduce((availableWidth, part) => {
            if (part.currentLength <= availableWidthAfterFixed * part.rule.cropRatio!) {
              part.result = part.rule.text
              return availableWidth - part.currentLength
            }
            return availableWidth
          }, availableWidthAfterFixed)
        textParts
          .filter(part => !isDefine(part.result))
          .reduce((availableWidth, part, index, array) => {
            const maximumWidth = index === (array.length - 1) ? availableWidth : availableWidthAfterSmall * part.rule.cropRatio!
            const element = part.element
            element.textContent = ellipsis + element.textContent
            const endCharIndex = this.findCropIndex(element, maximumWidth)
            part.result = part.rule.text.substring(0, endCharIndex - 1) + ellipsis
            const subStringLength = part.element.getSubStringLength(0, endCharIndex)
            return availableWidth - subStringLength
          }, availableWidthAfterSmall)
        return rules.map(rule => partToTSpan.get(rule)?.result || '')
      }
    } finally {
      this._svg.removeChild(textElement)
    }
  }

  private findCropIndex(element: SVGTSpanElement, width: Pixel): Integer {
    const maxPosition = (element.textContent || '').length
    let shiftCount = maxPosition / 2.0
    let anchorCount = 0
    do {
      anchorCount += shiftCount
      const length = element.getSubStringLength(0, Math.min(Math.ceil(anchorCount), maxPosition))
      if (length > width) {
        shiftCount = -Math.abs(shiftCount) / 2.0
      } else {
        shiftCount = Math.abs(shiftCount) / 2.0
      }
    } while (Math.abs(shiftCount) >= 1)
    const candidate = Math.floor(anchorCount + shiftCount)
    return element.getSubStringLength(0, Math.min(candidate + 1, maxPosition)) <= width ? Math.min(candidate + 1, maxPosition) : candidate
  }
}
