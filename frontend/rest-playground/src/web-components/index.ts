import { RestExamplesElement, RestPlaygroundElement } from './components'

if (!window.customElements.get('rest-playground')) {
  window.customElements.define('rest-playground', RestPlaygroundElement)
}
if (!window.customElements.get('rest-examples')) {
  window.customElements.define('rest-examples', RestExamplesElement)
}
