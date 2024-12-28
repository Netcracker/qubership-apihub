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
import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import { Box, IconButton, TableCell, TableRow, Tooltip, Typography } from '@mui/material'
import KeyboardArrowDownOutlinedIcon from '@mui/icons-material/KeyboardArrowDownOutlined'
import KeyboardArrowRightOutlinedIcon from '@mui/icons-material/KeyboardArrowRightOutlined'
import {
  useDashboardCollapsedReferenceKeys,
  useSetDashboardCollapsedReferenceKeys,
} from './CollapsedReferenceKeysContext'
import { useDeletedReferences } from '../useDeletedReferences'
import { useVersionReferences } from '../../useVersionReferences'
import { useParams } from 'react-router-dom'
import { useAddConflictedReferences, useConflictedReferences } from '../useConflictedReferences'
import { useDashboardPackages } from '../useDashboardPackages'
import {
  useRecursiveDashboardName,
  useSetRecursiveDashboardName,
} from '../DashboardPage/RecursiveDashboardNameContextProvider'

import { getSplittedVersionKey } from '@netcracker/qubership-apihub-ui-shared/utils/versions'
import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import { TextWithOverflowTooltip } from '@netcracker/qubership-apihub-ui-shared/components/TextWithOverflowTooltip'
import { DASHBOARD_KIND, PACKAGE_KIND } from '@netcracker/qubership-apihub-ui-shared/entities/packages'
import { isNotEmpty } from '@netcracker/qubership-apihub-ui-shared/utils/arrays'
import { PackageKindLogo } from '@netcracker/qubership-apihub-ui-shared/components/PackageKindLogo'
import { RedWarningCircleIcon, YellowWarningCircleIcon } from '@netcracker/qubership-apihub-ui-shared/icons/WarningCircleIcon'
import { RedWarningIcon, YellowWarningIcon } from '@netcracker/qubership-apihub-ui-shared/icons/WarningIcon'
import { CustomChip } from '@netcracker/qubership-apihub-ui-shared/components/CustomChip'
import { DeleteIcon } from '@netcracker/qubership-apihub-ui-shared/icons/DeleteIcon'
import type {
  PackageReference,
  ReferenceKind,
  UnresolvedReference,
  VersionReferences,
} from '@netcracker/qubership-apihub-ui-shared/entities/version-references'
import { ConfirmationDialog } from '@netcracker/qubership-apihub-ui-shared/components/ConfirmationDialog'

export type ReferenceRowProps = {
  reference: UnresolvedReference
  pack: PackageReference
  versionReferences: VersionReferences
  level: number
  onRemove?: (key: string, version: string, kind: ReferenceKind, deleted: boolean) => void
  added: boolean
  readonly: boolean
}

