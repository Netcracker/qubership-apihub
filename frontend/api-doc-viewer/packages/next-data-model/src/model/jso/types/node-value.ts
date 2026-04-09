import { JsoPropertyValueType } from "./node-value-type"

export type JsoTreeNodeValue = JsoTreeNodeValueBase

export type JsoTreeNodeValueBase = {
  readonly title: string
  readonly value: unknown
  readonly valueType: JsoPropertyValueType
  readonly isPrimitive: boolean
  readonly isArrayItem: boolean
  readonly isPredefinedValueSet: boolean
}
