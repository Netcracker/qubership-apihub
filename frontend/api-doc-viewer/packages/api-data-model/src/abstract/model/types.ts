import { JsonPath } from '@netcracker/qubership-apihub-json-crawl';
import { modelTreeNodeType } from "../constants";


export interface CreateNodeResult<T extends IModelTreeNode<any, any, any>> {
  value: any | null;
  node: T;
}

export type ModelTreeNodeType = keyof typeof modelTreeNodeType;

export interface IModelTree<T, K extends string, M> {
  root: IModelTreeNode<T, K, M> | null;
  nodes: Map<string, IModelTreeNode<T, K, M>>;
}

export interface IModelTreeNode<T, K extends string, M> {
  id: string;
  key: string | number;
  kind: K;
  type: ModelTreeNodeType;
  /**
   * @deprecated count using newDataLevel in UI
   */
  depth: number;
  newDataLevel: boolean;
  path: JsonPath;
  parent: IModelTreeNode<T, K, M> | null;
  container: IModelTreeNode<T, K, M> | null;
  nested: IModelTreeNode<T, K, M>[];
  meta: M;
  isCycle: boolean;

  createCycledClone(id: string, key: string | number, parent: IModelTreeNode<T, K, M> | null): IModelTreeNode<T, K, M>;

  value(nestedId?: string): T | null;

  children(nestedId?: string): IModelTreeNode<T, K, M>[];

  nestedNode(nestedId?: string, deep?: boolean): IModelTreeNode<T, K, M> | null;

  addChild(node: IModelTreeNode<T, K, M>): void;

  addNestedNode(node: IModelTreeNode<T, K, M>): void;
}

export type ModelTreeNodeParams<T, K extends string, M> = {
  type?: ModelTreeNodeType;
  value?: T;
  meta?: M;
  parent?: IModelTreeNode<T, K, M> | null;
  container?: IModelTreeNode<T, K, M> | null;
  newDataLevel?: boolean;
};
