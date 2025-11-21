import { buildOpenApiDiffCause, JsonSchemaDiffViewer, JsonSchemaViewer } from '@netcracker/qubership-apihub-api-doc-viewer'
import { mirrorSelfDiffMetaKey } from '@netcracker/qubership-apihub-http-spec/oas3WithMeta'
import { Extension, ExtensionMeta } from '@stoplight/diff-elements-core/components/Docs/Extensions'
import { ExtensionsDiff } from '@stoplight/diff-elements-core/components/Docs/ExtensionsDiff'
import { useOperationSchemaOptionsMode } from '@stoplight/elements'
import { Box, Flex, IntentVals, Tab, TabList, TabPanel, TabPanels, Tabs, VStack } from '@stoplight/mosaic'
import { IHttpHeaderParam, IHttpOperation, IHttpOperationResponse } from '@stoplight/types'
import { DiffBlock, DiffContainer, extractAmountOfDiffs, isDiff, selfDiffMetaKey, WithDiffMetaKey } from 'diff-block'
import { atom, useAtom } from 'jotai'
import { isEmpty, keys, sortBy, uniqBy } from 'lodash'
import * as React from 'react'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { isDiffRename } from '@netcracker/qubership-apihub-api-diff'
import { Description } from '@stoplight/diff-elements-core/components/Docs/HttpOperation/Description'
import { isObject } from '@stoplight/diff-elements-core/utils/guards'
import { useAggregatedDiffsMetaKey } from '@stoplight/elements/containers/AggregatedDiffsMetaKeyContext'
import { useChangeSeverityFilters } from '@stoplight/elements/containers/ChangeSeverityFiltersContext'
import { useDiffsMetaKey } from '@stoplight/elements/containers/DiffsMetaKeyContext'
import { SectionSubtitle, SectionTitle } from '../Sections'
import { Parameters } from './Parameters'

interface ResponseCodeItemProps {
  response: IHttpOperationResponse;
  action?: string;
}

interface ResponseProps {
  response: IHttpOperationResponse;
  extensions: Extension[];
  extensionsMeta: ExtensionMeta;

  onMediaTypeChange(mediaType: string): void;
}

interface ResponsesProps {
  operation: IHttpOperation;
  extensions: Extension[];
  extensionsMeta: ExtensionMeta;

  onMediaTypeChange(mediaType: string): void;

  onStatusCodeChange(statusCode: string): void;
}

const activeResponseIdAtom = atom('')

