import { createElementClass } from '@netcracker/qubership-apihub-apispec-view-elements-core';

import fontAwesomeStyles from '!!raw-loader!@fortawesome/fontawesome-svg-core/styles.css';
import elementsCoreStyles from '!!raw-loader!@netcracker/qubership-apihub-apispec-view-elements-core/core.css';
import mosaicStyles from '!!raw-loader!@stoplight/mosaic/styles.css';
import mosaicThemeStyles from '!!raw-loader!@stoplight/mosaic/themes/default.css';

import { API } from '../index';

const mosaicStyle = document.createElement('style');
mosaicStyle.textContent = mosaicStyles;

const mosaicThemeStyle = document.createElement('style');
mosaicThemeStyle.textContent = mosaicThemeStyles.replaceAll(':root', ':host');

const elementsCoreStyle = document.createElement('style');
elementsCoreStyle.textContent = elementsCoreStyles;

const fontAwesomeStyle = document.createElement('style');
fontAwesomeStyle.textContent = fontAwesomeStyles;

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
  [mosaicStyle, mosaicThemeStyle, elementsCoreStyle, fontAwesomeStyle],
);
