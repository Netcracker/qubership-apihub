import '@netcracker/qubership-apihub-rest-playground'
import '@netcracker/qubership-apihub-rest-playground/index.css'
import { createComponent } from '@lit-labs/react'
import React from 'react'

class PlaygroundHTMLElement extends HTMLElement {
  document?: string
  customServers?: string
  origin?: string
}

export type PlaygroundElementProps = Partial<{
  document: string
  customServers: string
  origin: string
}>

const PlaygroundElement = createComponent({
  tagName: 'rest-playground',
  elementClass: PlaygroundHTMLElement,
  react: React,
})
export default PlaygroundElement
