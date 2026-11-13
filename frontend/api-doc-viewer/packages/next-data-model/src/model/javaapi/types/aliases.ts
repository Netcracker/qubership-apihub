import { ITreeNode } from '../../abstract/tree/tree-node.interface'
import { JavaApiTreeNodeValue } from '../tree/node-value'
import { JavaApiTreeNodeKind } from './node-kind'
import { JavaApiTreeNodeMeta } from './node-meta'

export type JavaApiTreeNode<
  K extends JavaApiTreeNodeKind = JavaApiTreeNodeKind,
> = ITreeNode<JavaApiTreeNodeValue<K> | null, K, JavaApiTreeNodeMeta>
