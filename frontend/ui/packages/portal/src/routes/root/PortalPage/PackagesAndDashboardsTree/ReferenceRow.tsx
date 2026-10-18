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
import { Box, IconButton, Link, TableCell, TableRow, Tooltip, Typography } from '@mui/material'
import { styled } from '@mui/material/styles'
import { NavLink } from 'react-router-dom'
import { getVersionPath } from '../../../NavigationProvider'
import KeyboardArrowDownOutlinedIcon from '@mui/icons-material/KeyboardArrowDownOutlined'
import KeyboardArrowRightOutlinedIcon from '@mui/icons-material/KeyboardArrowRightOutlined'
import {
  useDashboardCollapsedReferenceKeys,
  useSetDashboardCollapsedReferenceKeys,
} from './CollapsedReferenceKeysContext'
import { useVersionReferences } from '../../useVersionReferences'
import { useParams } from 'react-router-dom'
import { useAddConflictedReferences, useConflictedReferences } from '../useConflictedReferences'
import { useDashboardPackages } from '../useDashboardPackages'
import {
  useRecursiveDashboardName,
  useSetRecursiveDashboardName,
} from '../DashboardPage/RecursiveDashboardNameContextProvider'
import { getDeletedDescendantRefs, hasDeletedReferences } from './referenceProblems'

import { getSplittedVersionKey } from '@netcracker/qubership-apihub-ui-shared/utils/versions'
import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import { TextWithOverflowTooltip } from '@netcracker/qubership-apihub-ui-shared/components/TextWithOverflowTooltip'
import { VersionErrorIndicator } from '@netcracker/qubership-apihub-ui-shared/components/ErrorIndicators/VersionErrorIndicator'
import { DotIndicator } from '@netcracker/qubership-apihub-ui-shared/components/DotIndicator'
import { DASHBOARD_KIND, PACKAGE_KIND } from '@netcracker/qubership-apihub-ui-shared/entities/packages'
import { isNotEmpty } from '@netcracker/qubership-apihub-ui-shared/utils/arrays'
import { PackageKindLogo } from '@netcracker/qubership-apihub-ui-shared/components/PackageKindLogo'
import { YellowWarningIcon } from '@netcracker/qubership-apihub-ui-shared/icons/WarningIcon'
import { VersionStatusChip } from '@netcracker/qubership-apihub-ui-shared/components/VersionStatusChip'
import { DeleteIcon } from '@netcracker/qubership-apihub-ui-shared/icons/DeleteIcon'
import type {
  PackageReference,
  ReferenceKind,
  UnresolvedReference,
  VersionReferences,
} from '@netcracker/qubership-apihub-ui-shared/entities/version-references'
import {
  ConfirmationDialog,
} from '@netcracker/qubership-apihub-ui-shared/components/ConfirmationDialog/ConfirmationDialog'
import { PUBLICATION_ERROR_MESSAGES } from '@netcracker/qubership-apihub-ui-shared/utils/publicationErrorMessages'

// The Packages item of the Overview navigation uses the same gap before its red dot.
const MARKER_GAP = '5px'

