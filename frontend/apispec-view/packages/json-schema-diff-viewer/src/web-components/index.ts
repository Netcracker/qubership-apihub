import { JsonSchemaDiffViewerElement, JsonSchemaViewerElement } from './components';

if (!window.customElements.get('json-schema-diff-viewer'))
  window.customElements.define('json-schema-diff-viewer', JsonSchemaDiffViewerElement);

if (!window.customElements.get('json-schema-viewer'))
  window.customElements.define('json-schema-viewer', JsonSchemaViewerElement);
