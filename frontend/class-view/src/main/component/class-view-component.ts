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

import './class-view-component.css'
import { registerWebComponent } from './web-component-registration'
import { DefaultDomainMeta, DomainMeta, PropertyObject } from 'main/domain/object/meta'
import {
  ClassViewApi,
  EVENT_LAYOUT_FINISH,
  EVENT_LAYOUT_START,
  EVENT_SELECTION_CHANGE,
  EVENT_UPDATE_FINISH,
  EVENT_UPDATE_START,
  EVENT_VIEWPORT_CENTER_CHANGE,
  EVENT_ZOOM_CHANGE,
  NavigableObject,
  NavigateOptions,
  RichHTMLElementEventMap,
  SelectableObject,
  SelectionChangeData,
} from 'main/component/class-view-api'
import { ContentObject } from 'main/domain/object/content'
import { SimpleChangeableValue } from 'main/core/changeable-value'
import { ConvertResult, LikeConverter, resolveLikes, resolveObjects } from 'main/like/like-converter'
import { DeferredNavigate as LikeDeferredNavigate, GraphView } from 'main/graph/graph-view'
import { DomainLike, SelectableLike } from 'main/domain/like/all'
import { Duration, Optional, OptionalMembers, Pixel, Point, Zoom } from 'main/domain/base'
import { DEFAULT_ANIMATION_DURATION, DEFAULT_VIEWPORT_CENTER, DEFAULT_ZOOM } from 'main/defaults'
import { ClassObject } from 'main/domain/object/class'
import {
  DeferredNavigate as ObjectDeferredNavigate,
  DeferredOperationsManager,
} from 'main/component/deferred-operation'
import { isDefine } from 'main/core/utils'
import { FontObserver } from 'main/component/font-observer'

export class ClassViewComponent<Meta extends DomainMeta = DefaultDomainMeta> extends window.HTMLElement implements ClassViewApi<Meta> {

  private readonly _converter: LikeConverter<Meta>
  private readonly _selectedObjects: SimpleChangeableValue<SelectableObject<Meta>[]>
  private readonly _contentObject: SimpleChangeableValue<ContentObject<Meta>>
  private readonly _zoom: SimpleChangeableValue<Zoom>
  private readonly _viewportCenter: SimpleChangeableValue<Point<Pixel>>
  private readonly _deferredOperationsManager: DeferredOperationsManager<Meta>
  private _animationDuration: Duration
  private _embedLock: boolean
  private _graphView$: Optional<Promise<GraphView>>
  private _updateScheduled = false
  private _forceSync = false
  private _likeConvertResult: ConvertResult<Meta>

  constructor() {
    super()
    this.setAttribute('class', 'class-view')
    this._converter = new LikeConverter<Meta>(this.internalInvalidate.bind(this))
    this._contentObject = new SimpleChangeableValue({})
    this._likeConvertResult = this._converter.convert(this._contentObject.value)
    this._deferredOperationsManager = new DeferredOperationsManager<Meta>(this.internalInvalidate.bind(this))
    this._selectedObjects = new SimpleChangeableValue([])
    this._zoom = new SimpleChangeableValue(DEFAULT_ZOOM)
    this._viewportCenter = new SimpleChangeableValue(DEFAULT_VIEWPORT_CENTER)
    this._embedLock = true
    this._animationDuration = DEFAULT_ANIMATION_DURATION
  }

  connectedCallback() {
    this._embedLock = false
    //preload
    this.invalidate()
  }

  disconnectedCallback() {
    this._embedLock = true
  }

  public invalidate(): void {
    this.internalInvalidate(true)
  }

  private internalInvalidate(force = false): void {
    if (this._embedLock) {
      return
    }
    if (this._updateScheduled) {
      return
    }
    this._updateScheduled = true
    setTimeout(async () => {
      try {
        this.dispatchEvent(new CustomEvent(EVENT_UPDATE_START))
        await this.applyChanges(force)
      } catch (e) {
        console.error(e)
      } finally {
        this._updateScheduled = false
        this.dispatchEvent(new CustomEvent(EVENT_UPDATE_FINISH))
      }
    }, 0/* next frame*/)

  }

