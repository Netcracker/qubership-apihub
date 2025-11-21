import { buildOpenApiDiffCause, JsonSchemaDiffViewer, JsonSchemaViewer } from '@netcracker/qubership-apihub-api-doc-viewer'
import { useOperationSchemaOptionsMode } from '@stoplight/elements'
import { Flex, VStack } from '@stoplight/mosaic'
import { IHttpOperationRequestBody } from '@stoplight/types'
import { DiffBlock, DiffContainer, isDiff } from 'diff-block'
import * as React from 'react'
import { useCallback, useEffect, useState } from 'react'

import { isDiffRename } from '@netcracker/qubership-apihub-api-diff'
import { Description } from '@stoplight/diff-elements-core/components/Docs/HttpOperation/Description'
import { useAggregatedDiffsMetaKey } from '@stoplight/elements/containers/AggregatedDiffsMetaKeyContext'
import { useChangeSeverityFilters } from '@stoplight/elements/containers/ChangeSeverityFiltersContext'
import { useDiffsMetaKey } from '@stoplight/elements/containers/DiffsMetaKeyContext'
import { SectionSubtitle } from '../Sections'

export type DiffBodyProps = {
  body: IHttpOperationRequestBody;
  onChange: (requestBodyIndex: number) => void;
}

export const isBodyEmpty = (body?: DiffBodyProps['body']) => {
  if (!body) return true

  const { contents = [], description } = body

  return contents.length === 0 && !description?.trim()
}

export const Body = ({ body, onChange }: DiffBodyProps) => {
  const diffsMetaKey = useDiffsMetaKey()
  const aggregatedDiffsMetaKey = useAggregatedDiffsMetaKey()

  const diffMetaKeys = React.useMemo(() => ({
    diffsMetaKey: diffsMetaKey,
    aggregatedDiffsMetaKey: aggregatedDiffsMetaKey,
  }), [diffsMetaKey, aggregatedDiffsMetaKey])

  const [chosenContent, setChosenContent] = useState(0)

  useEffect(() => {
    onChange(chosenContent)
    // disabling because we don't want to react on `onChange` change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chosenContent])

  const { schemaViewMode, defaultSchemaDepth, notSplitSchemaViewer } = useOperationSchemaOptionsMode()

  const filters = useChangeSeverityFilters()

  const { contents = [] } = body
  const bodyContent = contents[chosenContent]
  const schema = bodyContent?.schema

  const [wholeContentDiff, setWholeContentDiff] = useState<any>(undefined)

  useEffect(() => {
    // Re-mapping diff meta for whole removed body
    if (schema && wholeContentDiff === undefined) {
      let wholeContentDiff = undefined
      // when whole body was removed
      if (diffsMetaKey in body) {
        wholeContentDiff = body[diffsMetaKey]
      }
      if (diffsMetaKey in bodyContent) {
        // when whole schema was removed from body's media type
        if ('schema' in bodyContent[diffsMetaKey]) {
          wholeContentDiff = bodyContent[diffsMetaKey].schema
        } else if (isDiff(bodyContent[diffsMetaKey])) {
          const diff = bodyContent[diffsMetaKey]
          // todo temporarily disregard rename change in order to show deeper changes
          if (!isDiffRename(diff)) {
            // when whole media type was removed from body
            wholeContentDiff = bodyContent[diffsMetaKey]
          }
        }
      }
      if (wholeContentDiff) {
        setWholeContentDiff(wholeContentDiff)
      }
    }
  }, [body, bodyContent, diffsMetaKey, schema, wholeContentDiff])

  const renderJSV = useCallback(() => {
    if (!schema) {
      return null
    }

    if (wholeContentDiff) {
      const diffCause = buildOpenApiDiffCause(wholeContentDiff)
      return (
        <DiffContainer>
          <DiffBlock
            id="JSV.Body"
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
  }, [defaultSchemaDepth, diffsMetaKey, filters, notSplitSchemaViewer, schema, schemaViewMode, wholeContentDiff])

  if (isBodyEmpty(body)) {
    return null
  }

  return (
    <VStack spacing={6}>
      <DiffContainer>
        <>
          <SectionSubtitle title="Body" id="request-body">
            {contents.length > 0 && (
              <Flex flex={1} justify="end">
                <select
                  aria-label="Request Body Content Type"
                  value={String(chosenContent)}
                  style={{ background: 'white' }}
                  onChange={event => {
                    setWholeContentDiff(undefined)
                    setChosenContent(parseInt(String(event.target.value), 10))
                  }}
                  className="sl-menu-adapter"
                >
                  {contents.map((content, index) => (
                    <option key={index} value={index} style={{ background: 'white' }}>
                      {content.mediaType}
                    </option>
                  ))}
                </select>
              </Flex>
            )}
          </SectionSubtitle>

          <Description
            id={`HttpOperation__Request_Body_Description`}
            data={body as any}
          />
        </>
      </DiffContainer>

      {renderJSV()}
    </VStack>
  )
}
Body.displayName = 'HttpOperation.Body'
