import { Box, ThemeProvider } from '@mui/material'
import { Box as BoxMosaic, Flex, Icon, Panel, useThemeIsDark } from '@stoplight/mosaic'
import { IHttpOperation } from '@stoplight/types'
import { Request as HarRequest } from 'har-format'
import { FC, useEffect, useState } from 'react'
import { useEvent } from 'react-use'

import { HttpMethodColors } from '../../constants'
import { useCombinedServers, useProcessedCustomServers, useProcessedSpecServers } from '../../hooks/useServerProcessing'
import { useServerSelection } from '../../hooks/useServerSelection'
import { useTextRequestResponseBodyState } from '../../hooks/useTextRequestBodyState'
import { useTransformDocumentToNode } from '../../hooks/useTransformDocumentToNode'
import { theme } from '../../themes/theme'
import { IServer } from '../../utils/http-spec/IServer'
import { ButtonWithHint } from '../ButtonWithHint'
import { SELECT_CREATED_CUSTOM_SERVER } from '../events'
import { NonIdealState } from '../NonIdealState'
import { TryItAuth } from './Auth/Auth'
import { usePersistedSecuritySchemeWithValues } from './Auth/authentication-utils'
import { FormDataBody } from './Body/FormDataBody'
import { useBodyParameterState } from './Body/request-body-utils'
import { RequestBody } from './Body/RequestBody'
import { buildFetchRequest, buildHarRequest } from './build-request'
import { getMockData } from './Mocking/mocking-utils'
import { useMockingOptions } from './Mocking/useMockingOptions'
import { OperationParameters } from './Parameters/OperationParameters'
import { useRequestParameters } from './Parameters/useOperationParameters'
import {
  ErrorState,
  getResponseType,
  NetworkError,
  ResponseError,
  ResponseState,
  TryItResponse,
} from './Response/Response'
import { ServersDropdown } from './ServersDropdown'

export interface PlaygroundProps {
  document: string

  /**
   * The base URL of the prism mock server to redirect traffic to.
   *
   * While non-prism based mocks may work to some limited extent, they might not understand the Prefer header as prism does.
   *
   * When a mockUrl is provided, a button to enable mocking via TryIt will be shown
   */
  mockUrl?: string

  /**
   * Callback to retrieve the current request in a HAR format.
   * Called whenever the request was changed in any way. Changing `httpOperation`, user entering parameter values, etc.
   */
  onRequestChange?: (currentRequest: HarRequest) => void
  requestBodyIndex?: number
  /**
   * True when TryIt is embedded in Markdown doc
   */
  embeddedInMd?: boolean

  /**
   * Fetch credentials policy for TryIt component
   * For more information: https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API
   * @default "omit"
   */
  tryItCredentialsPolicy?: 'omit' | 'include' | 'same-origin'
  corsProxy?: string
  customServers?: IServer[]
  origin: string
}

export const Playground: FC<PlaygroundProps> = (props) => {
  Playground.displayName = 'Playground'

  const httpOperation = useTransformDocumentToNode(props.document)

  if (!httpOperation) {
    return (
      <Flex justify="center" alignItems="center" w="full" minH="screen">
        <NonIdealState
          title="Failed to parse OpenAPI file"
          description="Please make sure your OpenAPI file is valid and try again"
        />
      </Flex>
    )
  }

  return <PlaygroundContent {...props} httpOperation={httpOperation} />
}

