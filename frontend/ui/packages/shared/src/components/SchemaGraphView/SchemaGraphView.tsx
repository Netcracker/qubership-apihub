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
import { memo, useEffect, useMemo, useRef } from 'react'
import Box from '@mui/material/Box'
import '@netcracker/qubership-apihub-class-view/class-view.css'
import type { DomainObject, Point, SelectableObject, SelectionChangeData, Shape } from '@netcracker/qubership-apihub-class-view'
import {
  ClassViewComponent,
  EVENT_SELECTION_CHANGE,
  EVENT_VIEWPORT_CENTER_CHANGE,
  EVENT_ZOOM_CHANGE,
  PROPERTY_TYPE_LEAF,
  SHAPE_RECTANGLE,
  SHAPE_ROUND_RECTANGLE,
} from '@netcracker/qubership-apihub-class-view'
import { useMemoSubscription } from './useMemoSubscription'
import type { VisitorNavigationDetails } from './oasToClassDiagramService'
import { schemaHashWithTitle, transformOasToEffectiveClassDiagram } from './oasToClassDiagramService'
import type { OpenAPIV3 } from 'openapi-types'
import type { SchemaClass } from './schema-graph-content'
import { isSchema, SCHEMA_TYPE, type SchemaGraphContent, type SchemaGraphMeta } from './schema-graph-content'
import { CONTENT_PLACEHOLDER_AREA, Placeholder } from '../Placeholder'
import { isEmpty } from '../../utils/arrays'

export type ViewPortCenter = [number, number]

export const FIT_TO_SCREEN_ACTION = 'fit-to-screen'
export type Action = {
  type: typeof FIT_TO_SCREEN_ACTION
}

export type GraphViewPort = {
  coordinates: [number, number]
  zoom: number
}

export type NavigationState = VisitorNavigationDetails & {
  viewPort: GraphViewPort | null
}

export type SchemaGraphViewProps = {
  data?: object
  navigationState?: NavigationState
  onSelectionChange: (value?: SelectableObject<SchemaGraphMeta>) => void
  onViewPortChange: (viewPortCenter: ViewPortCenter) => void
  onZoomChange: (zoom: number) => void
  onNavigationToEmptyContent?: (isEmpty: boolean) => void
  selectedObject?: SelectableObject<SchemaGraphMeta> | null
  zoom?: number
  action?: Action
}

