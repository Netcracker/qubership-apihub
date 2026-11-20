import { DirtyStateModificationAppliersFactory } from 'main/graph/appliers-common'
import { IncludePropertiesGroupRelationView } from 'main/graph/view-definition'
import { DIRTY_STATE_LAYOUT, DIRTY_STATE_VISUAL } from 'main/graph/common/dirty-state'
import {
  equalsIncludePropertiesGroupRelationByLayout,
  equalsIncludePropertiesGroupRelationByVisual,
} from 'main/domain/like/include-properties-group-relation'

export const includePropertiesEdgeDirtyStatusApplierFactory: DirtyStateModificationAppliersFactory<IncludePropertiesGroupRelationView> = (update) => {
  return {
    createApplier: () => update(DIRTY_STATE_LAYOUT),
    updateApplier: (_, _2, newUserObject, oldUserObject) => {
      if (!equalsIncludePropertiesGroupRelationByLayout(newUserObject.like, oldUserObject.like)) {
        update(DIRTY_STATE_LAYOUT)
      }
      if (!equalsIncludePropertiesGroupRelationByVisual(newUserObject.like, oldUserObject.like)) {
        update(DIRTY_STATE_VISUAL)
      }
    },
    removeApplier: () => update(DIRTY_STATE_LAYOUT),
  }
}