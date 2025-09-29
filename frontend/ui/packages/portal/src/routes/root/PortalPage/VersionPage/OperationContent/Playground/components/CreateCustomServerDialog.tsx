import { type FC, memo, useCallback, useEffect, useMemo, useReducer, useState } from 'react'
import {
  Autocomplete,
  Button,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  ListItem,
  Radio,
  RadioGroup,
  TextField,
  Tooltip,
} from '@mui/material'
import { ServerUrlDisplay } from './ServerUrlDisplay'
import { Controller, useForm } from 'react-hook-form'
import type { ControllerFieldState, ControllerRenderProps } from 'react-hook-form/dist/types/controller'
import type { UseFormStateReturn } from 'react-hook-form/dist/types'
import { usePackage } from '@netcracker/qubership-apihub-ui-portal/src/routes/root/usePackage'
import { useAgents } from '../hooks/api/useAgents'
import { useNamespaces } from '../hooks/api/useNamespaces'
import { type PlaygroundCustomServer, useCustomServersPackageMap } from '../hooks/useCustomServersPackageMap'
import { generatePath, useParams } from 'react-router-dom'
import { useServiceNames } from '../hooks/api/useServiceNames'
import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import type { PopupProps } from '@netcracker/qubership-apihub-ui-shared/components/PopupDelegate'
import { PopupDelegate } from '@netcracker/qubership-apihub-ui-shared/components/PopupDelegate'
import {
  SHOW_CREATE_CUSTOM_SERVER_DIALOG,
  useEventBus,
} from '@netcracker/qubership-apihub-ui-portal/src/routes/EventBusProvider'
import { DialogForm } from '@netcracker/qubership-apihub-ui-shared/components/DialogForm'
import { isServiceNameExistInNamespace } from '@netcracker/qubership-apihub-ui-shared/entities/service-names'
import { useShowSuccessNotification } from '@netcracker/qubership-apihub-ui-portal/src/routes/root/BasePage/Notification'
import { ErrorTextField } from '@netcracker/qubership-apihub-ui-portal/src/components/ErrorTextField'
import { InfoContextIcon } from '@netcracker/qubership-apihub-ui-shared/icons/InfoContextIcon'
import { ErrorIcon } from '@netcracker/qubership-apihub-ui-shared/icons/ErrorIcon'
import { useFirstSpecPath } from '../hooks/useFirstSpecPath'
import { SpecPathWarningAlert } from './SpecPathWarningAlert'
import { PACKAGE_KIND } from '@netcracker/qubership-apihub-ui-shared/entities/packages'
import { DEFAULT_API_TYPE } from '@netcracker/qubership-apihub-ui-shared/entities/operations'
import type { ApiType } from '@netcracker/qubership-apihub-ui-shared/entities/api-types'
import { useOperation } from '@netcracker/qubership-apihub-ui-portal/src/routes/root/PortalPage/VersionPage/useOperation'
import { useCustomUrls, useSpecUrls } from '../hooks/useUrls'
import { isAbsoluteHttpUrl } from '@netcracker/qubership-apihub-ui-shared/utils/urls'

const MODE_MANUAL = 'manual' as const
const MODE_AGENT = 'agent' as const

const KEY_CUSTOM_SERVER_URL = 'customServerUrlKey'
const KEY_CLOUD = 'cloudKey'
const KEY_NAMESPACE = 'namespaceKey'
const KEY_SERVICE = 'serviceKey'
const KEY_ADDITIONAL_PATH = 'additionalPathKey'
const KEY_DESCRIPTION = 'descriptionKey'

const LABEL_SERVER_URL = 'Server URL'
const LABEL_CLOUD = 'Cloud'
const LABEL_NAMESPACE = 'Namespace'
const LABEL_SERVICE = 'Service'
const LABEL_ADDITIONAL_PATH = 'Additional path'
const LABEL_DESCRIPTION = 'Description'

const PLACEHOLDER_ADDITIONAL_PATH = 'e.g. api/v1'

const TOOLTIP_CUSTOM_SERVER_ONLY = (packageKind: string): string =>
  `Only adding a custom server is available. To use the Agent proxy, specify the service name for the current ${packageKind}`

