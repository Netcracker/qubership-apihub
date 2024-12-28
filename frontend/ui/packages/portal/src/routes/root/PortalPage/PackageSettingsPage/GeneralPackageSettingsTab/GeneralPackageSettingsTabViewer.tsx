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

import { Accordion, AccordionDetails, AccordionSummary, Box, Grid, Typography } from '@mui/material'
import type { FC } from 'react'
import * as React from 'react'
import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import {
  useEditableGeneralPackageSettingsTabContent,
  useSetEditableGeneralPackageSettingsTabContent,
} from './GeneralPackageSettingsTab'
import type { PackageSettingsTabProps } from '../package-settings'
import { PACKAGE_KINDS_NAMES_MAP } from '../package-settings'
import { useDeletePackage } from '../../../usePackage'
import { useNavigate } from 'react-router-dom'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import {
  CREATE_AND_UPDATE_PACKAGE_PERMISSION,
  DELETE_PACKAGE_PERMISSION,
} from '@netcracker/qubership-apihub-ui-shared/entities/package-permissions'
import { BodyCard } from '@netcracker/qubership-apihub-ui-shared/components/BodyCard'
import { ButtonWithHint } from '@netcracker/qubership-apihub-ui-shared/components/Buttons/ButtonWithHint'
import { LoadingIndicator } from '@netcracker/qubership-apihub-ui-shared/components/LoadingIndicator'
import { DeleteIcon } from '@netcracker/qubership-apihub-ui-shared/icons/DeleteIcon'
import { TitledValue } from '@apihub/components/TitledValue'
import { transformStringValue } from '@netcracker/qubership-apihub-ui-shared/utils/strings'
import { DASHBOARD_KIND, GROUP_KIND, PACKAGE_KIND } from '@netcracker/qubership-apihub-ui-shared/entities/packages'
import { getSplittedVersionKey } from '@netcracker/qubership-apihub-ui-shared/utils/versions'
import { ConfirmationDialog } from '@netcracker/qubership-apihub-ui-shared/components/ConfirmationDialog'

export const GeneralPackageSettingsTabViewer: FC<PackageSettingsTabProps> = memo<PackageSettingsTabProps>(({
  packageObject,
  isPackageLoading,
}) => {
  const {
    key,
    kind,
    serviceName,
    alias,
    packageVisibility,
    parentGroup,
    permissions,
    name,
    description,
    defaultReleaseVersion,
    releaseVersionPattern,
  } = packageObject
  const navigate = useNavigate()
  const editable = useEditableGeneralPackageSettingsTabContent()
  const setEditable = useSetEditableGeneralPackageSettingsTabContent()
  const [deletePackage, isDeleteLoading, isDeleteSuccess] = useDeletePackage()
  const [deleteConfirmationOpen, setDeleteConfirmationOpen] = useState(false)

  // todo create common check permission hook when Package type is will in shared
  const hasUpdatePackagePermission = useMemo(
    () => !!permissions?.includes(CREATE_AND_UPDATE_PACKAGE_PERMISSION),
    [permissions],
  )
  const hasDeletePackagePermission = useMemo(
    () => !!permissions?.includes(DELETE_PACKAGE_PERMISSION),
    [permissions],
  )

  useEffect(() => {
    if (isDeleteSuccess) {
      location.replace('/portal')
    }
  }, [isDeleteSuccess, navigate])

  const onDeletePackage = useCallback(() => {
    deletePackage(key)
  }, [deletePackage, key])

  if (editable) {
    return null
  }

  return (
    <BodyCard
      header="General"
      action={
        <Box sx={{ display: 'flex', mb: 2, gap: 2, order: 1 }}>
          <ButtonWithHint
            sx={{ width: 100 }}
            variant="outlined"
            title="Edit"
            disabled={!hasUpdatePackagePermission}
            disableHint={hasUpdatePackagePermission}
            hint="You do not have permission to edit the package"
            onClick={() => setEditable(true)}
            testId="EditButton"
          />
          <ButtonWithHint
            sx={{ color: '#FF5260', '&:hover': { color: '#FF5260' } }}
            variant="outlined"
            startIcon={<DeleteIcon/>}
            title="Delete"
            disabled={!hasDeletePackagePermission}
            disableHint={hasDeletePackagePermission}
            hint="You do not have permission to delete the package"
            onClick={() => setDeleteConfirmationOpen(true)}
            testId="DeleteButton"
          />
          <ConfirmationDialog
            open={deleteConfirmationOpen}
            title={`Delete Package ${name}?`}
            loading={isDeleteLoading}
            confirmButtonName="Delete"
            onConfirm={onDeletePackage}
            onCancel={() => setDeleteConfirmationOpen(false)}
          />
        </Box>
      }
      body={isPackageLoading ? (
        <LoadingIndicator/>
      ) : (
        <Box overflow="hidden">
          <Box marginTop="8px" height="100%" overflow="hidden">
            <Grid item xs container spacing={3} height="100%">
              <Grid item xs={6}>
                <TitledValue
                  title={`${PACKAGE_KINDS_NAMES_MAP[kind]} Name`}
                  value={transformStringValue(name)}
                  testId="PackageNameContent"
                />
              </Grid>
              <Grid item xs={6}>
                <TitledValue
                  title="Alias"
                  value={transformStringValue(alias)}
                  testId="AliasContent"
                />
              </Grid>
              {[PACKAGE_KIND, DASHBOARD_KIND].includes(kind) &&
                <Grid item xs={6}>
                  <TitledValue
                    title="Service Name"
                    value={transformStringValue(serviceName)}
                    testId="ServiceNameContent"
                  />
                </Grid>
              }
              {[PACKAGE_KIND, DASHBOARD_KIND, GROUP_KIND].includes(kind) &&
                <Grid item xs={6}>
                  <TitledValue
                    title="Parent Group"
                    value={transformStringValue(parentGroup)}
                    testId="ParentGroupContent"
                  />
                </Grid>
              }
              <Grid item xs={12}>
                <TitledValue
                  title={`${PACKAGE_KINDS_NAMES_MAP[kind]} Visibility`}
                  value={packageVisibility ? 'Private' : 'Public (default role - Viewer)'}
                  testId="PackageVisibilityContent"
                />
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2">Description</Typography>
                <Typography
                  variant="body2"
                  data-testid="DescriptionContent"
                >
                  {transformStringValue(description)}
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <Accordion
                  defaultExpanded
                  square
                  sx={{ borderTop: '1px solid rgb(217, 217, 217)' }}
                >
                  <AccordionSummary
                    sx={{ p: 0, width: 113, margin: '18px 0 12px' }}
                    expandIcon={<ExpandMoreIcon sx={{ color: '#626D82' }} fontSize="small"/>}
                    data-testid="ConfigurationAccordionButton"
                  >
                    <Typography width="100%" noWrap variant="button">Configuration</Typography>
                  </AccordionSummary>
                  <AccordionDetails sx={{ gap: 2, display: 'flex', flexDirection: 'column' }}>
                    {[PACKAGE_KIND, DASHBOARD_KIND].includes(kind) &&
                      <TitledValue
                        title="Default Release Version"
                        value={transformStringValue(getSplittedVersionKey(defaultReleaseVersion).versionKey)}
                        testId="DefaultReleaseVersionContent"
                      />}
                    <TitledValue
                      title="Release Version Pattern (Regular Expression)"
                      value={transformStringValue(releaseVersionPattern)}
                      testId="ReleaseVersionPatternContent"
                    />
                  </AccordionDetails>
                </Accordion>
              </Grid>
            </Grid>
          </Box>
        </Box>
      )
      }
    />
  )
})
