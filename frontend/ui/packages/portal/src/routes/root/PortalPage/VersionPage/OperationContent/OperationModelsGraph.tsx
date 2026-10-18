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
import { Box } from '@mui/material'
import {
  useOperationNavigationDetails,
  useOperationPathViewPort,
  useSetOperationPathViewPort,
} from '../../../OperationNavigationDataProvider'
import type { SelectableObject } from '@netcracker/qubership-apihub-class-view'
import type { SchemaGraphMeta } from '@netcracker/qubership-apihub-ui-shared/components/SchemaGraphView/schema-graph-content'
import {
  isNamedObject,
  isProperty,
  isSchema,
} from '@netcracker/qubership-apihub-ui-shared/components/SchemaGraphView/schema-graph-content'
import type { OperationData } from '@netcracker/qubership-apihub-ui-shared/entities/operations'
import type { Action, NavigationState, ViewPortCenter } from '@netcracker/qubership-apihub-ui-shared/components/SchemaGraphView'
import { FIT_TO_SCREEN_ACTION, SchemaGraphView } from '@netcracker/qubership-apihub-ui-shared/components/SchemaGraphView'
import { CONTEXT_PANEL_DEFAULT_WIDTH, SchemaContextPanel } from '@apihub/components/SchemaContextPanel'
import { ZoomPanel } from '@netcracker/qubership-apihub-ui-shared/components/ZoomPanel'
import { ResizableSidebar } from '@netcracker/qubership-apihub-ui-shared/components/ResizableSidebar'
import { LoadingIndicator } from '@netcracker/qubership-apihub-ui-shared/components/LoadingIndicator'
import { NAVIGATION_MAX_WIDTH } from '@netcracker/qubership-apihub-ui-shared/utils/page-layouts'
import type { OpenAPIV3 } from 'openapi-types'
import { VISITOR_FLAG_INLINE_REFS } from '@netcracker/qubership-apihub-ui-shared/components/SchemaGraphView/visitor-utils'
import { isEmpty } from '@netcracker/qubership-apihub-ui-shared/utils/arrays'

export type OperationModelsGraphProps = {
  operationData: OperationData | null | undefined
  onSelect: (isSelected: boolean) => void
  hideContextPanel: boolean
}

// High Order Component
export const OperationModelsGraph: FC<OperationModelsGraphProps> = memo<OperationModelsGraphProps>((props) => {
  const { operationData = {}, onSelect, hideContextPanel } = props

  const [selectedData, setSelectedData] = useState<SelectableObject<SchemaGraphMeta> | null | undefined>(null)
  const [navigationDetails] = useOperationNavigationDetails()
  const setModelViewPort = useSetOperationPathViewPort()
  const modelViewPort = useOperationPathViewPort()

  const [zoom, setZoom] = useState<number>(modelViewPort?.zoom ?? DEFAULT_ZOOM)
  const [viewPort, setViewPort] = useState<[number, number]>(modelViewPort?.coordinates ?? DEFAULT_COORDINATES)

  const [emptyModelsContent, setEmptyModelsContent] = useState<boolean>(false)

  const navigationState: NavigationState | undefined = useMemo(
    () => (navigationDetails
      ? {
        ...navigationDetails,
        viewPort: modelViewPort,
      }
      : undefined
    ),
    // should calc only on change path for navigation
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [navigationDetails],
  )

  const onZoomChange = useCallback((zoom: number) => {
    setZoom(zoom)
  }, [])

  const onViewPortChange = useCallback((center: ViewPortCenter) => {
    setViewPort(center)
  }, [])

  useEffect(() => {
    setModelViewPort({
      zoom: zoom,
      coordinates: viewPort,
    })
    // Intentionally suppressed
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoom, viewPort])

  useEffect(() => {
    if (hideContextPanel) {
      setSelectedData(null)
    }
  }, [hideContextPanel])

  const onSelectionChange = useCallback((value?: SelectableObject<SchemaGraphMeta> | null) => {
    setSelectedData(value)
    onSelect(!!value)
  }, [onSelect])

  const selectedSchema: OpenAPIV3.SchemaObject | undefined = useMemo(() => {
    if (!selectedData) {
      return undefined
    }
    if (isProperty(selectedData)) {
      return selectedData.schemaObject
    }
    if (isSchema(selectedData)) {
      return selectedData.sharedSchemaObjects.length > 0
        ? selectedData.sharedSchemaObjects.find(matchesWithName(selectedData.name))
        : selectedData.sameHashObjects[0]
    }
  }, [selectedData])

  const [contextPanelWidth, setContextPanelWidth] = useState<number>(CONTEXT_PANEL_DEFAULT_WIDTH)

  const [action, setAction] = useState<Action>()

  const element = (
    <>
      <Box position="absolute" top="0" left="0" right="0" bottom="0" data-testid="GraphView">
        <SchemaGraphView
          data={operationData!}
          navigationState={navigationState}
          zoom={zoom}
          onZoomChange={onZoomChange}
          onViewPortChange={onViewPortChange}
          onSelectionChange={onSelectionChange}
          onNavigationToEmptyContent={setEmptyModelsContent}
          selectedObject={selectedData}
          action={action}
        />
        {!emptyModelsContent && (
          <Box display="inline-block" position="absolute" bottom="32px" right={`${contextPanelWidth + 16}px`}>
            <ZoomPanel
              value={zoom}
              specificOptions={ZOOM_OPTIONS}
              onChange={onZoomChange}
              onFitToScreen={() => setAction({ type: FIT_TO_SCREEN_ACTION })}
            />
          </Box>
        )}
      </Box>
      {!emptyModelsContent && operationData && (
        <ResizableSidebar
          open={!!selectedData}
          defaultWidth={CONTEXT_PANEL_DEFAULT_WIDTH}
          maxWidth={CONTEXT_PANEL_MAX_WIDTH}
          onChange={setContextPanelWidth}
        >
          <SchemaContextPanel
            contextSchema={selectedSchema}
            onClose={() => onSelectionChange(null)}
            title={selectedData && isNamedObject(selectedData) ? selectedData.name : undefined}
          />
        </ResizableSidebar>
      )}
    </>
  )

  return (
    <Box position="absolute" top="0" left="0" right="0" bottom="0">
      {navigationState ? element : <LoadingIndicator />}
    </Box>
  )
})

const ZOOM_OPTIONS = [1.0, 0.85, 0.5, 0.25, 0.05]

const DEFAULT_ZOOM = 1.0

const DEFAULT_COORDINATES: [number, number] = [0, 0]

const CONTEXT_PANEL_MAX_WIDTH = NAVIGATION_MAX_WIDTH

function matchesWithName(name: string) {
  return (schema: OpenAPIV3.SchemaObject) => {
    if (schema.title) {
      return schema.title === name
    }
    const schemaAsRecord = schema as Record<PropertyKey, unknown>
    const [firstRef, ...rest]: string[] = schemaAsRecord[VISITOR_FLAG_INLINE_REFS] as string[] ?? []
    if (isEmpty(rest)) {
      return firstRef.endsWith(`/${name}`)
    }
    return false
  }
}
