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
