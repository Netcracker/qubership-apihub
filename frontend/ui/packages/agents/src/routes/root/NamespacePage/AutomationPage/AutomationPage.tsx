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
import { memo, useEffect, useMemo } from 'react'
import type { UpdateSettings } from './useUpdateSettings'
import { useUpdateSettings } from './useUpdateSettings'
import { useSettings } from './useSettings'
import {
  Alert,
  Autocomplete,
  Box,
  FormControlLabel,
  FormGroup,
  Radio,
  RadioGroup,
  Switch,
  TextField,
  Typography,
} from '@mui/material'
import type { Control, FieldNamesMarkedBoolean } from 'react-hook-form'
import { Controller, useForm } from 'react-hook-form'
import { DesktopTimePicker, LocalizationProvider } from '@mui/x-date-pickers'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import type { Dayjs } from 'dayjs'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'
import { LoadingButton } from '@mui/lab'
import { EmailNotificationList } from './EmailNotificationList'
import { useBaselineOptions } from '../useBaselineOptions'
import { useVersionOptions } from './useVersionOptions'
import { BodyCard } from '@netcracker/qubership-apihub-ui-shared/components/BodyCard'
import type {
  AutodiscoveryStatus} from '../../../../entities/statuses'
import {
  NONE_AUTODISCOVERY_STATUS,
  SCHEDULE_AUTODISCOVERY_STATUS,
} from '../../../../entities/statuses'
import type { VersionKey } from '../../../../entities/keys'
import type { Emails, Schedules } from '../../../../entities/settings'
import { isEmpty } from '@netcracker/qubership-apihub-ui-shared/utils/arrays'

dayjs.extend(utc)
dayjs.extend(timezone)

export const AutomationPage: FC = memo(() => {
  const [, isSettingsLoading] = useSettings()
  const [updateSettings, areUpdateSettingsLoading, isSuccess, isError] = useUpdateSettings()
  const [control, versionOptions, previousVersionOptions, autoDiscoveryStatus, emailNotificationsEnabled, onSubmit, formChanges] = useDialogData(updateSettings)

  const isLoading = isSettingsLoading || areUpdateSettingsLoading
  const isFormDisabled = isLoading || autoDiscoveryStatus !== SCHEDULE_AUTODISCOVERY_STATUS
  const isSaveAvailable = formChanges.autodiscoveryStatus || autoDiscoveryStatus === SCHEDULE_AUTODISCOVERY_STATUS &&
    (formChanges.previousVersionKey || formChanges.versionKey || formChanges.discoveryTime || formChanges.emailNotificationsEnabled || formChanges.emailNotificationList)

  return (
    <Box component="form" overflow="auto" onSubmit={onSubmit}>
      <BodyCard
        header="Automation"
        action={
          <Box display="flex" gap={2} mr={1} mt={0.5} alignItems="center">
            <LoadingButton
              variant="contained"
              disabled={isLoading || !isSaveAvailable}
              type="submit"
              loading={areUpdateSettingsLoading}
            >
              Save
            </LoadingButton>
          </Box>
        }
        body={
          <Box gap={1} display="flex" flexDirection="column" height="100%">
            <Box>
              {isSuccess && <Alert color="success">Settings have been updated</Alert>}
              {isError && <Alert color="error">Settings have not been updated</Alert>}
            </Box>
            <Typography variant="h3">Start Auto Discovery</Typography>
            <Controller
              name="autodiscoveryStatus"
              control={control}
              render={({ field: { value, onChange } }) => (
                <RadioGroup value={value} onChange={onChange}>
                  <FormControlLabel
                    disabled={isLoading}
                    value={NONE_AUTODISCOVERY_STATUS}
                    label="None"
                    control={<Radio/>}
                  />
                  <FormControlLabel
                    disabled={isLoading}
                    value={SCHEDULE_AUTODISCOVERY_STATUS}
                    label="On schedule"
                    control={<Radio/>}
                  />
                  <FormControlLabel
                    disabled
                    label="On any service update"
                    control={<Radio/>}
                  />
                </RadioGroup>
              )}
            />
            <Box display="flex" gap="24px" width="624px">
              <Controller
                name="versionKey"
                control={control}
                render={({ field: { value, onChange } }) => (
                  <Autocomplete
                    freeSolo
                    disabled={isFormDisabled}
                    value={value}
                    options={versionOptions}
                    renderInput={(params) => <TextField
                      {...params}
                      onChange={onChange}
                      required
                      label="Snapshot Name"
                    />}
                    onChange={(_, value) => onChange(value)}
                  />
                )}
              />
              <Controller
                name="previousVersionKey"
                control={control}
                render={({ field: { value, onChange } }) => (
                  <Autocomplete
                    freeSolo
                    disabled={isFormDisabled}
                    value={value}
                    options={previousVersionOptions}
                    renderInput={(params) => <TextField
                      {...params}
                      onChange={onChange}
                      required
                      label="Baseline (Release Version)"
                    />}
                    onChange={(_, value) => onChange(value)}
                  />
                )}
              />
            </Box>
            <Box width="300px">
              <LocalizationProvider dateAdapter={AdapterDayjs}>
                <Controller
                  name="discoveryTime"
                  control={control}
                  render={({ field: { value, onChange } }) => (
                    <DesktopTimePicker
                      disabled={isFormDisabled}
                      label="Discovery Time"
                      views={['hours', 'minutes']}
                      mask="__:__"
                      inputFormat="HH:mm"
                      value={value}
                      onChange={onChange}
                      renderInput={(params) => <TextField {...params} />}
                    />
                  )}
                />
              </LocalizationProvider>
            </Box>
            {autoDiscoveryStatus === SCHEDULE_AUTODISCOVERY_STATUS && (
              <>
                <Typography variant="h3" mt={2}>
                  Notifications
                </Typography>
                <Typography variant="body2" mt={0}>
                  Send notifications via email
                </Typography>
                <Controller
                  name="emailNotificationsEnabled"
                  control={control}
                  render={({ field: { value, onChange } }) => {
                    return (
                      <FormGroup>
                        <FormControlLabel
                          label={value ? 'Yes' : 'No'}
                          control={
                            <Switch
                              sx={{ marginLeft: '10px', marginRight: '15px' }}
                              checked={emailNotificationsEnabled}
                              onChange={onChange}
                            />
                          }
                        />
                      </FormGroup>
                    )
                  }}
                />
                {emailNotificationsEnabled && (<Box sx={{ width: '410px' }}>
                    <Controller
                      name="emailNotificationList"
                      control={control}
                      render={({ field: { value, onChange } }) => <EmailNotificationList
                        value={value}
                        onChange={onChange}
                      />}
                    />
                  </Box>
                )}
              </>
            )}
          </Box>
        }
      />
    </Box>
  )
})