export const ReferenceRow: FC<ReferenceRowProps> = memo<ReferenceRowProps>((
  {
    reference: { packageRef, excluded },
    pack: {
      key,
      version,
      name,
      kind,
      status,
      deletedAt,
      latestRevision,
    },
    versionReferences,
    level,
    onRemove,
    added,
    readonly,
  },
) => {
  const { packageId, versionId } = useParams()
  const { data: deletedReferences } = useDeletedReferences(packageId!, versionId!)
  const { data: conflictedReferences } = useConflictedReferences(packageId!, versionId!)
  const [addConflictedReferences] = useAddConflictedReferences()
  const { data: dashboardPackages } = useDashboardPackages(packageId!, versionId!)

  const recursiveDashboardName = useRecursiveDashboardName()
  const setRecursiveDashboardName = useSetRecursiveDashboardName()

  const { versionKey } = getSplittedVersionKey(version, latestRevision)

  const collapsedKeys = useDashboardCollapsedReferenceKeys()
  const setCollapsedKeys = useSetDashboardCollapsedReferenceKeys()

  const [deleteConfirmationOpen, setDeleteConfirmationOpen] = useState(false)

  const [open, setOpen] = useState(collapsedKeys?.includes(key!))

  const { data: addedVersionReferences } = useVersionReferences({
    packageKey: key!,
    version: version!,
    enabled: added,
  })

  useEffect(() => {
    addConflictedReferences({ versionReferences: addedVersionReferences, parentKey: key })
  }, [addConflictedReferences, addedVersionReferences, dashboardPackages, key])

  const descendants = useMemo(() => {
    return added
      ? addedVersionReferences.references?.filter(({ parentPackageRef }) => !parentPackageRef)
      : versionReferences.references?.filter(({ parentPackageRef }) => parentPackageRef === packageRef)
  }, [packageRef, versionReferences.references, addedVersionReferences.references, added])

  useEffect(() => {
    if (recursiveDashboardName || !added) {
      return
    }
    if (!addedVersionReferences.references?.some(({ packageRef }) => addedVersionReferences.packages![packageRef!].key === packageId)) {
      return
    }
    setRecursiveDashboardName(name)
  }, [added, addedVersionReferences.packages, addedVersionReferences.references, recursiveDashboardName, name, packageId, setRecursiveDashboardName])

  const nextLevel = useMemo(() => level + 1, [level])

  const conflicted = useMemo(() => {
    const count = dashboardPackages?.get(key!)
    return count && count > 1
  }, [dashboardPackages, key])

  const updateCollapseKeys = useCallback((key: Key) => {
    setOpen(!open)
    setCollapsedKeys(previousKeys => (
      !previousKeys.includes(key)
        ? [...previousKeys, key]
        : previousKeys.filter(id => id !== key)
    ))
  }, [open, setCollapsedKeys])

  return (
    <>
      <TableRow hover tabIndex={-1} key={key} sx={{ p: 0 }}>
        <TableCell key="packages" data-testid="PackagesCell">
          <TextWithOverflowTooltip tooltipText={name}>
            <Box sx={{ display: 'flex', alignItems: 'center', pl: (level * 3.5) }}>
              {(!open && !deletedAt && kind !== PACKAGE_KIND || isNotEmpty(descendants))
                ? <IconButton
                  sx={{ p: 0, mr: 1 }}
                  onClick={() => updateCollapseKeys(key!)}
                  data-testid={open ? 'CollapseButton' : 'ExpandButton'}
                >
                  {open
                    ? <KeyboardArrowDownOutlinedIcon sx={{ fontSize: '16px' }}/>
                    : <KeyboardArrowRightOutlinedIcon sx={{ fontSize: '16px' }}/>}
                </IconButton>
                : <IconButton sx={{ width: '24px' }}></IconButton>}
              <PackageKindLogo kind={kind}/>
              <Box sx={{
                pl: 0.5,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
              }}>
                <Typography noWrap variant="body2" sx={{ display: 'flex', alignItems: 'center' }}>
                  <Box sx={{ display: 'flex', ml: '3px' }}>
                    {!readonly && excluded
                      ? <Tooltip
                        title="The package is not included in the dashboard because the same package is already included in the dashboard"
                        placement="right">
                        <Box sx={{ color: '#626D82', textDecoration: 'line-through' }} data-testid="ExcludedPackage">
                          {name}
                        </Box>
                      </Tooltip>
                      : name}
                    {kind === DASHBOARD_KIND && deletedReferences?.get(key!) &&
                      <Box sx={{ mr: '3px' }}>
                        <Tooltip
                          title="One of the child package/dashboard version no longer exists. Expand this dashboard to see deleted package/dashboard version"
                          placement="right">
                          <Box data-testid="NotExistIndicator">
                            <RedWarningCircleIcon/>
                          </Box>
                        </Tooltip>
                      </Box>
                    }
                    {readonly && kind === DASHBOARD_KIND && conflictedReferences?.has(key!) &&
                      <Tooltip title="One of the child package/dashboard has conflict" placement="right">
                        <Box data-testid="ConflictIndicator">
                          <YellowWarningCircleIcon/>
                        </Box>
                      </Tooltip>
                    }
                  </Box>
                  <Box sx={{ ml: '8px', display: 'flex' }}>
                    {readonly && conflicted &&
                      <Tooltip
                        title="There is a conflict because this package is included in the dashboard multiple times. The conflict will be resolved automatically after version publication and out of all identical packages only one package will be included in the dashboard"
                        placement="right">
                        <Box data-testid="ConflictAlert">
                          <YellowWarningIcon/>
                        </Box>
                      </Tooltip>}
                    {deletedAt && (kind === PACKAGE_KIND
                      ? <Tooltip title="The included package version no longer exists" placement="right">
                        <Box data-testid="NotExistAlert">
                          <RedWarningIcon/>
                        </Box>
                      </Tooltip>
                      : <Tooltip title="The included dashboard version no longer exists" placement="right">
                        <Box data-testid="NotExistAlert">
                          <RedWarningIcon/>
                        </Box>
                      </Tooltip>)}
                  </Box>
                </Typography>
              </Box>
            </Box>
          </TextWithOverflowTooltip>
        </TableCell>
        <TableCell key="version" data-testid="VersionCell">
          <TextWithOverflowTooltip tooltipText={versionKey}>
            {versionKey}
          </TextWithOverflowTooltip>
        </TableCell>
        <TableCell key="status" data-testid="StatusCell">
          {status && <CustomChip value={status}/>}
        </TableCell>
        <TableCell key="remove" data-testid="RemoveCell">
          {onRemove && (
            <>
              <Tooltip title="Remove">
                <IconButton
                  sx={{ visibility: 'hidden', p: 0 }}
                  className="hoverable"
                  onClick={() => setDeleteConfirmationOpen(true)}
                  data-testid="RemoveButton"
                >
                  <DeleteIcon color="#626D82"/>
                </IconButton>
              </Tooltip>
              <ConfirmationDialog
                open={deleteConfirmationOpen}
                title={`Remove ${name} from the dashboard?`}
                confirmButtonName="Remove"
                onConfirm={() => onRemove(key!, version!, kind!, !!deletedAt)}
                onCancel={() => setDeleteConfirmationOpen(false)}
              />
            </>
          )}
        </TableCell>
      </TableRow>
      {open && descendants && isNotEmpty(descendants) && descendants.map(descendant => {
        const references = added ? addedVersionReferences : versionReferences
        const descendantPackage = references.packages![descendant.packageRef!]
        return (
          <ReferenceRow
            key={descendantPackage.key}
            reference={{ ...descendant, excluded: descendant.excluded || excluded }}
            pack={descendantPackage}
            versionReferences={references}
            level={nextLevel}
            added={false}
            readonly={readonly}
          />)
      })}
    </>
  )
})
