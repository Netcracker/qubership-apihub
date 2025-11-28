import { createElementClass } from '@stoplight/elements-core';
import { OperationAPI } from '@stoplight/elements/containers/OperationAPI';

import fontAwesomeStyles from '!!raw-loader!@fortawesome/fontawesome-svg-core/styles.css';
import apihubDocViewerStyles from '!!raw-loader!@netcracker/qubership-apihub-api-doc-viewer/dist/style.css';
import elementsDiffCoreStyles from '!!raw-loader!@stoplight/diff-elements-core/core.css';
import elementsCoreStyles from '!!raw-loader!@stoplight/elements-core/core.css';
import mosaicStyles from '!!raw-loader!@stoplight/mosaic/styles.css';
import mosaicThemeStyles from '!!raw-loader!@stoplight/mosaic/themes/default.css';

import { DiffOperationAPI } from "@stoplight/elements/containers/DiffOperationAPI";
import { aggregatedDiffsMetaKey, diffsMetaKey } from 'diff-block';
import { API } from '../index';

const mosaicStyle = document.createElement('style');
mosaicStyle.textContent = mosaicStyles;

const mosaicThemeStyle = document.createElement('style');
mosaicThemeStyle.textContent = mosaicThemeStyles.replaceAll(':root', ':host');

const elementsCoreStyle = document.createElement('style');
elementsCoreStyle.textContent = elementsCoreStyles;

const elementsDiffCoreStyle = document.createElement('style');
elementsDiffCoreStyle.textContent = elementsDiffCoreStyles;

const fontAwesomeStyle = document.createElement('style');
fontAwesomeStyle.textContent = fontAwesomeStyles;

const apihubDocViewerStyle = document.createElement('style');
apihubDocViewerStyle.textContent = apihubDocViewerStyles;

const customStyle = document.createElement('style');
customStyle.textContent = `
    :host .sl-sidebar {
        --color-canvas-100: white;
        --color-canvas-200: #F5F7FA;
    }
    a.sl-flex.sl-items-center {
      display: none;
    }
    a.sl-flex.sl-justify-end {
      display: none;
    }
    div button.sl-button &:not(.sl-block){
      display: none;
    }
    .sl-select {
      display: none;
    }
`;

export const ApiElement = createElementClass(
  API,
  {
    apiDescriptionUrl: { type: 'string', defaultValue: '' },
    apiDescriptionDocument: { type: 'string', defaultValue: '' },
    basePath: { type: 'string' },
    staticRouterPath: { type: 'string' },
    router: { type: 'string' },
    layout: { type: 'string' },
    hideTryIt: { type: 'boolean' },
    hideSchemas: { type: 'boolean' },
    hideInternal: { type: 'boolean' },
    hideExport: { type: 'boolean' },
    logo: { type: 'string' },
    tryItCredentialsPolicy: { type: 'string' },
    tryItCorsProxy: { type: 'string' },
    selectedNodeUri: { type: 'string', defaultValue: '/' },
    searchPhrase: { type: 'string', defaultValue: '' },
    schemaViewMode: { type: 'string', defaultValue: 'detailed' },
    // @ts-ignore
    proxyServer: { type: 'string' },
  },
  [mosaicStyle, mosaicThemeStyle, elementsCoreStyle, fontAwesomeStyle, apihubDocViewerStyle],
);

export const ApiOperationElement = createElementClass(
  OperationAPI,
  {
    basePath: { type: 'string' },
    staticRouterPath: { type: 'string' },
    router: { type: 'string' },
    layout: { type: 'string' },
    hideTryIt: { type: 'boolean' },
    hideSchemas: { type: 'boolean' },
    hideInternal: { type: 'boolean' },
    hideExport: { type: 'boolean' },
    noHeading: { type: 'boolean' },
    logo: { type: 'string' },
    tryItCredentialsPolicy: { type: 'string' },
    tryItCorsProxy: { type: 'string' },
    selectedNodeUri: { type: 'string', defaultValue: '/' },
    searchPhrase: { type: 'string', defaultValue: '' },
    schemaViewMode: { type: 'string', defaultValue: 'detailed' },
    defaultSchemaDepth: { type: 'number' },
    // @ts-ignore
    proxyServer: { type: 'string' },
    hideExamples: { type: 'boolean' },
    options: { type: 'object' },
    // @ts-ignore
    mergedDocument: { type: 'object' },
  },
  [
    mosaicStyle,
    mosaicThemeStyle,
    elementsCoreStyle,
    elementsDiffCoreStyle,
    fontAwesomeStyle,
    customStyle,
    apihubDocViewerStyle,
  ],
);

export const DiffApiOperationElement = createElementClass(
  DiffOperationAPI,
  {
    basePath: { type: 'string' },
    staticRouterPath: { type: 'string' },
    router: { type: 'string' },
    layout: { type: 'string' },
    hideTryIt: { type: 'boolean' },
    hideSchemas: { type: 'boolean' },
    hideInternal: { type: 'boolean' },
    hideExport: { type: 'boolean' },
    noHeading: { type: 'boolean' },
    logo: { type: 'string' },
    tryItCredentialsPolicy: { type: 'string' },
    tryItCorsProxy: { type: 'string' },
    selectedNodeUri: { type: 'string', defaultValue: '/' },
    searchPhrase: { type: 'string', defaultValue: '' },
    schemaViewMode: { type: 'string', defaultValue: 'detailed' },
    defaultSchemaDepth: { type: 'number' },
    filters: { type: 'object', defaultValue: [] },
    // @ts-ignore
    proxyServer: { type: 'string' },
    hideExamples: { type: 'boolean' },
    options: { type: 'object' },
    // @ts-ignore
    mergedDocument: { type: 'object' },
    diffMetaKeys: {
      type: 'object',
      defaultValue: {
        diffsMetaKey: diffsMetaKey,
        aggregatedDiffsMetaKey: aggregatedDiffsMetaKey,
      },
    },
  },
  [
    mosaicStyle,
    mosaicThemeStyle,
    elementsCoreStyle,
    elementsDiffCoreStyle,
    fontAwesomeStyle,
    customStyle,
    apihubDocViewerStyle,
  ],
);