export type FormData = {
  autodiscoveryStatus: AutodiscoveryStatus | null
  versionKey: VersionKey | null
  previousVersionKey: VersionKey | null
  discoveryTime: DiscoveryTime | null
  emailNotificationsEnabled: boolean
  emailNotificationList: Emails
}

type DiscoveryTime = Dayjs
type NameOptions = string[]
type BaselineOptions = string[]
type OnSubmit = () => void
type EmailNotificationEnablement = boolean

function useDialogData(
  updateSettings: UpdateSettings,
): [
  Control<FormData>,
  NameOptions,
  BaselineOptions,
  AutodiscoveryStatus,
  EmailNotificationEnablement,
  OnSubmit,
  Partial<Readonly<FieldNamesMarkedBoolean<FormData>>>
] {
  const [{
    autodiscoveryStatus,
    versionKey,
    previousVersionKey,
    schedules,
    emailNotificationList,
    emailNotificationsEnabled,
  }] = useSettings()

  const defaultValues = useMemo(() => ({
    autodiscoveryStatus: autodiscoveryStatus || NONE_AUTODISCOVERY_STATUS,
    versionKey: versionKey,
    previousVersionKey: previousVersionKey,
    discoveryTime: toDiscoveryTime(schedules),
    emailNotificationsEnabled: emailNotificationsEnabled,
    emailNotificationList: emailNotificationList,
  }), [autodiscoveryStatus, previousVersionKey, schedules, versionKey, emailNotificationList, emailNotificationsEnabled])

  const form = useForm<FormData>({ defaultValues })
  useEffect(() => form.reset(defaultValues), [defaultValues, form])

  const onSubmit = useMemo(
    () =>
      form.handleSubmit((value) =>
        updateSettings({
          autodiscoveryStatus: value.autodiscoveryStatus!,
          versionKey: value.versionKey!,
          previousVersionKey: value.previousVersionKey!,
          schedules: toSchedules(value.discoveryTime),
          emailNotificationsEnabled: value.emailNotificationsEnabled,
          emailNotificationList: value.emailNotificationList!,
        }),
      ),
    [form, updateSettings],
  )

  const versionOptions = useVersionOptions()
  const baselineOptions = useBaselineOptions()

  return [
    form.control,
    versionOptions,
    baselineOptions,
    form.watch().autodiscoveryStatus!,
    form.watch().emailNotificationsEnabled,
    onSubmit,
    form.formState.dirtyFields,
  ]
}

function toDiscoveryTime(schedules: Schedules): DiscoveryTime {
  if (isEmpty(schedules)) {
    return dayjs()
  }

  const [schedule] = schedules
  const [minutes, hours] = schedule.split(' ')
  const userTimeZone = dayjs.tz.guess()

  return dayjs()
    .utc()
    .set('minutes', parseInt(minutes))
    .set('hours', parseInt(hours))
    .tz(userTimeZone)
}

function toSchedules(discoveryTime: DiscoveryTime | null): Schedules {
  if (!discoveryTime) {
    return []
  }

  const utcTime = discoveryTime.utc()
  return [`${utcTime.minute()} ${utcTime.hour()} * * *`]
}