const ERROR_ABSOLUTE_URL_REQUIRED = 'The value must be an absolute URL'
const ERROR_REQUIRED_FIELD = 'The field must be filled'
const ERROR_SERVER_URL_EXISTS = 'Server URL already exists'
const ERROR_SERVICE_NOT_FOUND = (serviceName: string): string =>
  `Service ${serviceName} not found in selected namespace`

const SUCCESS_SERVER_ADDED = 'Server has been added'
const SUCCESS_TITLE = 'Success'

type ModeType = typeof MODE_MANUAL | typeof MODE_AGENT

type CreateCustomServerForm = {
  [KEY_CUSTOM_SERVER_URL]?: Key
  [KEY_DESCRIPTION]?: Key
  [KEY_CLOUD]?: Key
  [KEY_NAMESPACE]?: Key
  [KEY_SERVICE]?: Key
  [KEY_ADDITIONAL_PATH]?: Key
}

interface AgentState {
  selectedCloud: string
  selectedNamespace: string
  selectedAgent: string
  additionalPath: string
  agentProxyUrl: string
  agentProxyUrlError: string
}

type AgentAction =
  | { type: 'SET_CLOUD'; payload: string }
  | { type: 'SET_NAMESPACE'; payload: string }
  | { type: 'SET_AGENT'; payload: string }
  | { type: 'SET_ADDITIONAL_PATH'; payload: string }
  | { type: 'SET_PROXY_URL'; payload: string }
  | { type: 'SET_PROXY_URL_ERROR'; payload: string }
  | { type: 'RESET_NAMESPACE' }
  | { type: 'RESET_AGENT' }

const initialAgentState: AgentState = {
  selectedCloud: '',
  selectedNamespace: '',
  selectedAgent: '',
  additionalPath: '',
  agentProxyUrl: '',
  agentProxyUrlError: '',
}

const agentReducer = (state: AgentState, action: AgentAction): AgentState => {
  switch (action.type) {
    case 'SET_CLOUD':
      return { ...state, selectedCloud: action.payload }
    case 'SET_NAMESPACE':
      return { ...state, selectedNamespace: action.payload }
    case 'SET_AGENT':
      return { ...state, selectedAgent: action.payload }
    case 'SET_ADDITIONAL_PATH':
      return { ...state, additionalPath: action.payload }
    case 'SET_PROXY_URL':
      return { ...state, agentProxyUrl: action.payload }
    case 'SET_PROXY_URL_ERROR':
      return { ...state, agentProxyUrlError: action.payload }
    case 'RESET_NAMESPACE':
      return { ...state, selectedNamespace: '', agentProxyUrlError: '' }
    case 'RESET_AGENT':
      return { ...state, selectedAgent: '', agentProxyUrlError: '' }
    default:
      return state
  }
}

export const CreateCustomServerDialog: FC = memo(() => {
  CreateCustomServerDialog.displayName = 'CreateCustomServerDialog'

  return (
    <PopupDelegate
      type={SHOW_CREATE_CUSTOM_SERVER_DIALOG}
      render={props => <CreateCustomServerPopup {...props} />}
    />
  )
})

type ControllerRenderFunctionProps<FieldName extends keyof CreateCustomServerForm> = {
  field: ControllerRenderProps<CreateCustomServerForm, FieldName>
  fieldState: ControllerFieldState
  formState: UseFormStateReturn<CreateCustomServerForm>
}

const AGENT_PROXY_URL_TEMPLATE =
  ':baseUrl/apihub-nc/agents/:cloud/namespaces/:namespace/services/:service/proxy/:additionalPath'

const buildAgentProxyUrl = (
  baseUrl: string,
  cloud: string,
  namespace: string,
  service: string,
  additionalPath: string,
): string => {
  return generatePath(AGENT_PROXY_URL_TEMPLATE, {
    baseUrl,
    cloud,
    namespace,
    service,
    additionalPath,
  })
}

const isUrlAlreadyExist = (urls: readonly string[], url: string | undefined): boolean => {
  if (!url) return true
  return urls.includes(url.trim())
}

