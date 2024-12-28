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

import type { Dispatch, FC, SetStateAction } from 'react'
import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Autocomplete,
  Box,
  Button,
  DialogActions,
  DialogContent,
  DialogTitle,
  ListItem,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import { LoadingButton } from '@mui/lab'
import { DialogForm } from '@netcracker/qubership-apihub-ui-shared/components/DialogForm'
import type { IsLoading } from '@netcracker/qubership-apihub-ui-shared/utils/aliases'
import ExpandMoreOutlinedIcon from '@mui/icons-material/ExpandMoreOutlined'
import { TemplateUpload } from './TemplateUpload'
import { InfoIcon } from '@netcracker/qubership-apihub-ui-shared/icons/InfoIcon'
import type { ApiType } from '@netcracker/qubership-apihub-ui-shared/entities/api-types'
import { API_TYPE_GRAPHQL, API_TYPE_REST, API_TYPE_TITLE_MAP } from '@netcracker/qubership-apihub-ui-shared/entities/api-types'

export type OperationGroupParameters = {
  groupName: string
  apiType: ApiType
  description?: string
  template?: File
  isTemplateUpdated?: boolean | undefined
}

export type OperationGroupParametersPopupProps = {
  open: boolean
  setOpen: (value: boolean) => void
  title: string
  submitText: string
  submitLoading: IsLoading
  existsGroupNames: Map<ApiType, ReadonlyArray<string>>
  onSubmit: (values: OperationGroupParameters) => void
  detail?: OperationGroupParameters
  templateName?: string
  isPrefixGroup?: boolean
}

