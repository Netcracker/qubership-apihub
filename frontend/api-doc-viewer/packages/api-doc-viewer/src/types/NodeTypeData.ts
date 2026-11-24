import {
  GraphApiDiffTreeNode,
  GraphApiNodeData,
  GraphApiTreeNode,
  GraphSchemaDiffNodeValue,
} from '@netcracker/qubership-apihub-api-data-model'
import { GraphPropNodePropsWithState } from './internal/PropsWithState'
import { CustomizationOptions } from '@apihub/contexts/CustomizationOptionsContext'

export type NodeTypeData = Partial<{
  brokenRef: string
  type: string
  nullable: boolean
  title: string
  qualifier: string
  combiner: string
}>

export type NodeTypeDataOptions<S, N, V> = Partial<S> & {
  node: N | null
  nodeValue?: V | null
  customizationOptions?: CustomizationOptions
}

export type GraphNodeTypeDataOptions = NodeTypeDataOptions<
  GraphPropNodePropsWithState,
  GraphApiDiffTreeNode | GraphApiTreeNode,
  GraphSchemaDiffNodeValue | GraphApiNodeData
>
