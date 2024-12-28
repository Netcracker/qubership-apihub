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

import '@netcracker/qubership-apihub-rest-playground'
import '@netcracker/qubership-apihub-rest-playground/index.css'
import { createComponent } from '@lit-labs/react'
import React from 'react'

class ExamplesHTMLElement extends HTMLElement {
  document?: string
  fullScreenAvailable?: boolean
}

export type ExamplesElementProps = Partial<{
  document: string
  fullScreenAvailable?: boolean
}>

const ExamplesElement = createComponent({
  tagName: 'rest-examples',
  elementClass: ExamplesHTMLElement,
  react: React,
})
export default ExamplesElement
