import { ApiElement, ApiOperationElement, DiffApiOperationElement } from './components';

if (!window.customElements.get('apispec-view')) {
  window.customElements.define('apispec-view', ApiElement);
}

if (!window.customElements.get('operation-view')) {
  window.customElements.define('operation-view', ApiOperationElement);
}

if (!window.customElements.get('diff-operation-view')) {
  window.customElements.define('diff-operation-view', DiffApiOperationElement);
}
