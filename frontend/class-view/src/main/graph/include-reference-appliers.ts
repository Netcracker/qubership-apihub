/**
 * Copyright 2024-2025 NetCracker Technology Corporation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

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