import { DirtyState } from 'main/graph/common/dirty-state'
import { ModificationAppliers } from 'main/graph/common/graph-definition'

export type UpdateDirtyState = (value: DirtyState) => void
export type DirtyStateModificationAppliersFactory<View> = (update: UpdateDirtyState) => ModificationAppliers<unknown, unknown, View>