// Uses PURE annotation to tree-shake this on build (memo component will be ignored on tree-shaking by default)
export const SchemaGraphView: FC<SchemaGraphViewProps> = /* @__PURE__ */ memo<SchemaGraphViewProps>(({
  data = {},
  navigationState,
  selectedObject = null,
  zoom,
  action,
  onSelectionChange,
  onViewPortChange,
  onZoomChange,
  onNavigationToEmptyContent,
}) => {
  const viewContainerRef = useRef<HTMLDivElement | null>(null)

  const view = useMemo(() => {
    const component = createClassViewComponent()
    component.classShapeFunction = selectClassShape

    return component
  }, [])

  useMemoSubscription<SelectableObject<SchemaGraphMeta>, typeof EVENT_SELECTION_CHANGE>(view, EVENT_SELECTION_CHANGE, onSelectionChange, getSelectedObject, isSelectionCancel)
  useMemoSubscription<number, typeof EVENT_ZOOM_CHANGE>(view, EVENT_ZOOM_CHANGE, onZoomChange, getEventValue)
  useMemoSubscription<[number, number], typeof EVENT_VIEWPORT_CENTER_CHANGE>(view, EVENT_VIEWPORT_CENTER_CHANGE, onViewPortChange, getViewPortCoordinates)

  const [content, objectsMap, isEmptyContent] = useGraphContentFactory(navigationState, data)

  useEffect(() => {
    if (!viewContainerRef.current) {
      return
    }

    if (!isEmptyContent) {
      viewContainerRef.current?.appendChild(view)
    }
  }, [view, isEmptyContent, viewContainerRef])

  useEffect(() => {
    if (view) {
      //need set empty content also because previous graph will flash when next set other (not-empty) graph
      view.animationDuration = ANIMATION_DURATION_ZERO
      view.content = content
      onNavigationToEmptyContent?.(isEmptyContent)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content, view])

  useEffect(() => {
    if (isEmptyContent || !navigationState) {
      return
    }

    const matchedClass = getMatchedClass(objectsMap, navigationState)

    //graph will fit automatically if content is new
    if (matchedClass) {
      view.animationDuration = ANIMATION_DURATION_MORPH
      view.navigateTo([matchedClass])
    } else if (navigationState.viewPort) {
      view.animationDuration = ANIMATION_DURATION_MORPH
      view.viewportCenter = {
        x: navigationState.viewPort.coordinates[0],
        y: navigationState.viewPort.coordinates[1],
      }
      view.zoom = navigationState.viewPort.zoom

      onZoomChange(navigationState.viewPort.zoom)
      onViewPortChange(navigationState.viewPort.coordinates)
    }

    if (matchedClass) {
      view.selectedObjects = [matchedClass]
    } else {
      view.selectedObjects = []
    }
    onSelectionChange(matchedClass)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, navigationState])

  useEffect(() => {
    view.selectedObjects = selectedObject ? [selectedObject] : []
  }, [selectedObject, view])

  useEffect(() => {
    if (zoom && view.zoom !== zoom) {
      view.zoom = zoom
    }
  }, [view, zoom])

  useEffect(() => {
    if (!view) {
      return
    }

    if (action?.type === FIT_TO_SCREEN_ACTION) {
      view.navigateTo(Object.values(objectsMap))
    }
    // Intentionally suppressed, because it shouldn't depend on objectsMap
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, action])

  return !isEmptyContent
    ? <Box ref={viewContainerRef}/>
    : (
      <Placeholder
        invisible={false}
        area={CONTENT_PLACEHOLDER_AREA}
        message="No models to show"
      />
    )
})

function useGraphContentFactory(
  navigationState?: NavigationState,
  data?: object,
): [SchemaGraphContent, Record<string, DomainObject<SchemaGraphMeta>>, boolean] {
  const contentKey = useMemo(
    () => (navigationState && data ? navigationState.scopeDeclarationPath.join('/') : null),
    [data, navigationState],
  )

  return useMemo(() => {
    const { data: openApiDocument } = data as { data: OpenAPIV3.Document }
    const classDiagramObjects = navigationState?.scopeDeclarationPath.length
      ? transformOasToEffectiveClassDiagram(openApiDocument, navigationState)
      : EMPTY_CONTENT

    const objectsMap = resolveGraphObjectsMap(classDiagramObjects)
    return [
      classDiagramObjects,
      objectsMap,
      isEmpty(Object.values(objectsMap)),
    ]
    // Should recalc content only on change contentKey
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentKey])
}

function createClassViewComponent(): ClassViewComponent<SchemaGraphMeta> {
  const component = new ClassViewComponent<SchemaGraphMeta>()
  component.style.position = 'absolute'
  component.style.top = '0'
  component.style.left = '0'
  component.style.right = '0'
  component.style.bottom = '0'
  component.style.fontFamily = 'Inter, sans-serif'

  return component
}

function hasSchema(value: DomainObject): boolean {
  const domainValue = value as DomainObject<SchemaGraphMeta>
  switch (domainValue.kind) {
    case PROPERTY_TYPE_LEAF:
      return !!domainValue.schemaObject
    case SCHEMA_TYPE:
      return domainValue.sharedSchemaObjects.length > 0 || domainValue.sameHashObjects.length > 0
    default:
      return false
  }
}

function isClass(value: DomainObject): value is SchemaGraphMeta['class'] {
  return !!(value as SchemaGraphMeta['class'])?.isClass
}

function selectClassShape(object: DomainObject): Shape {
  return isClass(object)
    ? SHAPE_ROUND_RECTANGLE
    : SHAPE_RECTANGLE
}

function getSelectedObject(event: CustomEvent<SelectionChangeData<SchemaGraphMeta>>): SelectableObject<SchemaGraphMeta> {
  const { newValue: [selectedObject] } = event.detail
  return selectedObject
}

function isSelectionCancel(event: CustomEvent<SelectionChangeData<SchemaGraphMeta>>): boolean {
  const selectedObject = getSelectedObject(event)
  return selectedObject && !hasSchema(selectedObject)
}

function getViewPortCoordinates(event: CustomEvent<Point<number>>): ViewPortCenter {
  return [event.detail.x, event.detail.y]
}

function getEventValue<T>(event: CustomEvent<T>): T {
  return event.detail
}

function resolveGraphObjectsMap({ classes }: SchemaGraphContent): Record<string, DomainObject<SchemaGraphMeta>> {
  const classesMap = Object.fromEntries<DomainObject<SchemaGraphMeta>>(
    classes?.map((object) => [object.key ?? '', object]) ?? [],
  )

  return { ...classesMap }
}

const EMPTY_CONTENT = {
  classes: [],
  relations: [],
}

const ANIMATION_DURATION_ZERO = 0
const ANIMATION_DURATION_MORPH = 350

function getMatchedClass(objectsMap: Record<string, DomainObject<SchemaGraphMeta>>, navigationState: NavigationState): SchemaClass | undefined {
  const {
    schemaTolerantHashWithTitle,
    navigationFailedCallback,
  } = navigationState

  const matchedObjects = Object.values(objectsMap)
    .filter(isSchema)
    .filter(
      ({ sharedSchemaObjects }) =>
        sharedSchemaObjects.some(schema => schemaHashWithTitle(schema) === schemaTolerantHashWithTitle),
    )

  if (matchedObjects.length === 0) {
    navigationFailedCallback?.(NavigationFailReason.NO_MATCHED_NODES)
    return
  }
  if (matchedObjects.length > 1) {
    navigationFailedCallback?.(NavigationFailReason.MULTIPLE_MATCHED_NODES)
    return
  }

  const [matchedObject] = matchedObjects
  return matchedObject
}

export enum NavigationFailReason {
  NO_MATCHED_NODES = 'no_matched_nodes',
  MULTIPLE_MATCHED_NODES = 'multiple_matched_nodes',
}
