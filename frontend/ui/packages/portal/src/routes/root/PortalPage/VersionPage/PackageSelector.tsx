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

import type { FC } from 'react'
import { memo, useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useVersionSearchParam } from '../../useVersionSearchParam'
import { usePackageSearchParam } from '../../usePackageSearchParam'
import { useRefSearchParam } from '../useRefSearchParam'
import { useFilteredPackageRefs } from '../../useRefPackage'
import type { PackageReference } from '@netcracker/qubership-apihub-ui-shared/entities/version-references'
import { PACKAGE_KIND } from '@netcracker/qubership-apihub-ui-shared/entities/packages'
import { isNotEmpty } from '@netcracker/qubership-apihub-ui-shared/utils/arrays'
import { DropdownPackageReferenceSelector } from '@netcracker/qubership-apihub-ui-shared/components/DropdownPackageReferenceSelector'

export const PackageSelector: FC = memo(() => {
  const [searchValue, setSearchValue] = useState('')
  const [selectedReference, setSelectedReference] = useState<PackageReference | null>(null)

  const { packageId: rootPackageKey, versionId: rootPackageVersion } = useParams()
  const [originPackageKey] = usePackageSearchParam()
  const [originVersionKey] = useVersionSearchParam()
  const [defaultPackageKey, setRefSearchParam] = useRefSearchParam()

  const { data: changedReferences, isLoading: changedReferencesLoading } = useFilteredPackageRefs({
    packageKey: rootPackageKey!,
    version: rootPackageVersion!,
    kind: PACKAGE_KIND,
    textFilter: searchValue,
    showAllDescendants: true,
  })
  const { data: originReferences, isLoading: originReferencesLoading } = useFilteredPackageRefs({
    packageKey: originPackageKey ?? rootPackageKey!,
    version: originVersionKey!,
    kind: PACKAGE_KIND,
    textFilter: searchValue,
    showAllDescendants: true,
  })

  const references: PackageReference[] = useMemo(() => {
    const result: PackageReference[] = []
    const keySet = new Set<string>()
    const addReferenceIfAbsent = (ref: PackageReference): void => {
      const { key } = ref
      if (key && !keySet.has(key)) {
        keySet.add(key)
        result.push(ref)
      }
    }

    changedReferences.forEach(addReferenceIfAbsent)
    originReferences.forEach(addReferenceIfAbsent)

    return result
  }, [changedReferences, originReferences])
  const referencesLoading = useMemo(
    () => changedReferencesLoading || originReferencesLoading,
    [changedReferencesLoading, originReferencesLoading],
  )

  useEffect(() => {
    if (isNotEmpty(references) && !referencesLoading) {
      const newSelectedReference = references.find(ref => ref.key === defaultPackageKey) ?? references[0]
      setSelectedReference(newSelectedReference)
    }
  }, [defaultPackageKey, references, referencesLoading])

  return (
    <DropdownPackageReferenceSelector
      selectedPackage={selectedReference}
      references={references}
      loading={referencesLoading}
      defaultPackageKey={defaultPackageKey}
      searchValue={searchValue}
      onSearch={setSearchValue}
      onSearchParam={setRefSearchParam}
    />
  )
})
