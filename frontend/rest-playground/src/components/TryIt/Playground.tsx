import { Box, Button, Flex, Icon, Panel, useThemeIsDark } from '@stoplight/mosaic'
import { Request as HarRequest } from 'har-format'
import { useAtom } from 'jotai'
import * as React from 'react'
import { HttpMethodColors } from '../../constants'
import { getServersToDisplay, IServer } from '../../utils/http-spec/IServer'
import { chosenServerAtom } from '.'
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
import { ServersDropdown } from './Servers/ServersDropdown'
import { NonIdealState } from '../NonIdealState'
import { isEmpty } from 'lodash'
import { isValidUrl } from '../../utils/urls'
import { useTransformDocumentToNode } from '../../hooks/useTransformDocumentToNode'
import { useTextRequestResponseBodyState } from '../../hooks/useTextRequestBodyState'

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
  token: string
  origin: string
}

const defaultServers: IServer[] = []

export const Playground: React.FC<PlaygroundProps> = ({
  document = '',
  mockUrl,
  onRequestChange,
  requestBodyIndex,
  embeddedInMd = false,
  tryItCredentialsPolicy,
  corsProxy,
  customServers,
  token,
  origin,
}) => {
  Playground.displayName = 'Playground'
  const isDark = useThemeIsDark()

  const httpOperation = useTransformDocumentToNode(document)

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

  const [response, setResponse] = React.useState<ResponseState | ErrorState | undefined>()
  const [, setRequestData] = React.useState<HarRequest | undefined>()

  const [loading, setLoading] = React.useState<boolean>(false)
  const [validateParameters, setValidateParameters] = React.useState<boolean>(false)

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

  const httpOperationServers = httpOperation.servers

  const servers = React.useMemo(() => {
    const getFormattedUrls = (url: string, variables: Record<string, { enum?: string[], default?: string }>) => {
      const enumVariables = Object.entries(variables || {})
        .filter(([_, variable]) => Array.isArray(variable.enum))
        .map(([key, variable]) => ({ key, values: variable.enum! }))

      if (enumVariables.length === 0) {
        return [url]
      }

      const combinations = enumVariables.reduce<{ [key: string]: string }[]>((acc, { key, values }) => {
        return acc.flatMap(combination =>
          values.map(value => ({ ...combination, [key]: value }))
        )
      }, [{}])

      return combinations.map(combination => {
        let formattedUrl = url
        for (const [key, value] of Object.entries(combination)) {
          formattedUrl = formattedUrl.replace(`{${key}}`, value)
        }
        return formattedUrl
      })
    }

    const isAbsoluteURL = (url: string) => url.indexOf('://') > 0 || url.startsWith('//')

    const prepareCustomServers = (server: IServer) => {
      let customServerProxyUrl = server?.url ? server.url.replace(/\/$/, '') : ''
      return [{
        url: customServerProxyUrl,
        description: server?.description,
        custom: true,
        shouldUseProxyEndpoint: isAbsoluteURL(server.url),
      }]
    }

    const preparedCustomServers = customServers?.flatMap(server =>
      prepareCustomServers(server)
    ) ?? []

    const httpServersWithEnum = httpOperationServers?.flatMap(httpServer => {
      if (httpServer?.variables) {
        const formattedUrls = getFormattedUrls(httpServer.url, httpServer.variables)
        return formattedUrls.map(formattedUrl => ({
          ...httpServer,
          url: formattedUrl,
        }))
      }
      return [httpServer]
    }) ?? []

    const originalServers = customServers?.length
      ? [...preparedCustomServers, ...httpServersWithEnum]
      : httpServersWithEnum

    return getServersToDisplay(originalServers || defaultServers, mockUrl)
  }, [httpOperationServers, mockUrl, customServers])

  const firstServer = servers[0] || null
  const [chosenServer, setChosenServer] = useAtom(chosenServerAtom)
  const isMockingEnabled = mockUrl && chosenServer?.url === mockUrl

  const hasRequiredButEmptyParameters = allParameters.some(
    parameter => parameter.required && !parameterValuesWithDefaults[parameter.name],
  )

  const getValues = () =>
    Object.keys(bodyParameterValues)
      .filter(param => !isAllowedEmptyValues[param] ?? true)
      .reduce((previousValue, currentValue) => {
        previousValue[currentValue] = bodyParameterValues[currentValue]
        return previousValue
      }, {})

  React.useEffect(() => {
    const currentUrl = chosenServer?.url

    // simple attempt to preserve / sync up active server if the URLs are the same between re-renders / navigation
    const exists = currentUrl && servers.find(s => s.url === currentUrl)
    if (!exists) {
      setChosenServer(firstServer)
    } else if (exists !== chosenServer) {
      setChosenServer(exists)
    }
  }, [servers, firstServer, chosenServer, setChosenServer])

  React.useEffect(() => {
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

    if (hasRequiredButEmptyParameters) {
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
        token,
        origin,
        auth: operationAuthValue,
        chosenServer,
        credentials: tryItCredentialsPolicy,
        corsProxy,
      })
      let response: Response | undefined
      try {
        response = await fetch(...request)
      } catch (e: any) {
        setResponse({ error: new NetworkError(e.message) })
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
    } catch (e: any) {
      setResponse({ error: e })
    } finally {
      setLoading(false)
    }
  }

  const isOnlySendButton =
    !httpOperation.security?.length && !allParameters.length && !formDataState.isFormDataBody && !mediaTypeContent

  const tryItPanelContents = (
    <>
      <Panel.Content className="SendButtonHolder" mt={0} pt={!isOnlySendButton && !embeddedInMd ? 0 : undefined}>
        {validateParameters && hasRequiredButEmptyParameters && (
          <Box mt={4} color="danger-light" fontSize="sm">
            <Icon icon={['fas', 'exclamation-triangle']} className="sl-mr-1" />
            You didn't provide all of the required parameters!
          </Box>
        )}
      </Panel.Content>
      <Box style={{ overflow: 'scroll', height: '100%' }}>
        {httpOperation.security?.length ? (
          <TryItAuth
            onChange={setOperationAuthValue}
            operationSecurityScheme={httpOperation.security ?? []}
            value={operationAuthValue}
          />
        ) : null}

        {allParameters.length > 0 && (
          <OperationParameters
            parameters={allParameters}
            values={parameterValuesWithDefaults}
            onChangeValue={updateParameterValue}
            validate={validateParameters}
          />
        )}

        {formDataState.isFormDataBody ? (
          <FormDataBody
            specification={formDataState.bodySpecification}
            values={bodyParameterValues}
            onChangeValues={setBodyParameterValues}
            onChangeParameterAllow={setAllowedEmptyValues}
            isAllowedEmptyValues={isAllowedEmptyValues}
          />
        ) : mediaTypeContent ? (
          <RequestBody
            examples={mediaTypeContent.examples ?? []}
            requestBody={textRequestBody}
            onChange={setTextRequestBody}
          />
        ) : null}
      </Box>
    </>
  )

  let tryItPanelElem

  // when TryIt is embedded, we need to show extra context at the top about the method + path
  if (embeddedInMd) {
    tryItPanelElem = (
      <Panel isCollapsible={false} p={0} className="TryItPanel">
        <Panel.Titlebar bg="canvas-300" className="Titlebar">
          <Box fontWeight="bold" color={!isDark ? HttpMethodColors[httpOperation.method] : undefined}>
            {httpOperation.method.toUpperCase()}
          </Box>
          <Box fontWeight="medium" ml={2} textOverflow="truncate" overflowX="hidden">
            {`${chosenServer?.url || ''}${httpOperation.path}`}
          </Box>
        </Panel.Titlebar>

        {tryItPanelContents}
      </Panel>
    )
  } else {
    tryItPanelElem = (
      <Box className="TryItPanel" bg="canvas-100" rounded="lg">
        {tryItPanelContents}
      </Box>
    )
  }

  return (
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
      <div
        style={{
          gridArea: 'dropdown',
          display: 'grid',
          gridTemplateColumns: 'auto 50px',
          gap: '8px',
          alignItems: 'center',
        }}
      >
        <ServersDropdown servers={servers} />
        <Button
          appearance="primary"
          loading={loading}
          disabled={loading}
          onPress={handleSendRequest}
          size="sm"
          className="sl-button custom"
        >
          Send
        </Button>
      </div>
      {/*300px - height above content in portal, fix after migration to monaco*/}
      <Box style={{ gridArea: 'content', overflow: 'scroll', height: 'calc(100vh - 300px)' }}>
        {tryItPanelElem}
        {response && !('error' in response) && <TryItResponse response={response} />}
        {response && 'error' in response && <ResponseError state={response} />}
      </Box>
    </Box>
  )
}
