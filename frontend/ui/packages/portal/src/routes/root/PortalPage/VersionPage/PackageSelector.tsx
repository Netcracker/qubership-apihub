import type { FC } from 'react'
import { memo, useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useVersionSearchParam } from '../../useVersionSearchParam'
import { usePackageSearchParam } from '@netcracker/qubership-apihub-ui-shared/hooks/routes/package/usePackageSearchParam'
import { useRefSearchParam } from '../useRefSearchParam'
import { useFilteredPackageRefs } from '../../useRefPackage'
import type { PackageReference } from '@netcracker/qubership-apihub-ui-shared/entities/version-references'
import { PACKAGE_KIND } from '@netcracker/qubership-apihub-ui-shared/entities/packages'
import { isNotEmpty } from '@netcracker/qubership-apihub-ui-shared/utils/arrays'
import { DropdownPackageReferenceSelector } from '@netcracker/qubership-apihub-ui-shared/components/DropdownPackageReferenceSelector'
import { useVersionProblemProcessorContext } from '@netcracker/qubership-apihub-ui-shared/hooks/versions/useVersionProblemProcessorContext'
import { getComparisonProblemReferences } from './comparisonProblemReferences'

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
    showAllDescendants: true,
  })
  const { data: originReferences, isLoading: originReferencesLoading } = useFilteredPackageRefs({
    packageKey: originPackageKey ?? rootPackageKey!,
    version: originVersionKey!,
    kind: PACKAGE_KIND,
    showAllDescendants: true,
  })
  const { appApiProcessorVersion, migrationInProgress } = useVersionProblemProcessorContext()

  const allReferences: PackageReference[] = useMemo(() => {
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
  const references = useMemo(
    () => (searchValue
      ? allReferences.filter(({ name }) => name?.toLowerCase().includes(searchValue.toLowerCase()))
      : allReferences),
    [allReferences, searchValue],
  )
  const referencesLoading = useMemo(
    () => changedReferencesLoading || originReferencesLoading,
    [changedReferencesLoading, originReferencesLoading],
  )

  const problemReferences = useMemo(
    () =>
      getComparisonProblemReferences(changedReferences, originReferences, {
        appApiProcessorVersion,
        migrationInProgress,
      }),
    [changedReferences, originReferences, appApiProcessorVersion, migrationInProgress],
  )

  useEffect(() => {
    if (isNotEmpty(allReferences) && !referencesLoading) {
      const newSelectedReference = allReferences.find(ref => ref.key === defaultPackageKey) ?? allReferences[0]
      setSelectedReference(newSelectedReference)
    }
  }, [defaultPackageKey, allReferences, referencesLoading])

  return (
    <DropdownPackageReferenceSelector
      selectedPackage={selectedReference}
      references={references}
      problemReferences={problemReferences}
      loading={referencesLoading}
      defaultPackageKey={defaultPackageKey}
      searchValue={searchValue}
      onSearch={setSearchValue}
      onSearchParam={setRefSearchParam}
    />
  )
})
