import { apiDiff, DiffType } from '@netcracker/qubership-apihub-api-diff';
import {
  isRegularNode,
  RegularNode,
  RootNode,
  SchemaNode,
  SchemaTree as JsonSchemaTree,
  SchemaTreeRefDereferenceFn,
} from '@stoplight/json-schema-tree';
import { Box, Provider as MosaicProvider } from '@stoplight/mosaic';
import { FallbackProps, withErrorBoundary } from '@stoplight/react-error-boundary';
import { ErrorBoundaryProps } from '@stoplight/react-error-boundary/types';
import cn from 'classnames';
import { childrenDiffCountMetaKey, DiffBlock, DiffContainer, schemaIdKey, syntheticTitleFlag, } from 'diff-block';
import { useUpdateAtom } from 'jotai/utils';
import { entries, keys, values } from 'lodash';
import React from 'react';

import { JSVOptions, JSVOptionsContextProvider } from '../contexts';
import { JSONSchema, ViewMode } from '../types';
import { PathCrumbs } from './PathCrumbs';
import { TopLevelSchemaRow } from './SchemaRow';
import { hoveredNodeAtom } from './SchemaRow/state';
import { defaultErrorHandler } from "../../../system";
import { useDiffMetaKey } from "@stoplight/elements/containers/DIffMetaKeyContext";

type JsonSchemaDiffViewerComponentProps = Partial<JSVOptions> & {
  schema: JSONSchema;
  withoutDiff?: boolean;
  emptyText?: string;
  className?: string;
  resolveRef?: SchemaTreeRefDereferenceFn;
  onTreePopulated?: (props: { rootNode: RootNode; nodeCount: number }) => void;
  maxHeight?: number;
  parentCrumbs?: string[];
  schemaId?: string;
};

const jsonSchemaLiftProps = ['properties', 'patternProperties', 'dependencies', 'definitions'];
const jsonSchemaCombinerProps = ['allOf', 'anyOf', 'oneOf'];

const truncateJsonSchema = (schema: JSONSchema, truncationType: 'object' | 'array'): JSONSchema => {
  const newSchema = { ...schema };
  newSchema.type = truncationType;
  if (truncationType === 'object') {
    delete newSchema.items;
  }
  if (truncationType === 'array') {
    delete newSchema.properties;
  }
  return newSchema;
};

const useHandleJsonSchema = (
  schema: JSONSchema,
  resolveRef: SchemaTreeRefDereferenceFn | undefined,
  viewMode: ViewMode,
  schemaId?: string,
) => {
  const diffMetaKey = useDiffMetaKey()
  
  return React.useMemo(() => {
    const jsonSchemaTreeOptions = {
      mergeAllOf: true,
      refResolver: resolveRef,
    };

    const jsonSchemaTree = new JsonSchemaTree(schema, jsonSchemaTreeOptions);

    let nodeCount = 0;
    const shouldNodeBeIncluded = (node: SchemaNode) => {
      if (!isRegularNode(node)) {
        return true;
      }

      const { validations } = node;

      if (!!validations.writeOnly === !!validations.readOnly) {
        return true;
      }

      return !((viewMode === 'read' && !!validations.writeOnly) || (viewMode === 'write' && !!validations.readOnly));
    };

    jsonSchemaTree.walker.on('exitNode', node => {
      node[diffMetaKey] = node.fragment[diffMetaKey];
      node[schemaIdKey] = schemaId;
      // lift specific diffs
      jsonSchemaLiftProps
        .filter(prop => node.fragment[prop]?.[diffMetaKey])
        .forEach(prop => {
          node[diffMetaKey] ??= {};
          node[diffMetaKey][prop] = node.fragment[prop][diffMetaKey];
        });
      // lift combiner diffs
      if (isRegularNode(node)) {
        jsonSchemaCombinerProps
          .filter(combiner => node.originalFragment[diffMetaKey]?.[combiner])
          .forEach(combiner => {
            node[diffMetaKey] ??= {};
            node[diffMetaKey][combiner] = node.originalFragment[diffMetaKey]?.[combiner];
          });
      }

      calculateChildrenDiffs(node, diffMetaKey);
    });

    jsonSchemaTree.walker.hookInto('filter', node => {
      if (shouldNodeBeIncluded(node)) {
        nodeCount++;
        return true;
      }
      return false;
    });
    jsonSchemaTree.populate();

    return {
      root: jsonSchemaTree.root,
      nodeCount,
    };
  }, [resolveRef, schema, viewMode, diffMetaKey, schemaId]);
};

const JsonSchemaDiffViewerComponent: React.FC<JsonSchemaDiffViewerComponentProps> = ({
  schema,
  schemaId,
  withoutDiff,
  resolveRef,
  viewMode = 'standalone',
  defaultExpandedDepth = 1,
  onGoToRef,
  renderRowAddon,
  hideExamples,
  renderRootTreeLines,
  disableCrumbs = true,
  onTreePopulated,
  ...otherProps
}) => {
  const { root, nodeCount } = useHandleJsonSchema(schema, resolveRef, viewMode, schemaId);

  React.useEffect(() => {
    onTreePopulated?.({
      rootNode: root,
      nodeCount,
    });
  }, [nodeCount, onTreePopulated, root]);

  const options = React.useMemo(
    () => ({
      defaultExpandedDepth,
      viewMode,
      onGoToRef,
      renderRowAddon,
      hideExamples,
      renderRootTreeLines,
      disableCrumbs,
    }),
    [defaultExpandedDepth, viewMode, onGoToRef, renderRowAddon, hideExamples, renderRootTreeLines, disableCrumbs],
  );

  return (
    <MosaicProvider>
      <JSVOptionsContextProvider value={options}>
        <DiffContainer>
          <JsonSchemaDiffViewerInner rootNode={root} {...otherProps} />
        </DiffContainer>
      </JSVOptionsContextProvider>
    </MosaicProvider>
  );
};

