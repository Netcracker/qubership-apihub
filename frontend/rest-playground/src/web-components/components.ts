import { RestExamples } from '../containers/RestExamples'
import { RestPlayground } from '../containers/RestPlayground'
import { createElementClass } from './createElementClass'

export const RestPlaygroundElement = createElementClass(RestPlayground, {
  document: { type: 'string', defaultValue: '' },
  // mockUrl,
  // onRequestChange,
  // requestBodyIndex,
  // embeddedInMd = false,
  // tryItCredentialsPolicy,
  // corsProxy,
  // proxyServer,
  // @ts-ignore
  customServers: { type: 'string' },
  token: { type: 'string', defaultValue: '' },
  origin: { type: 'string', defaultValue: window.location.origin },
})

export const RestExamplesElement = createElementClass(RestExamples, {
  document: { type: 'string', defaultValue: '' },
  fullScreenAvailable: { type: 'boolean', defaultValue: true },
})