export const OperationGroupParametersPopup: FC<OperationGroupParametersPopupProps> = memo<OperationGroupParametersPopupProps>(props => {
  const {
    open,
    setOpen,
    detail,
    title,
    submitText,
    submitLoading,
    existsGroupNames,
    onSubmit,
    templateName,
    isPrefixGroup,
  } = props

  const {
    handleSubmit,
    control,
    watch,
  } = useForm<FormData>({ defaultValues: detail })
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [uploadedFile, setUploadedFile] = useState<File | undefined>()
  const [isFileUpdated, setIsFileUpdated] = useState(false)

  const handleSetUploadedFile = useCallback((file: File | undefined) => {
    setUploadedFile(file)
    setIsFileUpdated(true)
  }, [])

  useEffect(() => {
    if (templateName) {
      setUploadedFile(new File([], templateName))
    }
  }, [templateName])

  const handleSubmitCallback = useMemo(
    () => handleSubmit(formData => {
      const apiTypeNames = existsGroupNames.get(formData.apiType!)
      if (apiTypeNames?.includes(formData.groupName!) && (detail?.groupName !== formData.groupName)) {
        setErrorMessage(`Group with the same name for ${API_TYPE_TITLE_MAP[formData.apiType!]} operations already exists`)
        return
      }

      onSubmit({
        apiType: formData.apiType!,
        groupName: formData.groupName!,
        description: formData.description,
        template: uploadedFile,
        isTemplateUpdated: isFileUpdated,
      })
    }),
    [detail?.groupName, existsGroupNames, handleSubmit, onSubmit, uploadedFile, isFileUpdated],
  )

  const availableApiTypes = useMemo(
    () => Array.from(existsGroupNames.keys()),
    [existsGroupNames],
  )

  const formApiType = watch().apiType
  const [expanded, setExpanded] = useState<boolean>(false)

  useEffect(() => {
    if (formApiType) {
      return API_TYPE_EXPANDED_MAP[formApiType as ApiType](setExpanded)
    }
    setExpanded(false)
  }, [formApiType, setExpanded])

  return (
    <DialogForm
      open={open}
      onClose={() => setOpen(false)}
      onSubmit={handleSubmitCallback}
    >
      <DialogTitle>
        {title}
      </DialogTitle>
      <DialogContent>
        <Typography variant="button">
          Main info
        </Typography>
        <Controller
          name="groupName"
          control={control}
          render={({ field }) => (
            <TextField
              sx={{ mt: 0 }}
              {...field}
              value={field.value ?? ''}
              disabled={isPrefixGroup}
              error={!!errorMessage}
              helperText={!!errorMessage && errorMessage}
              onChange={(event) => {
                setErrorMessage(null)
                field.onChange(event.target.value)
              }}
              required
              label="Group Name"
              data-testid="GroupNameTextField"
            />
          )}
        />
        <Controller
          name="apiType"
          control={control}
          rules={{ required: true }}
          render={({ field: { value, onChange } }) => (
            <Autocomplete
              value={value ?? null}
              options={availableApiTypes}
              disabled={!!detail}
              isOptionEqualToValue={(option, value) => option === value}
              renderOption={(props, option) => <ListItem
                {...props}
                key={option}
                data-testid={`Option-${option}`}
              >
                {API_TYPE_TITLE_MAP[option]}
              </ListItem>}
              getOptionLabel={(option) => API_TYPE_TITLE_MAP[option]!}
              onChange={(_, type) => {
                setErrorMessage(null)
                onChange(type)
              }}
              renderInput={(params) => (
                <TextField
                  required
                  {...params}
                  label="API type"
                />
              )}
              data-testid="ApiTypeAutocomplete"
            />
          )}
        />
        <Controller
          name="description"
          control={control}
          render={({ field }) => <TextField
            {...field}
            value={field.value ?? ''}
            label="Description"
            data-testid="DescriptionTextField"
          />}
        />

        <Accordion
          disabled={formApiType ? API_TYPE_ACCORDION_DISABLED_MAP[formApiType as ApiType] : true}
          expanded={expanded}
          onChange={(_, expanded) => setExpanded(expanded)}
          sx={ACCORDION_STYLE}
        >
          <AccordionSummary sx={{ px: 0, pt: 1 }} expandIcon={<ExpandMoreOutlinedIcon/>} data-testid="AdditionalOptionsButton">
            <Typography variant="button">Additional Options</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Box display="flex" gap={0.5} alignItems="center" py={2}>
              <Typography variant="button">OpenAPI Specification Template</Typography>
              <Tooltip
                disableHoverListener={false}
                placement="right"
                title={TOOLTIP_TITLE}
              >
                <Box sx={{ cursor: 'pointer' }}>
                  <InfoIcon/>
                </Box>
              </Tooltip>
            </Box>
            <TemplateUpload
              uploadedFile={uploadedFile}
              setUploadedFile={handleSetUploadedFile}
              groupName={watch().groupName!}
              apiType={watch().apiType!}
              downloadAvailable={!uploadedFile?.type}
            />
          </AccordionDetails>
        </Accordion>
      </DialogContent>
      <DialogActions>
        <LoadingButton variant="contained" type="submit" loading={submitLoading} data-testid={`${submitText}Button`}>
          {submitText}
        </LoadingButton>
        <Button variant="outlined" onClick={() => setOpen(false)} data-testid="Cancel">
          Cancel
        </Button>
      </DialogActions>
    </DialogForm>
  )
})

type FormData = {
  groupName: string | null
  apiType: ApiType | null
  description: string
}

const ACCORDION_STYLE = {
  '&.MuiAccordion-root': {
    '&.Mui-disabled': {
      backgroundColor: 'inherit',
    },
  },
}

const TOOLTIP_TITLE = 'The OpenAPI specification template is the template that will be used when downloading the combined specification. The following information will be taken from the template, if specified, and applied to the combined specification: info, servers, externalDocs, security and securitySchemes. The template must be a valid JSON or YAML file and have an OpenAPI 3.0 structure.'

const API_TYPE_EXPANDED_MAP: Record<ApiType, (setExpanded: Dispatch<SetStateAction<boolean>>) => void> = {
  [API_TYPE_REST]: (setExpanded) => setExpanded(true),
  [API_TYPE_GRAPHQL]: (setExpanded) => setExpanded(false),
}

const API_TYPE_ACCORDION_DISABLED_MAP: Record<ApiType, boolean> = {
  [API_TYPE_REST]: false,
  [API_TYPE_GRAPHQL]: true,
}
