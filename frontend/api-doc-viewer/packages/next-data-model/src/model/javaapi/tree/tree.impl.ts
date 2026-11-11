import { Tree } from '../../abstract/tree/tree.impl'
import { JavaApiTreeNodeKind } from '../types/node-kind'
import { JavaApiTreeNodeMeta } from '../types/node-meta'
import { JavaApiTreeNodeValue } from './node-value'

export class JavaApiTree extends Tree<
  JavaApiTreeNodeValue | null,
  JavaApiTreeNodeKind,
  JavaApiTreeNodeMeta
> {
  constructor() {
    super()
  }
}
