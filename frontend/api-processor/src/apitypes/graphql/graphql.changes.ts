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

import { VersionGraphQLOperation } from './graphql.types'
import { removeComponents, takeIf } from '../../utils'
import { apiDiff, COMPARE_MODE_OPERATION, Diff } from '@netcracker/qubership-apihub-api-diff'
import { NORMALIZE_OPTIONS } from '../../consts'
import { GraphApiSchema } from '@netcracker/qubership-apihub-graphapi'

export const graphqlOperationsCompare = async (current: VersionGraphQLOperation | undefined, previous: VersionGraphQLOperation | undefined): Promise<Diff[]> => {
  let previousOperation = removeComponents(previous?.data)
  let currentOperation = removeComponents(current?.data)
  if (!previousOperation && currentOperation) {
    previousOperation = getCopyWithEmptyOperations(currentOperation as GraphApiSchema)
  }

  if (previousOperation && !currentOperation) {
    currentOperation = getCopyWithEmptyOperations(previousOperation as GraphApiSchema)
  }

  //todo think about normalize options
  const { diffs } = apiDiff(
    previousOperation,
    currentOperation,
    {
      ...NORMALIZE_OPTIONS,
      mode: COMPARE_MODE_OPERATION,
      normalizedResult: true,
      beforeSource: previous?.data,
      afterSource: current?.data,
    },
  )
  return diffs
}

function getCopyWithEmptyOperations(template: GraphApiSchema): GraphApiSchema {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { queries, mutations, subscriptions, ...rest } = template
  return {
    ...takeIf({ queries: {} }, !!queries),
    ...takeIf({ mutations: {} }, !!mutations),
    ...takeIf({ subscriptions: {} }, !!subscriptions),
    ...rest,
  }
}
