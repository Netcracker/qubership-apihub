import { JsoTreeNodeValueBase } from "../tree/node-value"

export type JsoTreeNodeValueWithDiffs = {
  before: JsoTreeNodeValueBase
  after: JsoTreeNodeValueBase
}