const JsonSchemaDiffViewerInner = ({
  rootNode,
  className,
  emptyText = 'No schema defined',
  maxHeight,
  parentCrumbs,
}: { rootNode: RootNode } & Omit<JsonSchemaDiffViewerComponentProps, 'schema'>) => {
  const setHoveredNode = useUpdateAtom(hoveredNodeAtom);
  const onMouseLeave = React.useCallback(() => {
    setHoveredNode(null);
  }, [setHoveredNode]);

  const isEmpty = React.useMemo(
    () => rootNode.children.every(node => !isRegularNode(node) || node.unknown),
    [rootNode],
  );

  const style = {
    flex: '0 1 50%',
  };

  if (isEmpty) {
    return (
      <Box className={cn(className, 'JsonSchemaViewer')} style={style} fontSize="sm">
        {emptyText}
      </Box>
    );
  }

  return (
    <Box
      className={cn('JsonSchemaViewer', className)}
      pos={maxHeight ? 'relative' : undefined}
      overflowY={maxHeight ? 'auto' : undefined}
      onMouseLeave={onMouseLeave}
      style={{ maxHeight, ...style }}
    >
      <PathCrumbs parentCrumbs={parentCrumbs} />
      <TopLevelSchemaRow schemaNode={rootNode.children[0]} />
    </Box>
  );
};

const JsonSchemaDiffFallbackComponent = ({ error }: FallbackProps) => {
  return (
    <Box p={4}>
      <Box as="b" color="danger">
        Error
      </Box>
      {error !== null ? `: ${error.message}` : null}
    </Box>
  );
};

export type JsonSchemaDiffViewerProps = Omit<JsonSchemaDiffViewerComponentProps, 'schema'> & {
  schema?: JSONSchema;
  beforeSchema?: JSONSchema;
  afterSchema?: JSONSchema;
};

export const JsonSchemaDiffViewer: React.FC<JsonSchemaDiffViewerProps & ErrorBoundaryProps> =
  withErrorBoundary<JsonSchemaDiffViewerProps>(
    (props) => {
      const diffMetaKey = useDiffMetaKey()
      
      const { 
        beforeSchema, 
        afterSchema, 
        schema, 
        ...otherProps
      } = props
      const mergedSchema = React.useMemo(() => {
        if (schema) {
          return schema;
        }
        if (beforeSchema && afterSchema) {
          return apiDiff(beforeSchema, afterSchema, {
            syntheticTitleFlag: syntheticTitleFlag,
            metaKey: diffMetaKey,
            validate: true,
            liftCombiners: true,
            unify: true,
          }).merged;
        }
        return null;
      }, [afterSchema, beforeSchema, diffMetaKey, schema]);

      if (!mergedSchema) {
        return null;
      }

      if (!isObject(mergedSchema)) {
        return null;
      }

      const isIncompatibleJsonEntities = !!(mergedSchema.items && mergedSchema.properties);

      if (isIncompatibleJsonEntities) {
        const objectSchema = truncateJsonSchema(mergedSchema, 'object');
        const arraySchema = truncateJsonSchema(mergedSchema, 'array');
        const { type } = mergedSchema;
        const isObjectAdded = type === 'object';
        const schemas = {
          left: isObjectAdded ? arraySchema : objectSchema,
          right: isObjectAdded ? objectSchema : arraySchema,
        };

        // TODO 30.07.24 // Remove deprecated unused JsonSchemaDiffViewer in ASV
        return (
          <>
            <DiffBlock
              id='WholeJson_1'
              type='breaking'
              action='remove'
              cause={undefined}
            >
              <JsonSchemaDiffViewerComponent schema={schemas.left} {...otherProps} />
            </DiffBlock>
            <DiffBlock
              id='WholeJson_2'
              type='breaking'
              action='add'
              cause={undefined}
            >
              <JsonSchemaDiffViewerComponent schema={schemas.right} {...otherProps} />
            </DiffBlock>
          </>
        );
      }

      return <JsonSchemaDiffViewerComponent schema={mergedSchema} {...otherProps} />;
    },
    {
      FallbackComponent: JsonSchemaDiffFallbackComponent,
      recoverableProps: ['beforeSchema', 'afterSchema', 'schema'],
      onError: defaultErrorHandler,
    },
  );

// TODO: Possible performance issues, think of optimization
function calculateChildrenDiffs(
  node: RootNode | RegularNode | SchemaNode,
  diffMetaKey: symbol
): void {
  const diff = node[diffMetaKey];
  let diffCount = node[childrenDiffCountMetaKey] ?? {};
  let parentDiff = node.parent?.[childrenDiffCountMetaKey] ?? {};

  if (diff) {
    entries(diff).forEach(([key, value]: [string, any]) => {
      if (value.type) {
        incrementDiff(diffCount, value);
      } else if (key === 'required') {
        values(value).forEach(value => {
          incrementDiff(diffCount, value);
        });
      } else {
        values(value).forEach(value => {
          incrementDiff(diffCount, value);
        });
      }
    });
  }

  node[childrenDiffCountMetaKey] = diffCount;

  if (node.parent) {
    keys(diffCount).forEach(typeKey => {
      parentDiff[typeKey] = (parentDiff[typeKey] || 0) + diffCount[typeKey];
    });
    node.parent[childrenDiffCountMetaKey] = parentDiff;
  }
}

function incrementDiff(diffCount: Record<DiffType, number>, value: any) {
  const count = diffCount[value.type];
  diffCount[value.type] = count ? count + 1 : 1;
}

function isObject(value: unknown): value is Record<PropertyKey, unknown> {
  return typeof value === 'object';
}
