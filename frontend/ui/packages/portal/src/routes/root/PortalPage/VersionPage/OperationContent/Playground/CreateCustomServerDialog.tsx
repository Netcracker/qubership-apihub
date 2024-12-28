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

import type { ChangeEvent, FC } from 'react'
import * as React from 'react'
import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import {
  Autocomplete,
  Button,
  DialogActions,
  DialogContent,
  DialogTitle,
  ListItem,
  TextField,
  Typography,
} from '@mui/material'
import { LoadingButton } from '@mui/lab'
import { Controller, useForm } from 'react-hook-form'
import type { ControllerFieldState, ControllerRenderProps } from 'react-hook-form/dist/types/controller'
import type { UseFormStateReturn } from 'react-hook-form/dist/types'
import { usePackage } from '../../../../usePackage'
import { useAgents } from './useAgents'
import { useNamespaces } from './useNamespaces'
import { useCustomServersPackageMap } from './useCustomServersPackageMap'
import { useParams } from 'react-router-dom'
import { useServiceNames } from './useServiceNames'
import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import type { PopupProps } from '@netcracker/qubership-apihub-ui-shared/components/PopupDelegate'
import { PopupDelegate } from '@netcracker/qubership-apihub-ui-shared/components/PopupDelegate'
import { SHOW_CREATE_CUSTOM_SERVER_DIALOG } from '@apihub/routes/EventBusProvider'
import type { Namespace } from '@netcracker/qubership-apihub-ui-shared/entities/namespaces'
import { DialogForm } from '@netcracker/qubership-apihub-ui-shared/components/DialogForm'
import { isServiceNameExistInNamespace } from '@netcracker/qubership-apihub-ui-shared/entities/service-names'

const CLOUD_KEY = 'cloudKey'
const NAMESPACE_KEY = 'namespaceKey'
const SERVICE_KEY = 'serviceKey'
const CUSTOM_SERVER_URL_KEY = 'customServerUrl'

type CreateCustomServerForm = {
  [CLOUD_KEY]?: Key
  [NAMESPACE_KEY]?: Key
  [SERVICE_KEY]?: Key
  [CUSTOM_SERVER_URL_KEY]?: Key
}

export const CreateCustomServerDialog: FC = memo(() => {
  return (
    <PopupDelegate
      type={SHOW_CREATE_CUSTOM_SERVER_DIALOG}
      render={props => <CreateCustomServerPopup {...props}/>}
    />
  )
})

type ControllerRenderFunctionProps<FieldName extends keyof CreateCustomServerForm> = {
  field: ControllerRenderProps<CreateCustomServerForm, FieldName>
  fieldState: ControllerFieldState
  formState: UseFormStateReturn<CreateCustomServerForm>
}

