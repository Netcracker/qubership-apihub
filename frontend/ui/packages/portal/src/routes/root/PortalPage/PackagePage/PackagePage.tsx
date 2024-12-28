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
import { memo, useEffect } from 'react'
import { usePackage } from '../../usePackage'
import { PackagePagePlaceholder } from './PackagePagePlaceholder'
import { PackagePageToolbar } from './PackagePageToolbar'
import { useNavigation } from '../../../NavigationProvider'
import { PACKAGE_KIND } from '@netcracker/qubership-apihub-ui-shared/entities/packages'
import { getSplittedVersionKey } from '@netcracker/qubership-apihub-ui-shared/utils/versions'
import { LoadingIndicator } from '@netcracker/qubership-apihub-ui-shared/components/LoadingIndicator'
import { PageLayout } from '@netcracker/qubership-apihub-ui-shared/components/PageLayout'

export const PackagePage: FC = memo(() => {
  const [packageObject, isPackageLoading] = usePackage({ showParents: true })
  const { kind = PACKAGE_KIND } = packageObject ?? {}

  const defaultVersion = packageObject?.defaultVersion
  const { versionKey } = getSplittedVersionKey(defaultVersion)
  const { navigateToOverview } = useNavigation()

  useEffect(() => {
    packageObject?.key && versionKey && navigateToOverview({ packageKey: packageObject?.key, versionKey: versionKey })
  }, [versionKey, navigateToOverview, packageObject?.key])

  return (
    <>
      {isPackageLoading
        ? <LoadingIndicator/>
        : <PageLayout
          toolbar={<PackagePageToolbar packageObject={packageObject}/>}
          body={<PackagePagePlaceholder kind={kind}/>}
        />}
    </>
  )
})
