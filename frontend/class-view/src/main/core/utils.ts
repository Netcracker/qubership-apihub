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

import { FontWeight, OneLineText, Optional, Pixel } from 'main/domain/base'

const SVG_NAMESPACE_URI = 'http://www.w3.org/2000/svg'
const XML_NAMESPACE_URI = 'http://www.w3.org/XML/1998/namespace'
const FAR_FAR_AWAY = '99999'

export function isDefine<E>(optional: Optional<E>): optional is E {
  return optional !== null && optional !== undefined
}

export function createFarFarAwaySvg(container: HTMLElement): SVGSVGElement {
  const svg = container.ownerDocument.createElementNS(SVG_NAMESPACE_URI, 'svg')
  svg.style.position = 'absolute'
  svg.style.left = FAR_FAR_AWAY
  svg.style.top = FAR_FAR_AWAY
  return svg
}

export function createSvgTSpanElement(rootElement: SVGSVGElement, fontSize: Pixel, fontWeight: FontWeight, text: OneLineText): SVGTSpanElement {
  const textTspan = rootElement.ownerDocument.createElementNS(SVG_NAMESPACE_URI, 'tspan')
  // otherwise whitespaces will be trimmed
  textTspan.setAttributeNS(XML_NAMESPACE_URI, 'xml:space', 'preserve')
  textTspan.style.fontSize = fontSize.toString()
  textTspan.style.fontWeight = fontWeight.toString()
  textTspan.textContent = text
  return textTspan
}

export function createSvgTextElement(rootElement: SVGSVGElement): SVGTextElement {
  return rootElement.ownerDocument.createElementNS(SVG_NAMESPACE_URI, 'text')
}