const CreateCustomServerPopup: FC<PopupProps> = memo<PopupProps>(({ open, setOpen }) => {
  const { packageId = '' } = useParams()
  const [packageObj] = usePackage()
  const serviceName = packageObj?.serviceName
  const isServiceNameExist = !!serviceName

  // States for selections
  const [selectedCloud, setSelectedCloud] = useState<string>('')
  const [selectedNamespace, setSelectedNamespace] = useState<Namespace | null>(null)
  const [selectedService] = useState<string | null>(serviceName ?? '')
  const [selectedAgent, setSelectedAgent] = useState<string | undefined>()
  const [selectedCustomUrl, setSelectedCustomUrl] = useState<string>('')

  //  Load data for connected fields
  const [agents] = useAgents()
  const clouds = useMemo(() => agents?.map(({ agentDeploymentCloud }) => agentDeploymentCloud), [agents])
  const cloudAgentIdMap = useMemo(
    () => new Map(agents.map(({ agentId, agentDeploymentCloud }) => [agentDeploymentCloud, agentId])),
    [agents],
  )
  useEffect(
    () => {selectedCloud && cloudAgentIdMap.has(selectedCloud) && setSelectedAgent(cloudAgentIdMap.get(selectedCloud) ?? '')},
    [cloudAgentIdMap, selectedCloud],
  )
  const [namespaces] = useNamespaces(selectedAgent!)
  const [serviceNames] = useServiceNames(selectedAgent!, selectedNamespace?.namespaceKey)

  // Form initializing
  const defaultFormData = useMemo<CreateCustomServerForm>(() => ({
    cloudKey: '',
    namespaceKey: '',
    serviceKey: serviceName ?? '',
    customServerUrl: '',
  }), [serviceName])
  const {
    handleSubmit,
    control,
    setValue,
    getValues,
  } = useForm<CreateCustomServerForm>({ defaultValues: defaultFormData })
  const { cloudKey, namespaceKey } = getValues()

  const isUrlGenerationAvailable = isServiceNameExist && selectedAgent && selectedNamespace

  useEffect(
    () => {isUrlGenerationAvailable && setSelectedCustomUrl(`/apihub-nc/agents/${selectedAgent}/namespaces/${namespaceKey}/services/${selectedService}/proxy/`)},
    [isUrlGenerationAvailable, namespaceKey, selectedAgent, selectedNamespace, selectedService],
  )

  const isServiceNameValid = useMemo(
    () => isServiceNameExistInNamespace(serviceNames, serviceName, selectedCloud, selectedNamespace?.namespaceKey),
    [selectedCloud, selectedNamespace?.namespaceKey, serviceName, serviceNames],
  )

  const updateSelectedCustomUrl = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setSelectedCustomUrl(event.target.value)
    setSelectedNamespace(null)
    setSelectedCloud('')
  }, [])

  // Storing data in local storage
  const [customServersPackageMap, setCustomServersPackageMap] = useCustomServersPackageMap()

  const server = useMemo(() => ({
    url: selectedCustomUrl ?? '',
    description: cloudKey ? `Proxy via agent ${selectedAgent} to ${selectedNamespace?.namespaceKey}` : '',
  }), [cloudKey, selectedAgent, selectedCustomUrl, selectedNamespace?.namespaceKey])

  const onAddCustomServer = useCallback(() => {
    if (isServiceNameValid) {
      setCustomServersPackageMap(packageId, [...customServersPackageMap?.[packageId] ?? [], server])
      setTimeout(() => setOpen(false), 50)
    }
  }, [isServiceNameValid, setCustomServersPackageMap, packageId, customServersPackageMap, server, setOpen])

  // Rendering functions
  const renderSelectCloud = useCallback(({ field }: ControllerRenderFunctionProps<typeof CLOUD_KEY>) => (
    <Autocomplete
      key="cloudAutocomplete"
      options={clouds}
      value={selectedCloud}
      renderOption={(props, cloud) => (
        <ListItem {...props} key={crypto.randomUUID()}>
          {cloud}
        </ListItem>
      )}
      isOptionEqualToValue={(option, value) => option === value}
      renderInput={(params) => (
        <TextField {...field} {...params} label="Cloud"/>
      )}
      onChange={(_, value) => {
        setValue(CLOUD_KEY, value ?? '')
        setSelectedCloud(value ?? '')
        setSelectedNamespace(null)
        setSelectedCustomUrl('')
      }}
      data-testid="CloudAutocomplete"
    />
  ), [clouds, selectedCloud, setValue])

  const renderSelectNamespace = useCallback((
    { field }: ControllerRenderFunctionProps<typeof NAMESPACE_KEY>) => (
    <Autocomplete
      key="namespaceAutocomplete"
      options={namespaces}
      getOptionLabel={({ namespaceKey }: Namespace) => namespaceKey}
      value={selectedNamespace}
      renderOption={(props, { namespaceKey }) => (
        <ListItem {...props} key={crypto.randomUUID()}>
          {namespaceKey}
        </ListItem>
      )}
      renderInput={(params) => (
        <TextField
          {...field}
          {...params}
          label="Namespace"
          error={!isServiceNameValid}
          helperText={!isServiceNameValid && `Service with ${serviceName} not found in selected namespace`}
        />
      )}
      onChange={(_, value) => {
        setValue(NAMESPACE_KEY, value?.namespaceKey ?? '')
        setSelectedNamespace(value)
        setSelectedCustomUrl('')
      }}
      data-testid="NamespaceAutocomplete"
    />
  ), [isServiceNameValid, namespaces, selectedNamespace, serviceName, setValue])

  const renderSelectService = useCallback((
      { field }: ControllerRenderFunctionProps<typeof SERVICE_KEY>) => (
      <Autocomplete
        disabled={true}
        key="serviceAutocomplete"
        options={[serviceName]}
        value={selectedService}
        renderOption={(props, serviceName) => (
          <ListItem {...props} key={crypto.randomUUID()}>
            {serviceName}
          </ListItem>
        )}
        renderInput={(params) => (
          <TextField {...field} {...params} label="Service"/>
        )}
        data-testid="ServiceAutocomplete"
      />
    ),
    [selectedService, serviceName],
  )

  const renderSelectUrl = useCallback((
      { field }: ControllerRenderFunctionProps<typeof CUSTOM_SERVER_URL_KEY>) => (
      <TextField
        {...field}
        value={selectedCustomUrl ?? ''}
        onChange={updateSelectedCustomUrl}
        required
        label="Server URL"
        data-testid="ServerUrlTextInput"
      />
    ),
    [selectedCustomUrl, updateSelectedCustomUrl],
  )

  return (
    <DialogForm
      open={open}
      onClose={() => setOpen(false)}
      onSubmit={handleSubmit(onAddCustomServer)}
    >
      <DialogTitle>
        Add Custom Server
      </DialogTitle>

      <DialogContent>
        {isServiceNameExist && (<>
          <Typography variant="subtitle2">Use Agent Proxy</Typography>

          <Controller
            name={CLOUD_KEY}
            control={control}
            render={renderSelectCloud}
          />
          <Controller
            name={NAMESPACE_KEY}
            control={control}
            render={renderSelectNamespace}
          />
          <Controller
            name={SERVICE_KEY}
            control={control}
            render={renderSelectService}
          />
        </>)}

        <Typography variant="subtitle2" mt={2}>Custom Server URL</Typography>

        <Controller
          name={CUSTOM_SERVER_URL_KEY}
          control={control}
          render={renderSelectUrl}
        />
      </DialogContent>

      <DialogActions>
        <LoadingButton variant="contained" type="submit" loading={false} data-testid="AddButton">
          Add
        </LoadingButton>
        <Button variant="outlined" onClick={() => setOpen(false)} data-testid="CancelButton">
          Cancel
        </Button>
      </DialogActions>
    </DialogForm>
  )
})
