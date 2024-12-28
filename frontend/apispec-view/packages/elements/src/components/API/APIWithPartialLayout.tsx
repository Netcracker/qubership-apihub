import { useSearchPhrase } from '@stoplight/elements/containers/API';
import { ExportButtonProps, ParsedDocs, PartialLayout, RoutingProps } from '@stoplight/elements-core';
import { NodeType } from '@stoplight/types';
import { SchemaViewMode } from 'json-schema-viewer';
import * as React from 'react';
import { useEffect } from 'react';
import { Redirect, useLocation } from 'react-router-dom';

import { ServiceNode } from '../../utils/oas/types';
import { computeAPITree, findFirstNodeSlug, isInternal } from './utils';

type PartialLayoutProps = {
  serviceNode: ServiceNode;
  hideTryIt?: boolean;
  hideSchemas?: boolean;
  hideInternal?: boolean;
  hideExport?: boolean;
  exportProps?: ExportButtonProps;
  tryItCredentialsPolicy?: 'omit' | 'include' | 'same-origin';
  tryItCorsProxy?: string;
  selectedNodeUri?: string;
  router?: RoutingProps['router'];
  schemaViewMode?: SchemaViewMode;
};

export const APIWithPartialLayout: React.FC<PartialLayoutProps> = ({
  serviceNode,
  hideTryIt,
  hideSchemas,
  hideInternal,
  hideExport,
  exportProps,
  tryItCredentialsPolicy,
  tryItCorsProxy,
  selectedNodeUri,
  router,
  schemaViewMode,
}) => {
  const container = React.useRef<HTMLDivElement>(null);
  const searchPhrase = useSearchPhrase();
  const tree = React.useMemo(
    () => computeAPITree(serviceNode, { hideSchemas, hideInternal, searchPhrase }),
    [serviceNode, hideSchemas, hideInternal, searchPhrase],
  );
  const location = useLocation();
  const isRootPath = !selectedNodeUri || selectedNodeUri === '/';
  let node = isRootPath ? serviceNode : serviceNode.children.find(child => child.uri === selectedNodeUri);
  const isHashRouter = router === 'hash';

  const layoutOptions = React.useMemo(
    () => ({
      hideTryIt: hideTryIt,
      hideExport: hideExport || node?.type !== NodeType.HttpService,
      compact: true,
      schemaViewMode: schemaViewMode,
    }),
    [hideTryIt, hideExport, node?.type, schemaViewMode],
  );

  useEffect(() => {
    if (container.current) {
      container.current.scrollIntoView();
    }
  }, [selectedNodeUri]);

  if (!node) {
    // Redirect to the first child if node doesn't exist
    const firstSlug = findFirstNodeSlug(tree);

    if (isHashRouter) {
      node = serviceNode;
    } else if (firstSlug) {
      return <Redirect to={firstSlug} />;
    }
  }

  if (hideInternal && node && isInternal(node)) {
    return <Redirect to="/" />;
  }

  return (
    <PartialLayout ref={container}>
      {node && (
        <ParsedDocs
          key={selectedNodeUri}
          uri={selectedNodeUri}
          node={node}
          nodeTitle={node.name}
          layoutOptions={layoutOptions}
          location={location}
          exportProps={exportProps}
          tryItCredentialsPolicy={tryItCredentialsPolicy}
          tryItCorsProxy={tryItCorsProxy}
        />
      )}
    </PartialLayout>
  );
};
