import { isRegularNode, SchemaNode } from '@stoplight/json-schema-tree';
import { MarkdownViewer } from '@stoplight/markdown-viewer';
import { Box, Link, Text } from '@stoplight/mosaic';
import { DiffBlock, useDiffContext } from 'diff-block';
import { isNil } from 'lodash';
import * as React from 'react';
import { useDiffMetaKey } from "@stoplight/elements/containers/DIffMetaKeyContext";
import { Diff, isDiffReplace } from "@netcracker/qubership-apihub-api-diff";

export const Description: React.FunctionComponent<{ schemaNode: SchemaNode }> = ({ schemaNode }) => {
  const diffMetaKey = useDiffMetaKey()

  const { side } = useDiffContext();
  const descriptionDiff = getDiffMetaDescription(schemaNode, diffMetaKey);
  const descriptionDiffCause = ''

  const description = getDescription(schemaNode);

  const viewDescription = React.useMemo(() => {
    let value = isDescription(description) ? description : null;
    if (side && descriptionDiff && isDiffReplace(descriptionDiff) && descriptionDiff.beforeValue) {
      switch (side) {
        case 'before':
          return isDescription(descriptionDiff.beforeValue) ? descriptionDiff.beforeValue : null;
        case 'after':
          return value;
      }
    }
    return value;
  }, [description, descriptionDiff, side]);

  if (isNil(description) && isNil(viewDescription)) return null;

  return (
    <DiffBlock
      id={schemaNode.path.join('/') + 'Θdescription'}
      type={descriptionDiff?.type}
      action={descriptionDiff?.action}
      cause={descriptionDiffCause}
    >
      <DescriptionInner
        value={viewDescription ?? ''}
        crossed={side === 'before' && descriptionDiff?.action === 'replace'}
      />
    </DiffBlock>
  );
};

const DescriptionInner: React.FunctionComponent<{ value: string; crossed: boolean }> = ({ value, crossed }) => {
  const [showAll, setShowAll] = React.useState(false);

  const paragraphs = value.split('\n\n');
  const style = {
    fontSize: 12,
    ...(crossed ? { textDecoration: 'line-through' } : {}),
  };

  if (paragraphs.length <= 1 || showAll) {
    return <Box as={MarkdownViewer} markdown={value} style={style} />;
  }

  const firstParagraph = paragraphs[0];

  return (
    <Box
      as={MarkdownViewer}
      markdown={firstParagraph}
      parseOptions={{
        components: {
          p: (props: any) => {
            return (
              <Box as="p">
                <Text mr={1}>{props.children}</Text>
                <Link cursor="pointer" onClick={() => setShowAll(true)}>
                  Show all...
                </Link>
              </Box>
            );
          },
        },
      }}
      style={style}
    />
  );
};

const getDiffMetaDescription = (
  node: SchemaNode,
  diffMetaKey: symbol
): Diff | undefined => {
  return node[diffMetaKey]?.description;
};

const getDescription = (node: SchemaNode): unknown => {
  return isRegularNode(node) ? node.annotations.description : null;
};

const isDescription = (description: unknown): description is string => {
  return typeof description === 'string' && description.length > 0;
};
