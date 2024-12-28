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

import { DirtyState } from 'main/graph/common/dirty-state'
import { ModificationAppliers } from 'main/graph/common/graph-definition'

export type UpdateDirtyState = (value: DirtyState) => void
export type DirtyStateModificationAppliersFactory<View> = (update: UpdateDirtyState) => ModificationAppliers<unknown, unknown, View>