  private graphView$(): Promise<GraphView> {
    if (isDefine(this._graphView$)) {
      return this._graphView$
    }
    return this._graphView$ = this.createGraphView()
  }

  private async applyChanges(force: boolean): Promise<void> {
    const graphView = await this.graphView$()
    let graphChanged = false
    if (force || this._contentObject.dirty || this._converter.dirty) {
      const oldSelection = resolveLikes(this._likeConvertResult, this._selectedObjects.lastAppliedValue)
      this._likeConvertResult = this._converter.convert(this._contentObject.value)
      graphView.graphSource = this._likeConvertResult.content
      this._contentObject.valueApplied()
      this._converter.valueApplied()
      if (!this._selectedObjects.dirty) { // maybe user already change
        const newSelection = this.refillByKey(oldSelection)
        this._selectedObjects.changeValue(resolveObjects(this._likeConvertResult, newSelection))
      }
      graphChanged = true
    }
    if (this._selectedObjects.dirty || graphChanged || this._forceSync) {
      graphView.selection = resolveLikes(this._likeConvertResult, this.selectedObjects)
      this._selectedObjects.valueApplied()
    }
    if (this._zoom.dirty || this._forceSync) {
      graphView.zoom = this._zoom.value
      this._zoom.valueApplied()
    }
    if (this._viewportCenter.dirty || this._forceSync) {
      graphView.viewportCenter = this._viewportCenter.value
      this._viewportCenter.valueApplied()
    }
    if (this._deferredOperationsManager.dirty) {
      const { deferredOperations } = this._deferredOperationsManager
      graphView.deferredOperations = {
        navigate: isDefine(deferredOperations.navigate) ? this.convertDeferredNavigate(deferredOperations.navigate) : undefined,
      }
    }
    if (graphView.dirty) {
      await graphView.applyChanges({ animationDuration: this.animationDuration })
    }
    if (this._deferredOperationsManager.dirty) {
      //cause it apply only after layout and we should ignore another deferred requests
      this._deferredOperationsManager.applyChanges()
    }
    if (this.isSomethingDirty(graphView)) {
      await this.applyChanges(false)
    }
    this._forceSync = false
  }

  private async createGraphView(): Promise<GraphView> {
    await new FontObserver(this).load()
    const { GraphView } = await import('main/graph/graph-view')
    const graphView = new GraphView(
      this,
      {
        layoutStart: this.layoutStart.bind(this),
        layoutFinish: this.layoutFinish.bind(this),
        selectionChange: this.userSelectionChange.bind(this),
        zoomChange: this.userZoomChange.bind(this),
        viewportCenterChange: this.userViewportCenterChange.bind(this),
      })
    // some API was available only on next frame after embed
    return new Promise(resolve => {
      setTimeout(() => resolve(graphView), 0)
    })
  }

  private isSomethingDirty(graphView: GraphView): boolean {
    return this._contentObject.dirty
      || this._converter.dirty
      || this._selectedObjects.dirty
      || this._zoom.dirty
      || this._viewportCenter.dirty
      || this._deferredOperationsManager.dirty
      || graphView.dirty
  }

  private layoutStart(): void {
    this.dispatchEvent(new CustomEvent<void>(EVENT_LAYOUT_START))
  }

  private layoutFinish(): void {
    this.dispatchEvent(new CustomEvent<void>(EVENT_LAYOUT_FINISH))
  }

  private userSelectionChange(selection: SelectableLike[]): void {
    const newSelection = resolveObjects(this._likeConvertResult, selection)
    if (this._selectedObjects.changeValue(newSelection)) {
      const applied = this.dispatchEvent(new CustomEvent<SelectionChangeData<Meta>>(EVENT_SELECTION_CHANGE, {
        detail: { oldValue: [...this._selectedObjects.lastAppliedValue], newValue: [...newSelection] },
        cancelable: true,
      }))
      if (!applied) {
        this._selectedObjects.cancel()
      }
      this._forceSync = true
      this.internalInvalidate()
    }
  }

