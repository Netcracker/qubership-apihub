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

import { useParams } from 'react-router-dom'
import { usePackageRef } from '../useRefPackage'
import { useMemo } from 'react'
import type { IsLoading } from '@netcracker/qubership-apihub-ui-shared/utils/aliases'
import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import { REF_SEARCH_PARAM } from '@netcracker/qubership-apihub-ui-shared/utils/search-params'
import { useSearchParam } from '@netcracker/qubership-apihub-ui-shared/hooks/searchparams/useSearchParam'

export function usePackageParamsWithRef(refKey?: string): [Key | undefined, Key | undefined, IsLoading] {
  const { packageId, versionId } = useParams()
  const ref = useSearchParam(REF_SEARCH_PARAM)
  const [packageRef, isLoading] = usePackageRef(packageId!, versionId!, ref ?? refKey)

  const [packageKey, versionKey] = useMemo(() =>
      ((ref || refKey) ? [packageRef?.key, packageRef?.version] : [packageId, versionId]),
    [ref, refKey, packageRef?.key, packageRef?.version, packageId, versionId],
  )

  return [packageKey, versionKey, isLoading]
}
