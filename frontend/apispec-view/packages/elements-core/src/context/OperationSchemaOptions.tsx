import { SchemaViewMode } from '@netcracker/qubership-apihub-apispec-view-json-schema-viewer';
import * as React from 'react';

export type OperationSchemaOptions = {
  schemaViewMode?: SchemaViewMode;
  defaultSchemaDepth?: number;
};

export const OperationSchemaOptionsContext = React.createContext<OperationSchemaOptions>({
  schemaViewMode: 'detailed',
  defaultSchemaDepth: undefined,
});
OperationSchemaOptionsContext.displayName = 'OperationSchemaViewModeContext';

export const useOperationSchemaOptionsMode = () => React.useContext(OperationSchemaOptionsContext);

