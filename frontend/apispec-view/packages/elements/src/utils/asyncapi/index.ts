import {
  AsyncApiDocument,
  AsyncOperationTransformerImpl,
  AsyncServiceTransformerImpl,
  transformAsyncApiOperation,
  transformAsyncApiService,
} from '@netcracker/qubership-apihub-http-spec/asyncapi';
import { encodePointerFragment, pointerToPath } from '@stoplight/json';
import { DeepPartial, NodeType } from '@stoplight/types';
import { get, isObject, last } from 'lodash';

import { ISourceNodeMap, NodeTypes, ServiceChildNode, ServiceNode } from '../oas/types';
import { asyncApiSourceMap } from './asyncapi';

export function transformAsyncApiToServiceNode(apiDescriptionDocument: unknown) {
  return computeServiceNode(
    apiDescriptionDocument as AsyncApiDocument,
    asyncApiSourceMap,
    transformAsyncApiService,
    transformAsyncApiOperation,
  );
}

export const isAsyncApi = (parsed: unknown): parsed is AsyncApiDocument => isObject(parsed) && 'asyncapi' in parsed;

function computeServiceNode(
  document: DeepPartial<AsyncApiDocument>,
  map: ISourceNodeMap[],
  transformService: AsyncServiceTransformerImpl,
  transformOperation: AsyncOperationTransformerImpl,
) {
  const serviceDocument = transformService({ document });
  const serviceNode: ServiceNode = {
    type: NodeType.HttpService,
    uri: '/',
    name: serviceDocument.name,
    data: serviceDocument,
    tags: serviceDocument.tags?.map(tag => tag.name) || [],
    children: computeChildNodes(document, document, map, transformOperation),
  };

  return serviceNode;
}

function computeChildNodes(
  document: DeepPartial<AsyncApiDocument>,
  data: unknown,
  map: ISourceNodeMap[],
  transformer: AsyncOperationTransformerImpl,
  parentUri: string = '',
) {
  const nodes: ServiceChildNode[] = [];

  if (!isObject(data)) return nodes;

  for (const key of Object.keys(data)) {
    const sanitizedKey = encodePointerFragment(key);
    const match = findMapMatch(sanitizedKey, map);
    if (match) {
      const uri = `${parentUri}/${sanitizedKey}`;

      const jsonPath = pointerToPath(`#${uri}`);
      if (match.type === NodeTypes.Operation && jsonPath.length === 3) {
        const path = String(jsonPath[1]);
        const method = String(jsonPath[2]);
        const operationDocument = transformer({ document, path, method });

        nodes.push({
          type: 'async_operation',
          uri: uri,
          data: operationDocument,
          name: operationDocument.summary || operationDocument.iid || operationDocument.path,
          tags: operationDocument.tags?.map(tag => tag.name) || [],
        });
      } else if (match.type === NodeTypes.Model) {
        const schemaDocument = get(document, jsonPath);

        nodes.push({
          type: NodeType.Model,
          uri: uri,
          data: schemaDocument,
          name: schemaDocument.title || last(uri.split('/')) || '',
          tags: schemaDocument['x-tags'] || [],
        });
      }

      if (match.children) {
        nodes.push(...computeChildNodes(document, data[key], match.children, transformer, uri));
      }
    }
  }

  return nodes;
}

function findMapMatch(key: string | number, map: ISourceNodeMap[]): ISourceNodeMap | void {
  if (typeof key === 'number') return;
  for (const entry of map) {
    if (!!entry.match?.match(key) || (entry.notMatch !== void 0 && !entry.notMatch.match(key))) {
      return entry;
    }
  }
}
