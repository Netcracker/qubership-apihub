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
import { memo, useCallback, useMemo } from 'react'
import { NavLink } from 'react-router-dom'
import { Breadcrumbs, Link } from '@mui/material'

import { useBackwardLocation } from './useBackwardLocation'
import { useVersionWithRevision } from './useVersionWithRevision'
import { getGroupPath, getOverviewPath, getWorkspacePath } from '../NavigationProvider'
import type { Package } from '@netcracker/qubership-apihub-ui-shared/entities/packages'
import { WORKSPACE_KIND } from '@netcracker/qubership-apihub-ui-shared/entities/packages'
import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import { useBackwardLocationContext, useSetBackwardLocationContext } from '@apihub/routes/BackwardLocationProvider'
import { getSplittedVersionKey } from '@netcracker/qubership-apihub-ui-shared/utils/versions'

export type PackageBreadcrumbsProps = Partial<{
  packageObject: Package | null
  versionKey: Key
  showPackagePath: boolean
}>

// TODO: Make FoC
export const PackageBreadcrumbs: FC<PackageBreadcrumbsProps> = memo<PackageBreadcrumbsProps>(({
  packageObject,
  versionKey,
  showPackagePath,
}) => {
  const location = useBackwardLocation()
  const backwardLocation = useBackwardLocationContext()
  const setBackwardLocation = useSetBackwardLocationContext()

  const { fullVersion, latestRevision } = useVersionWithRevision(versionKey, packageObject?.key)
  const { versionKey: splittedVersionKey } = getSplittedVersionKey(fullVersion, latestRevision)

  const packageSettingsLinkHandle = useCallback(() => {
    setBackwardLocation({ ...backwardLocation, fromPackageSettings: location })
  }, [backwardLocation, location, setBackwardLocation])

  const links = useMemo(() => {
    const parentLinks = packageObject?.parents?.map(parent => {
      const isWorkspace = parent.kind === WORKSPACE_KIND
      const linkTo = isWorkspace
        ? getWorkspacePath({ workspaceKey: parent.key })
        : getGroupPath({ groupKey: parent.key })
      return (
        <Link
          key={parent.key}
          component={NavLink}
          to={linkTo}
          onClick={packageSettingsLinkHandle}
        >
          {parent.name}
        </Link>
      )
    }) ?? []

    if (showPackagePath && packageObject && fullVersion) {
      const packageLink = (
        <Link
          key={packageObject.key}
          component={NavLink}
          to={getOverviewPath({ packageKey: packageObject.key, versionKey: fullVersion })}
        >
          {packageObject.name} / {splittedVersionKey}
        </Link>
      )
      parentLinks.push(packageLink)
    }

    return parentLinks
  }, [fullVersion, packageObject, packageSettingsLinkHandle, showPackagePath, splittedVersionKey])

  return (
    <Breadcrumbs data-testid="PackageBreadcrumbs">
      {links}
    </Breadcrumbs>
  )
})
