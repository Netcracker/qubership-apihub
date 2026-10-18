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

import { ActionType, DiffAction } from '@netcracker/qubership-apihub-api-diff'
import { ANY_PATH_SEGMENT } from './path'
import { PathPredicate, PREDICATE_ANY_VALUE } from '@netcracker/qubership-apihub-api-unifier'

export type DiffRule = {
  pathTemplate: PathPredicate[]
  allowedActions: ActionType[]
}

export const EXTERNAL_DOCS_DIFF_RULES: DiffRule[] = [
  {
    pathTemplate: [['externalDocs']],
    allowedActions: [DiffAction.add, DiffAction.remove],
  },
  {
    pathTemplate: [['externalDocs', ANY_PATH_SEGMENT]],
    allowedActions: [DiffAction.add, DiffAction.remove, DiffAction.replace],
  },
]

export const DIFF_RULES: DiffRule[] = [
  // had to ignore info because can't exclude from spec due to usage in "Unable to merge" message
  {
    pathTemplate: [['info']],
    allowedActions: [DiffAction.add, DiffAction.remove, DiffAction.replace],
  },
  {
    pathTemplate: [['info', PREDICATE_ANY_VALUE]],
    allowedActions: [DiffAction.add, DiffAction.remove, DiffAction.replace],
  },
  {
    pathTemplate: [['info', PREDICATE_ANY_VALUE, PREDICATE_ANY_VALUE]],
    allowedActions: [DiffAction.add, DiffAction.remove, DiffAction.replace],
  },
  {
    pathTemplate: [['servers']],
    allowedActions: [DiffAction.add, DiffAction.remove],
  },
  {
    pathTemplate: [['servers', PREDICATE_ANY_VALUE]],
    allowedActions: [DiffAction.add, DiffAction.remove],
  },
  {
    pathTemplate: [['security']],
    allowedActions: [DiffAction.add, DiffAction.remove],
  },
  {
    pathTemplate: [['security', PREDICATE_ANY_VALUE]],
    allowedActions: [DiffAction.add, DiffAction.remove],
  },
  {
    pathTemplate: [['components']],
    allowedActions: [DiffAction.add, DiffAction.remove],
  },
  {
    pathTemplate: [['components', PREDICATE_ANY_VALUE]],
    allowedActions: [DiffAction.add, DiffAction.remove],
  },
  {
    pathTemplate: [['components', PREDICATE_ANY_VALUE, PREDICATE_ANY_VALUE]],
    allowedActions: [DiffAction.add, DiffAction.remove],
  },
  {
    pathTemplate: [['paths']],
    allowedActions: [DiffAction.add, DiffAction.remove],
  },
  {
    pathTemplate: [['paths', PREDICATE_ANY_VALUE]],
    allowedActions: [DiffAction.add, DiffAction.remove],
  },
  ...EXTERNAL_DOCS_DIFF_RULES,
]
