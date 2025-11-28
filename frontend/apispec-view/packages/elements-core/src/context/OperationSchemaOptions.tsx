import { SchemaViewMode } from 'json-schema-viewer';
import * as React from 'react';

export type OperationSchemaOptions = {
  schemaViewMode?: SchemaViewMode;
  defaultSchemaDepth?: number;
  oldRenderer?: boolean;
  notSplitSchemaViewer?: boolean;
};

export const OperationSchemaOptionsContext = React.createContext<OperationSchemaOptions>({
  schemaViewMode: 'detailed',
  defaultSchemaDepth: undefined,
  oldRenderer: false,
  notSplitSchemaViewer: false,
});
OperationSchemaOptionsContext.displayName = 'OperationSchemaViewModeContext';

export const useOperationSchemaOptionsMode = () => React.useContext(OperationSchemaOptionsContext);