const PlaygroundContent: FC<PlaygroundProps & { httpOperation: IHttpOperation }> = ({
  httpOperation,
  mockUrl,
  onRequestChange,
  requestBodyIndex,
  embeddedInMd = false,
  tryItCredentialsPolicy,
  corsProxy,
  customServers,
  origin,
}) => {
  Playground.displayName = 'Playground'
  const isDark = useThemeIsDark()

  const [response, setResponse] = useState<ResponseState | ErrorState | undefined>()
  const [, setRequestData] = useState<HarRequest | undefined>()

  const [loading, setLoading] = useState<boolean>(false)
  const [validateParameters, setValidateParameters] = useState<boolean>(false)

  const mediaTypeContent = httpOperation.request?.body?.contents?.[requestBodyIndex ?? 0]

  const { allParameters, updateParameterValue, parameterValuesWithDefaults } = useRequestParameters(httpOperation)
  const [mockingOptions] = useMockingOptions()

  const [bodyParameterValues, setBodyParameterValues, isAllowedEmptyValues, setAllowedEmptyValues, formDataState] =
    useBodyParameterState(mediaTypeContent)

  const [textRequestBody, setTextRequestBody] = useTextRequestResponseBodyState({
    mediaTypeContent: mediaTypeContent,
    skipReadOnly: true,
    skipWriteOnly: false,
  })

  const [operationAuthValue, setOperationAuthValue] = usePersistedSecuritySchemeWithValues()

  const processedSpecServers = useProcessedSpecServers(httpOperation.servers)
  const processedCustomServers = useProcessedCustomServers(customServers)
  const servers = useCombinedServers(processedSpecServers, processedCustomServers, mockUrl)

  const { chosenServer, selectServer } = useServerSelection(servers)
  const isMockingEnabled = mockUrl && chosenServer?.url === mockUrl

  useEvent(SELECT_CREATED_CUSTOM_SERVER, (event: CustomEvent<{ url: string }>) => {
    selectServer(event.detail.url)
  })

  const hasRequiredButEmptyParameters = allParameters.some(
    parameter => parameter.required && !parameterValuesWithDefaults[parameter.name],
  )

  const getValues = () =>
    Object.keys(bodyParameterValues)
      .filter(param => !isAllowedEmptyValues[param] ?? true)
      .reduce((previousValue, currentValue) => {
        previousValue[currentValue] = bodyParameterValues[currentValue]
        return previousValue
      }, {} as typeof bodyParameterValues)

  useEffect(() => {
    let isMounted = true
    if (onRequestChange || embeddedInMd) {
      buildHarRequest({
        mediaTypeContent,
        parameterValues: parameterValuesWithDefaults,
        httpOperation: httpOperation,
        bodyInput: formDataState.isFormDataBody ? getValues() : textRequestBody,
        auth: operationAuthValue,
        ...(isMockingEnabled && { mockData: getMockData(mockUrl, httpOperation, mockingOptions) }),
        chosenServer,
        corsProxy,
        origin,
      }).then(request => {
        if (isMounted) {
          if (onRequestChange) {
            onRequestChange(request)
          }
          if (embeddedInMd) {
            setRequestData(request)
          }
        }
      })
    }
    return () => {
      isMounted = false
    }
    // disabling because we don't want to react on `onRequestChange` change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    httpOperation,
    parameterValuesWithDefaults,
    formDataState.isFormDataBody,
    bodyParameterValues,
    isAllowedEmptyValues,
    textRequestBody,
    operationAuthValue,
    mockingOptions,
    chosenServer,
    corsProxy,
    embeddedInMd,
  ])

  const handleSendRequest = async () => {
    setValidateParameters(true)

    if (!chosenServer || hasRequiredButEmptyParameters) {
      return
    }

    try {
      setLoading(true)
      const mockData = isMockingEnabled ? getMockData(mockUrl, httpOperation, mockingOptions) : undefined
      const request = await buildFetchRequest({
        parameterValues: parameterValuesWithDefaults,
        httpOperation: httpOperation,
        mediaTypeContent,
        bodyInput: formDataState.isFormDataBody ? getValues() : textRequestBody,
        mockData,
        origin,
        auth: operationAuthValue,
        chosenServer,
        credentials: tryItCredentialsPolicy,
        corsProxy,
      })
      let response: Response | undefined
      try {
        response = await fetch(...request)
      } catch (e) {
        setResponse({ error: new NetworkError(e instanceof Error ? e.message : String(e)) })
      }
      if (response) {
        const contentType = response.headers.get('Content-Type')
        const type = contentType ? getResponseType(contentType) : undefined

        setResponse({
          status: response.status,
          bodyText: type !== 'image' ? await response.text() : undefined,
          blob: type === 'image' ? await response.blob() : undefined,
          contentType,
        })
      }
    } catch (e) {
      setResponse({ error: e instanceof Error ? e : new Error(String(e)) })
    } finally {
      setLoading(false)
    }
  }

  const isOnlySendButton = !httpOperation.security?.length && !allParameters.length && !formDataState.isFormDataBody
    && !mediaTypeContent

  const tryItPanelContents = (
    <>
      <Panel.Content className="SendButtonHolder" mt={0} pt={!isOnlySendButton && !embeddedInMd ? 0 : undefined}>
        {validateParameters && hasRequiredButEmptyParameters && (
          <BoxMosaic mt={4} color="danger-light" fontSize="sm">
            <Icon icon={['fas', 'exclamation-triangle']} className="sl-mr-1" />
            You didn't provide all of the required parameters!
          </BoxMosaic>
        )}
      </Panel.Content>
      {httpOperation.security?.length
        ? (
          <TryItAuth
            onChange={setOperationAuthValue}
            operationSecurityScheme={httpOperation.security ?? []}
            value={operationAuthValue}
          />
        )
        : null}

      {allParameters.length > 0 && (
        <OperationParameters
          parameters={allParameters}
          values={parameterValuesWithDefaults}
          onChangeValue={updateParameterValue}
          validate={validateParameters}
        />
      )}

      {formDataState.isFormDataBody
        ? (
          <FormDataBody
            specification={formDataState.bodySpecification}
            values={bodyParameterValues}
            onChangeValues={setBodyParameterValues}
            onChangeParameterAllow={setAllowedEmptyValues}
            isAllowedEmptyValues={isAllowedEmptyValues}
          />
        )
        : mediaTypeContent
        ? (
          <RequestBody
            examples={mediaTypeContent.examples ?? []}
            requestBody={textRequestBody}
            onChange={setTextRequestBody}
          />
        )
        : null}
    </>
  )

  let tryItPanelElem

  // when TryIt is embedded, we need to show extra context at the top about the method + path
  if (embeddedInMd) {
    tryItPanelElem = (
      <Panel isCollapsible={false} p={0} className="TryItPanel">
        <Panel.Titlebar bg="canvas-300" className="Titlebar">
          <BoxMosaic
            fontWeight="bold"
            color={!isDark ? HttpMethodColors[httpOperation.method as keyof typeof HttpMethodColors] : undefined}
          >
            {httpOperation.method.toUpperCase()}
          </BoxMosaic>
          <BoxMosaic fontWeight="medium" ml={2} textOverflow="truncate" overflowX="hidden">
            {`${chosenServer?.url || ''}${httpOperation.path}`}
          </BoxMosaic>
        </Panel.Titlebar>

        {tryItPanelContents}
      </Panel>
    )
  } else {
    tryItPanelElem = (
      <BoxMosaic className="TryItPanel" bg="canvas-100" rounded="lg">
        {tryItPanelContents}
      </BoxMosaic>
    )
  }

  return (
    <ThemeProvider theme={theme}>
      <Box
        style={{
          display: 'grid',
          gridTemplateRows: 'auto 1fr',
          gridTemplateAreas: `
          'dropdown'
          'content'
        `,
          marginLeft: '8px',
          marginTop: '16px',
        }}
      >
        <Box
          display="grid"
          gridTemplateColumns="auto 50px"
          gap={1}
          alignItems="center"
        >
          <ServersDropdown servers={servers} operationPath={httpOperation.path} />
          <ButtonWithHint
            title="Send"
            hint={!chosenServer ? 'Please add a server' : ''}
            variant="contained"
            isLoading={loading}
            disabled={!chosenServer}
            onClick={handleSendRequest}
            sx={{
              minWidth: '50px',
              width: '100%',
            }}
            data-testid="SendButton"
          />
        </Box>
        {/*300px - height above content in portal, fix after migration to monaco*/}
        <Box overflow="auto" height="calc(100vh - 300px)">
          {tryItPanelElem}
          {response && !('error' in response) && <TryItResponse response={response} />}
          {response && 'error' in response && <ResponseError state={response} />}
        </Box>
      </Box>
    </ThemeProvider>
  )
}
