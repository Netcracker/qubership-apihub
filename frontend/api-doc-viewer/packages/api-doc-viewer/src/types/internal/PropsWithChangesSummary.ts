import { NodeChangesSummary } from '@netcracker/qubership-apihub-api-data-model'
import { NodeId } from '../aliases/nodes'

export type PropsWithNestedChangesSummary = {
  $nestedChangesSummary?: Record<NodeId, NodeChangesSummary>
}