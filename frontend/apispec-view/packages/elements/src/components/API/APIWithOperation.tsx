import { HttpOperation as HttpOperationDiff } from '@stoplight/diff-elements-core/components/Docs/HttpOperation';
import {
  COMPARE_DISPLAY_MODE,
  useOperationDisplayMode,
} from '@stoplight/elements/containers/OperationDisplayModeContext';
import { ExportButtonProps, RoutingProps } from '@stoplight/elements-core';
import { HttpOperation } from '@stoplight/elements-core/components/Docs/HttpOperation';
import { IServer } from '@stoplight/elements-core/utils/http-spec/IServer';
import { IHttpOperation } from '@stoplight/types';
import { SchemaViewMode } from 'json-schema-viewer';
import * as React from 'react';

type PartialLayoutProps = {
  operation: IHttpOperation;
  hideTryIt?: boolean;
  hideSchemas?: boolean;
  hideInternal?: boolean;
  hideExport?: boolean;
  noHeading?: boolean;
  exportProps?: ExportButtonProps;
  tryItCredentialsPolicy?: 'omit' | 'include' | 'same-origin';
  tryItCorsProxy?: string;
  selectedNodeUri?: string;
  router?: RoutingProps['router'];
  schemaViewMode?: SchemaViewMode;
  proxyServer?: IServer;
  hideExamples?: boolean;
};

export const APIWithOperation: React.FC<PartialLayoutProps> = ({
  operation,
  hideTryIt,
  hideExport,
  noHeading,
  exportProps,
  tryItCredentialsPolicy,
  tryItCorsProxy,
  schemaViewMode,
  proxyServer,
  hideExamples,
}) => {
  const isCompareMode = useOperationDisplayMode() === COMPARE_DISPLAY_MODE;
  const layoutOptions = React.useMemo(
    () => ({
      hideTryIt: isCompareMode || hideTryIt,
      hideExport: isCompareMode || hideExport,
      noHeading: isCompareMode ? false : noHeading,
      compact: true,
      schemaViewMode: schemaViewMode,
    }),
    [isCompareMode, hideTryIt, hideExport, noHeading, schemaViewMode],
  );

  return isCompareMode ? (
    <HttpOperationDiff
      data={operation}
      layoutOptions={layoutOptions}
      exportProps={exportProps}
      tryItCredentialsPolicy={tryItCredentialsPolicy}
      tryItCorsProxy={tryItCorsProxy}
    />
  ) : (
    <HttpOperation
      data={operation}
      layoutOptions={layoutOptions}
      exportProps={exportProps}
      tryItCredentialsPolicy={tryItCredentialsPolicy}
      tryItCorsProxy={tryItCorsProxy}
      proxyServer={proxyServer}
      hideExamples={hideExamples}
    />
  );
};
