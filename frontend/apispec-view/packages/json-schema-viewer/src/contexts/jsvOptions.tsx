import type { NodeHasChangedFn } from '@stoplight/types';
import * as React from 'react';

import { GoToRefHandler, RowAddonRenderer, SchemaViewMode, ViewMode } from '../types';

export type JSVOptions = {
  defaultExpandedDepth: number;
  viewMode: ViewMode;
  schemaViewMode: SchemaViewMode;
  onGoToRef?: GoToRefHandler;
  renderRowAddon?: RowAddonRenderer;
  hideExamples?: boolean;
  renderRootTreeLines?: boolean;
  disableCrumbs?: boolean;
  nodeHasChanged?: NodeHasChangedFn<React.ReactNode>;
};

const JSVOptionsContext = React.createContext<JSVOptions>({
  defaultExpandedDepth: 0,
  viewMode: 'standalone',
  schemaViewMode: 'detailed',
  hideExamples: false,
});

export const useJSVOptionsContext = () => React.useContext(JSVOptionsContext);

export const JSVOptionsContextProvider = JSVOptionsContext.Provider;
