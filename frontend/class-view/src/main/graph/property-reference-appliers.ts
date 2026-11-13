import { DirtyStateModificationAppliersFactory } from 'main/graph/appliers-common'
import { PropertyToClassRelationView } from 'main/graph/view-definition'
import { DIRTY_STATE_LAYOUT, DIRTY_STATE_VISUAL } from 'main/graph/common/dirty-state'
import {
  equalsPropertyToClassRelationByLayout,
  equalsPropertyToClassRelationByVisual,
} from 'main/domain/like/property-to-class-reference-relation'

export const propertyReferenceEdgeDirtyStatusApplierFactory: DirtyStateModificationAppliersFactory<PropertyToClassRelationView> = (update) => {
  return {
    createApplier: () => update(DIRTY_STATE_LAYOUT),
    updateApplier: (_, _2, newUserObject, oldUserObject) => {
      if (!equalsPropertyToClassRelationByLayout(newUserObject.like, oldUserObject.like)) {
        update(DIRTY_STATE_LAYOUT)
      }
      if (!equalsPropertyToClassRelationByVisual(newUserObject.like, oldUserObject.like)) {
        update(DIRTY_STATE_VISUAL)
      }
    },
    removeApplier: () => update(DIRTY_STATE_LAYOUT),
  }
}