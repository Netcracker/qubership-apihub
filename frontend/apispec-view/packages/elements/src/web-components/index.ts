import { ApiElement } from './components';

if (!window.customElements.get('apispec-view')) {
  window.customElements.define('apispec-view', ApiElement);
}