export type ReferenceRowProps = {
  reference: UnresolvedReference
  pack: PackageReference
  versionReferences: VersionReferences
  deletedDescendantRefs: ReadonlySet<Key>
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
      hasErrors,
      changelogHasErrors,
      apiProcessorVersion,
    },
    versionReferences,
    deletedDescendantRefs,
    level,
    onRemove,
    added,
    readonly,
  },
) => {
  const { packageId, versionId } = useParams()
  const { data: conflictedReferences } = useConflictedReferences(packageId!, versionId!)
  const [addConflictedReferences] = useAddConflictedReferences()
  const { data: dashboardPackages } = useDashboardPackages(packageId!, versionId!)

  const recursiveDashboardName = useRecursiveDashboardName()
  const setRecursiveDashboardName = useSetRecursiveDashboardName()

  const { versionKey } = getSplittedVersionKey(version, latestRevision)

  const isLinkable = !deletedAt

  const collapsedKeys = useDashboardCollapsedReferenceKeys()
  const setCollapsedKeys = useSetDashboardCollapsedReferenceKeys()

  const [deleteConfirmationOpen, setDeleteConfirmationOpen] = useState(false)

  const [open, setOpen] = useState(collapsedKeys?.includes(key!))

  const { data: addedVersionReferences } = useVersionReferences({
    packageKey: key!,
    version: version!,
    enabled: added,
  })

  const addedDeletedDescendantRefs = useMemo(
    () => getDeletedDescendantRefs(addedVersionReferences),
    [addedVersionReferences],
  )
  const hasOwnDeletedDescendants = packageRef !== undefined && deletedDescendantRefs.has(packageRef)
  const hasDeletedDescendants = added ? hasDeletedReferences(addedVersionReferences) : hasOwnDeletedDescendants
  const childDeletedDescendantRefs = added ? addedDeletedDescendantRefs : deletedDescendantRefs

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
                  <NameWithMarkers>
                    {!readonly && excluded
                      ? <Tooltip
                        title="The package is not included in the dashboard because the same package is already included in the dashboard"
                        placement="right">
                        <Box sx={{ color: '#626D82', textDecoration: 'line-through' }} data-testid="ExcludedPackage">
                          {name}
                        </Box>
                      </Tooltip>
                      : isLinkable
                        ? <Link
                          component={NavLink}
                          to={getVersionPath({ packageKey: key!, versionKey: versionKey })}
                          data-testid="PackageNameLink"
                        >
                          {name}
                        </Link>
                        : name}
                    {kind === DASHBOARD_KIND && hasDeletedDescendants && (
                      <DotIndicator
                        color="error"
                        tooltip={PUBLICATION_ERROR_MESSAGES.reference.childIssueDot}
                        data-testid="NotExistIndicator"
                      />
                    )}
                    {readonly && kind === DASHBOARD_KIND && conflictedReferences?.has(key!) && (
                      <DotIndicator
                        color="warning"
                        tooltip="One of the child package/dashboard has conflict"
                        data-testid="ConflictIndicator"
                      />
                    )}
                  </NameWithMarkers>
                  <RowAlerts>
                    {readonly && conflicted &&
                      <Tooltip
                        title="There is a conflict because this package is included in the dashboard multiple times. The conflict will be resolved automatically after version publication and out of all identical packages only one package will be included in the dashboard"
                        placement="right">
                        <ConflictAlert data-testid="ConflictAlert">
                          <YellowWarningIcon/>
                        </ConflictAlert>
                      </Tooltip>}
                    {deletedAt && (
                      <VersionErrorIndicator
                        deletedAt={deletedAt}
                        kind={kind}
                        fontSize="extra-small"
                        tooltipPlacement="right"
                        data-testid="NotExistAlert"
                      />
                    )}
                  </RowAlerts>
                </Typography>
              </Box>
            </Box>
          </TextWithOverflowTooltip>
        </TableCell>
        <TableCell key="version" data-testid="VersionCell">
          <VersionCellContent>
            <VersionText>
              <TextWithOverflowTooltip tooltipText={versionKey}>
                {versionKey}
              </TextWithOverflowTooltip>
            </VersionText>
            {isLinkable && (
              <VersionErrorIndicator
                versionKey={versionKey}
                hasErrors={hasErrors}
                changelogHasErrors={changelogHasErrors}
                apiProcessorVersion={apiProcessorVersion}
                kind={kind}
                fontSize="extra-small"
              />
            )}
          </VersionCellContent>
        </TableCell>
        <TableCell key="status" data-testid="StatusCell">
          {status && <VersionStatusChip status={status}/>}
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
            deletedDescendantRefs={childDeletedDescendantRefs}
            level={nextLevel}
            added={false}
            readonly={readonly}
          />)
      })}
    </>
  )
})

const NameWithMarkers = styled(Box)({
  display: 'flex',
  gap: MARKER_GAP,
  marginLeft: '3px',
})

const RowAlerts = styled(Box)({
  display: 'flex',
  gap: MARKER_GAP,
  marginLeft: MARKER_GAP,
})

const ConflictAlert = styled(Box)({
  display: 'flex',
})

const VersionCellContent = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
  overflow: 'hidden',
}))

const VersionText = styled(Box)({
  minWidth: 0,
})
