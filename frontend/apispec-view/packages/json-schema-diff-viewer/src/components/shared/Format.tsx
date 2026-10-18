import { isRegularNode, SchemaNode } from '@stoplight/json-schema-tree';
import { Box } from '@stoplight/mosaic';
import { applyReplacedFromMeta, useDiffContext } from 'diff-block';
import * as React from 'react';
import { useDiffMetaKey } from "@stoplight/elements/containers/DIffMetaKeyContext";

type FormatProps = {
  schemaNode: SchemaNode;
};

export const Format: React.FunctionComponent<FormatProps> = ({ schemaNode }) => {
  const diffMetaKey = useDiffMetaKey()

  const { side } = useDiffContext();

  const diffMeta = schemaNode[diffMetaKey];

  const format = React.useMemo(() => {
    const value = isRegularNode(schemaNode) ? schemaNode.format : null;
    return side === 'before' ? applyReplacedFromMeta(value, diffMeta?.format) : value;
  }, [diffMeta, schemaNode, side]);

  if (!isRegularNode(schemaNode) || format === null) {
    return null;
  }

  return <Box as="span" color="muted">{`<${format}>`}</Box>;
};