export const Responses = (props: ResponsesProps) => {
  const {
    operation,
    onStatusCodeChange,
    onMediaTypeChange,
    extensions,
    extensionsMeta,
  } = props

  const diffsMetaKey = useDiffsMetaKey()

  const responses = useResponsesWithParentDiffMeta(operation as WithDiffMetaKey<IHttpOperation>)

  const [activeResponseId, setActiveResponseId] = useAtom(activeResponseIdAtom)

  useEffect(() => {
    setActiveResponseId(responses[0]?.code ?? '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    onStatusCodeChange(activeResponseId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeResponseId])

  if (!responses.length) {
    return null
  }

  return (
    <VStack spacing={8} as={Tabs} selectedId={activeResponseId} onChange={setActiveResponseId} appearance="pill">
      <DiffContainer>
        <SectionTitle title="Responses">
          <TabList density="compact">
            {responses.map(response => {
              const changesSummary = extractAmountOfDiffs(response, diffsMetaKey)
              // changed something inside content
              const summaryAction =
                keys(changesSummary).some(changeType => changesSummary?.[changeType] > 0)
                  ? 'replace'
                  : undefined
              // changed response code
              const selfAction = response?.[selfDiffMetaKey]?.action

              // changed CONTENT media type
              let contentMediaTypeAction: unknown = null
              const contentMediaTypes = response.contents ?? []
              for (const contentMediaType of contentMediaTypes) {
                const contentMediaTypeDiffMeta = contentMediaType[diffsMetaKey]
                if (isObject(contentMediaTypeDiffMeta)) {
                  if (contentMediaTypeAction === null) {
                    contentMediaTypeAction = contentMediaTypeDiffMeta.action
                  } else {
                    contentMediaTypeAction = 'replace'
                    break
                  }
                }
              }

              // changed HEADERS
              let headersAction: unknown = null
              const headers = response.headers ?? []
              for (const header of headers) {
                const headerSelfDiffMetaKey = Reflect.ownKeys(header)
                  .find(key => (
                    typeof key === 'symbol' &&
                    key.toString() === selfDiffMetaKey.toString()
                  ))
                if (!headerSelfDiffMetaKey) { continue }

                const headerSelfDiffMeta = header[headerSelfDiffMetaKey]
                if (isObject(headerSelfDiffMeta)) {
                  if (headersAction === null) {
                    headersAction = headerSelfDiffMeta.action
                  } else {
                    headersAction = 'replace'
                    break
                  }
                }
              }

              // calculate resulting diff action type
              const action = selfAction || headersAction || contentMediaTypeAction || summaryAction

              return (
                <Tab key={response.code} id={response.code} intent={codeToIntentVal(response.code)}>
                  <Box p={1}>
                    <ResponseCodeItem response={response} action={action} />
                  </Box>
                </Tab>
              )
            })}
          </TabList>
        </SectionTitle>
      </DiffContainer>

      <TabPanels p={0}>
        {responses.map(response => {
          const key = `HttpOperation__Response_${response.code}`
          return (
            <TabPanel key={response.code} id={response.code}>
              <Response
                key={key}
                response={response}
                onMediaTypeChange={onMediaTypeChange}
                extensions={extensions}
                extensionsMeta={extensionsMeta}
              />
            </TabPanel>
          )
        })}
      </TabPanels>
    </VStack>
  )
}

const ACTION_COLORS: Record<'add' | 'remove', string> = {
  add: 'rgb(107, 206, 112)',
  remove: 'rgb(237, 74, 84)',
}

const ResponseCodeItem = ({ response, action }: ResponseCodeItemProps) => {
  return (
    <Box>
      {response.code}
      {action && (
        <div
          className={action ? 'border-diff-circle' : ''}
          style={{ backgroundColor: ACTION_COLORS[action] ?? 'rgb(255, 176, 46)' }}
        ></div>
      )}
    </Box>
  )
}

Responses.displayName = 'HttpOperation.Responses'

const Response = ({ response, onMediaTypeChange, extensions, extensionsMeta }: ResponseProps) => {
  const diffsMetaKey = useDiffsMetaKey()
  const aggregatedDiffsMetaKey = useAggregatedDiffsMetaKey()
  const diffMetaKeys = React.useMemo(() => ({
    diffsMetaKey: diffsMetaKey,
    aggregatedDiffsMetaKey: aggregatedDiffsMetaKey,
  }), [diffsMetaKey, aggregatedDiffsMetaKey])

  const { contents = [], headers = [] } = response
  const [chosenContent, setChosenContent] = useState(0)

  const responseContent = contents[chosenContent]
  const schema = responseContent?.schema

  const [wholeContentDiff, setWholeContentDiff] = useState<any>(undefined)

  useEffect(() => {
    // Re-mapping diff meta for whole removed response
    if (schema && wholeContentDiff === undefined) {
      let wholeContentDiff = undefined
      // when whole response code was removed
      if (selfDiffMetaKey in response) {
        wholeContentDiff = response[selfDiffMetaKey]
      }
      if (diffsMetaKey in responseContent) {
        // when whole schema was removed from response body's media type
        if ('schema' in responseContent[diffsMetaKey]) {
          wholeContentDiff = responseContent[diffsMetaKey].schema
        } else if (isDiff(responseContent[diffsMetaKey])) {
          const diff = responseContent[diffsMetaKey]
          // todo temporarily disregard rename change in order to show deeper changes
          if (!isDiffRename(diff)) {
            // when whole media type was removed from response body
            wholeContentDiff = responseContent[diffsMetaKey]
          }
        }
      }
      if (wholeContentDiff) {
        setWholeContentDiff(wholeContentDiff)
      }
    }
  }, [diffsMetaKey, response, responseContent, schema, wholeContentDiff])

  useEffect(() => {
    responseContent && onMediaTypeChange(responseContent.mediaType)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [responseContent])

  const headersWithMeta = useHeadersWithResponseSelfDiffMeta(headers, response)

  const { schemaViewMode, defaultSchemaDepth, notSplitSchemaViewer } = useOperationSchemaOptionsMode()

  const filters = useChangeSeverityFilters()

  const renderJSV = useCallback(() => {
    if (!schema) {
      return null
    }

    if (schema && wholeContentDiff) {
      const diffCause = buildOpenApiDiffCause(wholeContentDiff)
      return (
        <DiffContainer>
          <DiffBlock
            id="JSV.ResponseBody"
            type={wholeContentDiff.type}
            action={wholeContentDiff.action}
            cause={diffCause}
          >
            <JsonSchemaViewer
              schema={schema}
              displayMode={schemaViewMode}
              expandedDepth={defaultSchemaDepth}
              overriddenKind="parameters"
            />
          </DiffBlock>
        </DiffContainer>
      )
    }

    return (
      <JsonSchemaDiffViewer
        schema={schema}
        displayMode={schemaViewMode}
        expandedDepth={defaultSchemaDepth}
        overriddenKind="parameters"
        // diffs specific
        layoutMode={notSplitSchemaViewer ? 'document' : 'side-by-side-diffs'}
        filters={filters}
        metaKeys={diffMetaKeys}
      />
    )
  }, [defaultSchemaDepth, diffMetaKeys, filters, notSplitSchemaViewer, schema, schemaViewMode, wholeContentDiff, aggregatedDiffsMetaKey])

  return (
    <VStack spacing={8} pt={8}>
      <DiffContainer>
        <Description
          id={`HttpOperation__Response_${response.code}_Description`}
          data={response as WithDiffMetaKey<IHttpOperationResponse>}
        />
      </DiffContainer>

      {!isEmpty(extensions) && (
        <DiffContainer>
          <ExtensionsDiff idPrefix={'HttpOperation__Response_Extensions'} value={extensions} meta={extensionsMeta} />
        </DiffContainer>
      )}

      {headersWithMeta.length > 0 && (
        <VStack spacing={5}>
          <DiffContainer>
            <SectionSubtitle title="Headers" id="response-headers" />
          </DiffContainer>
          <Parameters
            parameterType="header"
            // @ts-expect-error // Original type definitions != real types
            parameters={headersWithMeta}
          />
        </VStack>
      )}

      {contents.length > 0 && (
        <>
          <DiffContainer>
            <SectionSubtitle title="Body" id="response-body">
              <Flex pos="relative" flex={1} justify="end">
                <select
                  aria-label="Response Body Content Type"
                  value={String(chosenContent)}
                  onChange={e => {
                    setWholeContentDiff(undefined)
                    setChosenContent(parseInt(String(e.target.value), 10))
                  }}
                  className="sl-menu-adapter"
                  style={{ backgroundColor: 'white' }}
                >
                  {contents.map((content, index) => (
                    <option key={index} value={index}>
                      {content.mediaType}
                    </option>
                  ))}
                </select>
              </Flex>
            </SectionSubtitle>
          </DiffContainer>

          {renderJSV()}
        </>
      )}
    </VStack>
  )
}
Response.displayName = 'HttpOperation.Response'

const codeToIntentVal = (code: string): IntentVals => {
  const firstChar = code.charAt(0)

  switch (firstChar) {
    case '2':
      return 'success'
    case '4':
      return 'warning'
    case '5':
      return 'danger'
    default:
      return 'default'
  }
}

// TODO: Seems it should be reorganized like other metas (see combineDiffmeta)
function useResponsesWithParentDiffMeta(
  operation: WithDiffMetaKey<IHttpOperation>,
): WithDiffMetaKey<IHttpOperationResponse>[] {
  const responsesWithDiffMeta: WithDiffMetaKey<IHttpOperationResponse>[] = useMemo(
    () => operation.responses as WithDiffMetaKey<IHttpOperationResponse>[],
    [operation],
  )

  responsesWithDiffMeta.forEach(response => {
    response[mirrorSelfDiffMetaKey] && (response[selfDiffMetaKey] = response[mirrorSelfDiffMetaKey])
    Reflect.deleteProperty(response, mirrorSelfDiffMetaKey)
  })

  return sortBy(
    uniqBy(responsesWithDiffMeta, r => r.code),
    r => r.code,
  )
}

function useHeadersWithResponseSelfDiffMeta(
  headerParams: IHttpHeaderParam[],
  response: IHttpOperationResponse,
): WithDiffMetaKey<IHttpHeaderParam>[] {
  return useMemo(() => {
    if (isObject(response[selfDiffMetaKey])) {
      for (const headerParam of headerParams) {
        headerParam[selfDiffMetaKey] = response[selfDiffMetaKey]
      }
    }

    return headerParams
  }, [headerParams, response]) as WithDiffMetaKey<IHttpHeaderParam>[]
}
