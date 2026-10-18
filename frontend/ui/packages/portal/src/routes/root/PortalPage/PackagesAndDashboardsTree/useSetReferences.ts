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

import type { Dispatch, SetStateAction } from 'react'
import { useEffect } from 'react'
import { useFilteredPackageRefs } from '../../useRefPackage'
import type { PackageReferenceWithStatus } from '../DashboardPage/configure-dashboard'
import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import { isNotEmpty } from '@netcracker/qubership-apihub-ui-shared/utils/arrays'

export function useSetReferences(
  packageKey: Key | undefined,
  versionKey: Key | undefined,
  setReferences: Dispatch<SetStateAction<PackageReferenceWithStatus[]>>,
  onLoading: (value: boolean) => void,
): void {

  const { data: packageReferences, isInitialLoading } = useFilteredPackageRefs({
    packageKey: packageKey!,
    version: versionKey!,
    enabled: !!versionKey,
  })

  useEffect(() => onLoading(isInitialLoading), [isInitialLoading, onLoading])

  useEffect(() => {
    isNotEmpty(packageReferences) && setReferences(packageReferences.map(packageReference => {
      return {
        packageReference: packageReference,
        added: false,
      }
    }))
  }, [setReferences, packageReferences])
}
