import fontAwesomeStyles from '!!raw-loader!@fortawesome/fontawesome-svg-core/styles.css';
import styles from '!!raw-loader!@stoplight/mosaic/styles.css';
import defaultTheme from '!!raw-loader!@stoplight/mosaic/themes/default.css';

import { JsonSchemaDiffViewer, JsonSchemaViewer } from '../components';
import { createElementClass } from './createElementClass';

const style = document.createElement('style');
style.textContent = styles;
const defaultThemeStyle = document.createElement('style');
defaultThemeStyle.textContent = defaultTheme.replaceAll(':root', ':host');
const fontAwesomeStyle = document.createElement('style');
fontAwesomeStyle.textContent = fontAwesomeStyles;

export const JsonSchemaDiffViewerElement = createElementClass(
  JsonSchemaDiffViewer,
  // @ts-expect-errors FIXME 04.06.24 // later
  {
    schema: { type: 'object' },
    withoutDiff: { type: 'boolean' },
    beforeSchema: { type: 'object' },
    afterSchema: { type: 'object' },
    emptyText: { type: 'string' },
    className: { type: 'string' },
    resolveRef: { type: 'function' },
    onTreePopulated: { type: 'function' },
    maxHeight: { type: 'number' },
    parentCrumbs: { type: 'object' },

    defaultExpandedDepth: { type: 'number' },
    viewMode: { type: 'string' },
    onGoToRef: { type: 'function' },
    renderRowAddon: { type: 'function' },
    hideExamples: { type: 'boolean' },
    renderRootTreeLines: { type: 'boolean' },
    disableCrumbs: { type: 'boolean' },

    onError: { type: 'function' },
    FallbackComponent: { type: 'function' },
    recoverableProps: { type: 'object' },
  },
  [style, defaultThemeStyle, fontAwesomeStyle],
);

export const JsonSchemaViewerElement = createElementClass(
  JsonSchemaViewer,
  // @ts-expect-errors FIXME 04.06.24 // later
  {
    schema: { type: 'object' },
    emptyText: { type: 'string' },
    className: { type: 'string' },
    resolveRef: { type: 'function' },
    onTreePopulated: { type: 'function' },
    maxHeight: { type: 'number' },
    parentCrumbs: { type: 'object' },

    defaultExpandedDepth: { type: 'number' },
    viewMode: { type: 'string' },
    onGoToRef: { type: 'function' },
    renderRowAddon: { type: 'function' },
    hideExamples: { type: 'boolean' },
    renderRootTreeLines: { type: 'boolean' },
    disableCrumbs: { type: 'boolean' },

    onError: { type: 'function' },
    FallbackComponent: { type: 'function' },
    recoverableProps: { type: 'object' },
  },
  [style, defaultThemeStyle, fontAwesomeStyle],
);
