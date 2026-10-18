import { ErrorBoundaryProps } from '@stoplight/react-error-boundary/types';
import * as React from 'react';

import { JsonSchemaDiffViewer, JsonSchemaDiffViewerProps } from './JsonSchemaDiffViewer';

export const JsonSchemaViewer: React.FC<
  Omit<JsonSchemaDiffViewerProps & ErrorBoundaryProps, 'beforeSchema' | 'afterSchema' | 'withoutDiff'>
> = props => {
  return <JsonSchemaDiffViewer schema={props.schema} withoutDiff {...props} />;
};