  private userZoomChange(zoom: Zoom): void {
    if (this._zoom.changeValue(zoom)) {
      const applied = this.dispatchEvent(new CustomEvent<Zoom>(EVENT_ZOOM_CHANGE, {
        detail: zoom,
        cancelable: true,
      }))
      if (!applied) {
        this._zoom.cancel()
      }
      this._forceSync = true
      this.internalInvalidate()
    }
  }

  private userViewportCenterChange(center: Point<Pixel>): void {
    if (this._viewportCenter.changeValue(center)) {
      const applied = this.dispatchEvent(new CustomEvent<Point<Pixel>>(EVENT_VIEWPORT_CENTER_CHANGE, {
        detail: { ...center },
        cancelable: true,
      }))
      if (!applied) {
        this._viewportCenter.cancel()
      }
      this._forceSync = true
      this.internalInvalidate()
    }
  }

  get content(): ContentObject<Meta> {
    return this._contentObject.value
  }

  set content(content: ContentObject<Meta>) {
    if (this._contentObject.changeValue(content)) {
      this.internalInvalidate()
    }
  }

  get selectedObjects(): SelectableObject<Meta>[] {
    return this._selectedObjects.value || []
  }

  set selectedObjects(selectedObjects: SelectableObject<Meta>[]) {
    if (this._selectedObjects.changeValue(selectedObjects)) {
      this.internalInvalidate()
    }
  }

  get viewportCenter(): Point<Pixel> {
    return this._viewportCenter.value
  }

  set viewportCenter(center: Point<Pixel>) {
    if (this._viewportCenter.changeValue(center)) {
      this.internalInvalidate()
    }
  }

  get zoom(): Zoom {
    return this._zoom.value
  }

  set zoom(zoom: Zoom) {
    if (this._zoom.changeValue(zoom)) {
      this.internalInvalidate()
    }
  }

  get animationDuration(): Duration {
    return this._animationDuration
  }

  set animationDuration(durationMs: Duration) {
    this._animationDuration = durationMs
    //doesn't trigger internalInvalidate cause it will affect only next morph
  }

  navigateTo(objects: NavigableObject<Meta>[], options?: OptionalMembers<NavigateOptions>): void {
    this._deferredOperationsManager.scheduleNavigateTo(objects, options ?? {})
  }

  get classShapeFunction(): (cl: Meta['class']) => ClassObject<PropertyObject<Meta>>['shape'] {
    return this._converter.classRectangleCornerRadiusFunction
  }

  set classShapeFunction(f: (cl: Meta['class']) => ClassObject<PropertyObject<Meta>>['shape']) {
    this._converter.classRectangleCornerRadiusFunction = f
  }

  /* eslint-disable  @typescript-eslint/no-explicit-any*/
  public addEventListener<K extends keyof RichHTMLElementEventMap<Meta>>(type: K, listener: (this: HTMLElement, ev: RichHTMLElementEventMap<Meta>[K]) => any, options?: boolean | AddEventListenerOptions): void {
    /* eslint-disable @typescript-eslint/ban-ts-comment */ // @ts-ignore
    super.addEventListener(type, listener, options)
  }

  /* eslint-disable  @typescript-eslint/no-explicit-any*/
  public removeEventListener<K extends keyof RichHTMLElementEventMap<Meta>>(type: K, listener: (this: HTMLElement, ev: RichHTMLElementEventMap<Meta>[K]) => any, options?: boolean | EventListenerOptions): void {
    /* eslint-disable @typescript-eslint/ban-ts-comment */ // @ts-ignore
    super.removeEventListener(type, listener, options)
  }

  private refillByKey(oldSelection: DomainLike[]): DomainLike[] {
    const selectedKeys = new Set(oldSelection.map(value => value.key))
    return this._likeConvertResult.likes
      .filter(like => selectedKeys.has(like.key))
  }

  private convertDeferredNavigate(navigate: ObjectDeferredNavigate<Meta>): LikeDeferredNavigate {
    return {
      objects: resolveLikes(this._likeConvertResult, navigate.objects),
      options: navigate.options,
    }
  }
}

registerWebComponent('class-view', ClassViewComponent)