const CreateCustomServerPopup: FC<PopupProps> = memo<PopupProps>(({ open, setOpen }) => {
  CreateCustomServerPopup.displayName = 'CreateCustomServerPopup'

  const eventBus = useEventBus()
  const { packageId = '', versionId, apiType = DEFAULT_API_TYPE, operationId: operationKey } = useParams()
  const [packageObj] = usePackage()
  const serviceName = packageObj?.serviceName
  const packageKind = packageObj?.kind || PACKAGE_KIND
  const isServiceNameExist = !!serviceName

  // Use reducer for related state management
  const [agentState, dispatch] = useReducer(agentReducer, initialAgentState)
  const { selectedCloud, selectedNamespace, selectedAgent, additionalPath, agentProxyUrl, agentProxyUrlError } =
    agentState

  // Single state for deferred server selection
  const [pendingServerSelection, setPendingServerSelection] = useState<string | null>(null)
  const [mode, setMode] = useState<ModeType>(MODE_MANUAL)

  // Get operation data
  const { data: operationData } = useOperation({
    packageKey: packageId,
    versionKey: versionId,
    operationKey: operationKey,
    apiType: apiType as ApiType,
  })

  // Server management
  const [customServersPackageMap, setCustomServersPackageMap] = useCustomServersPackageMap()

  // API data loading
  const [agents] = useAgents()
  const [serviceNames] = useServiceNames(selectedAgent, selectedNamespace)
  const [namespaceObjects] = useNamespaces(selectedAgent)

  const clouds = useMemo(() => agents?.map(({ agentDeploymentCloud }) => agentDeploymentCloud) ?? [], [agents])

  const cloudAgentIdMap = useMemo(
    () => new Map(agents.map(({ agentId, agentDeploymentCloud }) => [agentDeploymentCloud, agentId])),
    [agents],
  )

  const namespaces = useMemo(() => namespaceObjects.map((namespace) => namespace.namespaceKey), [namespaceObjects])

  // URL processing
  const specUrls = useSpecUrls(operationData?.data)
  const customUrls = useCustomUrls(customServersPackageMap?.[packageId])
  const availableUrls = useMemo(() => [...specUrls, ...customUrls] as const, [specUrls, customUrls])

  const firstSpecPath = useFirstSpecPath(specUrls)
  const baseUrl = window.location.origin
  const isAgentMode = mode === MODE_AGENT
  const isManualMode = mode === MODE_MANUAL

  // Service validation
  const isServiceNameValid = useMemo(
    () => isServiceNameExistInNamespace(serviceNames, serviceName, selectedCloud, selectedNamespace),
    [selectedCloud, selectedNamespace, serviceName, serviceNames],
  )

  // Form setup
  const defaultFormData = useMemo<CreateCustomServerForm>(() => ({
    [KEY_CUSTOM_SERVER_URL]: '',
    [KEY_DESCRIPTION]: '',
    [KEY_CLOUD]: '',
    [KEY_NAMESPACE]: '',
    [KEY_SERVICE]: serviceName ?? '',
  }), [serviceName])

  const { handleSubmit, control, setValue, clearErrors } = useForm<CreateCustomServerForm>({
    defaultValues: defaultFormData,
    mode: 'onSubmit',
    reValidateMode: 'onSubmit',
  })

  const showSuccessNotification = useShowSuccessNotification()

  // Combined effect for agent-related updates
  useEffect(() => {
    // Update agent when cloud changes
    if (selectedCloud && cloudAgentIdMap.has(selectedCloud)) {
      dispatch({ type: 'SET_AGENT', payload: cloudAgentIdMap.get(selectedCloud) ?? '' })
    } else if (!selectedCloud) {
      dispatch({ type: 'RESET_AGENT' })
    }

    // Update proxy URL when service name exists
    if (isServiceNameExist) {
      const url = buildAgentProxyUrl(
        baseUrl,
        selectedAgent || '<cloud>',
        selectedNamespace || '<namespace>',
        serviceName,
        additionalPath,
      )
      dispatch({ type: 'SET_PROXY_URL', payload: url })
      dispatch({ type: 'SET_PROXY_URL_ERROR', payload: '' })
    }
  }, [
    selectedCloud,
    cloudAgentIdMap,
    baseUrl,
    isServiceNameExist,
    selectedAgent,
    selectedNamespace,
    serviceName,
    additionalPath,
  ])

  // Deferred event dispatch effect
  useEffect(() => {
    if (pendingServerSelection) {
      eventBus.selectCreatedCustomServer({ url: pendingServerSelection })
      setPendingServerSelection(null)
      setOpen(false)
    }
  }, [pendingServerSelection, setOpen, eventBus])

  // Form submission handler
  const addCustomServer = useCallback((formData: CreateCustomServerForm) => {
    if (!isServiceNameValid) return

    if (isAgentMode && isUrlAlreadyExist(availableUrls, agentProxyUrl)) {
      dispatch({ type: 'SET_PROXY_URL_ERROR', payload: ERROR_SERVER_URL_EXISTS })
      return
    }

    const newServer: PlaygroundCustomServer = {
      url: isManualMode ? formData[KEY_CUSTOM_SERVER_URL]!.trim() : agentProxyUrl.trim(),
      description: formData[KEY_DESCRIPTION] ?? '',
      shouldUseProxyEndpoint: !formData[KEY_CLOUD],
    }

    // Update server list
    setCustomServersPackageMap(packageId, [...customServersPackageMap?.[packageId] ?? [], newServer])
    setPendingServerSelection(newServer.url)

    showSuccessNotification?.({
      title: SUCCESS_TITLE,
      message: SUCCESS_SERVER_ADDED,
    })
  }, [
    isServiceNameValid,
    isAgentMode,
    availableUrls,
    agentProxyUrl,
    isManualMode,
    setCustomServersPackageMap,
    packageId,
    customServersPackageMap,
    showSuccessNotification,
  ])

  // Cloud selection handler
  const handleCloudChange = useCallback((value: string | null) => {
    setValue(KEY_CLOUD, value ?? '')
    dispatch({ type: 'SET_CLOUD', payload: value ?? '' })
    dispatch({ type: 'RESET_NAMESPACE' })
  }, [setValue])

  // Namespace selection handler
  const handleNamespaceChange = useCallback((value: string | null) => {
    setValue(KEY_NAMESPACE, value ?? '')
    dispatch({ type: 'SET_NAMESPACE', payload: value ?? '' })
  }, [setValue])

  // Additional path change handler
  const handleAdditionalPathChange = useCallback((value: string) => {
    dispatch({ type: 'SET_ADDITIONAL_PATH', payload: value })
  }, [])

  // Render functions - simplified without unnecessary useCallback
  const renderSelectUrl = (
    { field, fieldState }: ControllerRenderFunctionProps<typeof KEY_CUSTOM_SERVER_URL>,
  ): JSX.Element => (
    <ErrorTextField
      field={field}
      fieldState={fieldState}
      clearErrors={clearErrors}
      required
      label={LABEL_SERVER_URL}
      data-testid="ServerUrlTextField"
    />
  )

  const renderDescriptionInput = ({ field }: ControllerRenderFunctionProps<typeof KEY_DESCRIPTION>): JSX.Element => (
    <TextField
      {...field}
      label={LABEL_DESCRIPTION}
      data-testid="DescriptionTextField"
    />
  )

  const renderSelectCloud = ({ field }: ControllerRenderFunctionProps<typeof KEY_CLOUD>): JSX.Element => (
    <Autocomplete
      key="cloudAutocomplete"
      options={clouds}
      value={selectedCloud === '' ? null : selectedCloud}
      renderOption={(props, cloud) => (
        <ListItem {...props} key={cloud}>
          {cloud}
        </ListItem>
      )}
      isOptionEqualToValue={(option, value) => option === value}
      renderInput={(params) => <TextField {...field} {...params} required label={LABEL_CLOUD} />}
      onChange={(_, value) => handleCloudChange(value)}
      data-testid="CloudAutocomplete"
    />
  )

  const renderSelectNamespace = ({ field }: ControllerRenderFunctionProps<typeof KEY_NAMESPACE>): JSX.Element => (
    <Autocomplete
      key="namespaceAutocomplete"
      disabled={!selectedCloud}
      options={namespaces}
      value={selectedNamespace === '' ? null : selectedNamespace}
      // Display error icon instead of standard clear icon when duplicate extension error occurs
      clearIcon={!isServiceNameValid ? <ErrorIcon fontSize="small" color="error" /> : undefined}
      componentsProps={{
        clearIndicator: !isServiceNameValid
          ? {
            onClick: (event) => {
              event.preventDefault()
              event.stopPropagation()
            },
            title: '',
            sx: {
              cursor: 'default',
              visibility: 'visible',
            },
          }
          : undefined,
      }}
      renderInput={(params) => (
        <TextField
          {...field}
          {...params}
          required
          label={LABEL_NAMESPACE}
          error={!isServiceNameValid}
          helperText={!isServiceNameValid && ERROR_SERVICE_NOT_FOUND(serviceName!)}
        />
      )}
      onChange={(_, value) => handleNamespaceChange(value)}
      data-testid="NamespaceAutocomplete"
    />
  )

  const renderSelectService = ({ field }: ControllerRenderFunctionProps<typeof KEY_SERVICE>): JSX.Element => (
    <TextField
      {...field}
      disabled
      required
      label={LABEL_SERVICE}
      data-testid="ServiceTextField"
    />
  )

  const renderAdditionalPathInput = (
    { field }: ControllerRenderFunctionProps<typeof KEY_ADDITIONAL_PATH>,
  ): JSX.Element => (
    <TextField
      {...field}
      label={LABEL_ADDITIONAL_PATH}
      placeholder={PLACEHOLDER_ADDITIONAL_PATH}
      value={additionalPath}
      onChange={(event) => {
        field.onChange(event)
        handleAdditionalPathChange(event.target.value)
      }}
      data-testid="AdditionalPathTextField"
    />
  )

  return (
    <DialogForm
      open={open}
      onClose={() => setOpen(false)}
      onSubmit={handleSubmit(addCustomServer)}
    >
      <DialogTitle display="flex" gap={1} alignItems="center">
        <>
          Add Custom Server
          {!isServiceNameExist && (
            <Tooltip
              title={TOOLTIP_CUSTOM_SERVER_ONLY(packageKind)}
              placement="right"
            >
              <InfoContextIcon fontSize="extra-small" color="action" />
            </Tooltip>
          )}
        </>
      </DialogTitle>

      <DialogContent>
        {isServiceNameExist && (
          <FormControl component="fieldset">
            <RadioGroup
              value={mode}
              onChange={(event) => setMode(event.target.value as ModeType)}
            >
              <FormControlLabel value={MODE_MANUAL} control={<Radio size="small" />} label="Add Custom Server URL" />
              <FormControlLabel value={MODE_AGENT} control={<Radio />} label="Use Agent Proxy" />
            </RadioGroup>
          </FormControl>
        )}

        {isAgentMode && (
          <>
            <ServerUrlDisplay serverUrl={agentProxyUrl} errorMessage={agentProxyUrlError} />
            <Controller name={KEY_CLOUD} control={control} render={renderSelectCloud} />
            <Controller name={KEY_NAMESPACE} control={control} render={renderSelectNamespace} />
            <Controller name={KEY_SERVICE} control={control} render={renderSelectService} />
            <Controller name={KEY_ADDITIONAL_PATH} control={control} render={renderAdditionalPathInput} />
          </>
        )}

        {isManualMode && (
          <Controller
            name={KEY_CUSTOM_SERVER_URL}
            rules={{
              required: ERROR_REQUIRED_FIELD,
              validate: customServerUrl => {
                if (!isAbsoluteHttpUrl(customServerUrl)) {
                  return ERROR_ABSOLUTE_URL_REQUIRED
                }
                if (isUrlAlreadyExist(availableUrls, customServerUrl)) {
                  return ERROR_SERVER_URL_EXISTS
                }
                return true
              },
            }}
            control={control}
            render={renderSelectUrl}
          />
        )}

        <Controller name={KEY_DESCRIPTION} control={control} render={renderDescriptionInput} />

        {!!firstSpecPath && <SpecPathWarningAlert path={firstSpecPath} />}
      </DialogContent>

      <DialogActions>
        <Button
          variant="contained"
          type="submit"
          disabled={isAgentMode ? !selectedNamespace : false}
          data-testid="AddButton"
        >
          Add
        </Button>
        <Button
          variant="outlined"
          onClick={() => setOpen(false)}
          data-testid="CancelButton"
        >
          Cancel
        </Button>
      </DialogActions>
    </DialogForm>
  )
})
