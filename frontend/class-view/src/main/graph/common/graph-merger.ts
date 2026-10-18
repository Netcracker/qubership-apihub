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

import {
  CreateApplier,
  GraphItem,
  GraphMerger,
  GraphMergerSession,
  GraphMeta,
  MergeResult,
  ModificationAppliers,
  RemoveApplier,
  UpdateApplier,
} from 'main/graph/common/graph-definition'
import { Optional } from 'main/domain/base'
import { isDefine } from 'main/core/utils'

export type Comparator<Key> = (one: Key, another: Key) => number

export class GraphMergerImpl<Meta extends GraphMeta> implements GraphMerger<Meta> {

  constructor(private readonly _comparator: Comparator<Meta['key']>) {}

  private _graph: Optional<Meta['graph']>

  createEditSession(source: Meta['graph'] | MergeResult<Meta>): GraphMergerSession<Meta> {
    if (source instanceof MergeResultImpl) {
      return new GraphMergerSessionImpl<Meta>(this._comparator, this._graph!, source)
    } else {
      const graph = source as Meta['graph']
      this._graph = graph
      return new GraphMergerSessionImpl<Meta>(this._comparator, graph)
    }
  }
}

class GraphMergerSessionImpl<Meta extends GraphMeta> implements GraphMergerSession<Meta> {

  private readonly _currentItemIndexByKey: Map<Meta['key'],
    Association<NodeInfo<Meta, unknown>, Meta['node']>
    | Association<EdgeInfo<Meta, unknown>, Meta['edge']>
    | Association<PortInfo<Meta, unknown>, Meta['port']>
    | Association<LabelInfo<Meta, unknown>, Meta['label']>>

  private readonly _nodeMerger: NodeMerger<Meta>
  private readonly _portMerger: PortMerger<Meta>
  private readonly _edgeMerger: EdgeMerger<Meta>
  private readonly _labelMerger: LabelMerger<Meta>

  constructor(
    comparator: Comparator<Meta['key']>,
    graph: Meta['graph'],
    previousMergeResult?: Optional<MergeResultImpl<Meta>>,
  ) {
    const isNewGraph = !isDefine(previousMergeResult)

    const previousItemIndexByKey: Map<Meta['key'],
      Association<NodeInfo<Meta, unknown>, Meta['node']>
      | Association<EdgeInfo<Meta, unknown>, Meta['edge']>
      | Association<PortInfo<Meta, unknown>, Meta['port']>
      | Association<LabelInfo<Meta, unknown>, Meta['label']>> = isNewGraph
      ? new Map()
      : previousMergeResult.itemIndexByKey

    this._currentItemIndexByKey = new Map()

    this._nodeMerger = new NodeMerger(comparator, graph, previousItemIndexByKey, this._currentItemIndexByKey)
    this._portMerger = new PortMerger(comparator, graph, previousItemIndexByKey, this._currentItemIndexByKey, this._nodeMerger)
    this._edgeMerger = new EdgeMerger(comparator, graph, previousItemIndexByKey, this._currentItemIndexByKey, this._nodeMerger, this._portMerger)
    this._labelMerger = new LabelMerger(comparator, graph, previousItemIndexByKey, this._currentItemIndexByKey, this._nodeMerger, this._portMerger, this._edgeMerger)
  }

  node(
    userObject: unknown,
    key: Meta['key'],
    modificationAppliers?: Optional<ModificationAppliers<Meta['graph'], Meta['node'], unknown>>,
  ): void {
    this._nodeMerger.register(
      key,
      userObject,
      modificationAppliers?.createApplier,
      modificationAppliers?.updateApplier,
      modificationAppliers?.removeApplier,
    )
  }

  port(
    userObject: unknown,
    key: Meta['key'],
    ownerKey: Meta['key'],
    modificationAppliers?: Optional<ModificationAppliers<Meta['graph'], Meta['port'], unknown>>,
  ): void {
    this._portMerger.register(
      key,
      userObject,
      ownerKey,
      modificationAppliers?.createApplier,
      modificationAppliers?.updateApplier,
      modificationAppliers?.removeApplier,
    )
  }

  edge(
    userObject: unknown,
    key: Meta['key'],
    sourceKey: Meta['key'],
    targetKey: Meta['key'],
    modificationAppliers?: Optional<ModificationAppliers<Meta['graph'], Meta['edge'], unknown>>,
  ): void {
    this._edgeMerger.register(
      key,
      userObject,
      sourceKey, targetKey,
      modificationAppliers?.createApplier,
      modificationAppliers?.updateApplier,
      modificationAppliers?.removeApplier,
    )
  }

  label(
    userObject: unknown,
    key: Meta['key'],
    ownerKey: Meta['key'],
    labelText: string,
    modificationAppliers?: Optional<ModificationAppliers<Meta['graph'], Meta['label'], unknown>>,
  ): void {
    this._labelMerger.register(
      key,
      userObject,
      ownerKey,
      labelText,
      modificationAppliers?.createApplier,
      modificationAppliers?.updateApplier,
      modificationAppliers?.removeApplier,
    )
  }

  commit(): MergeResult<Meta> {
    const mergers = [
      this._nodeMerger,
      this._portMerger,
      this._edgeMerger,
      this._labelMerger,
    ]

    const reversedMergers = [...mergers].reverse()

    mergers.forEach(merger => merger.commitConstructiveChanges())
    reversedMergers.forEach(merger => merger.commitDestructiveChanges())

    reversedMergers.forEach(merger => merger.processDestructiveChanges())
    mergers.forEach(merger => merger.processConstructiveChanges())

    return new MergeResultImpl(this._currentItemIndexByKey)
  }

}

class MergeResultImpl<Meta extends GraphMeta> implements MergeResult<Meta> {

  constructor(
    readonly itemIndexByKey: Map<Meta['key'],
      Association<NodeInfo<Meta, unknown>, Meta['node']>
      | Association<EdgeInfo<Meta, unknown>, Meta['edge']>
      | Association<PortInfo<Meta, unknown>, Meta['port']>
      | Association<LabelInfo<Meta, unknown>, Meta['label']>>,
  ) {

  }

  resolveItem(key: Meta['key']): Optional<GraphItem<Meta>> {
    return this.itemIndexByKey.get(key)?.item
  }
}

interface Merger {
  commitConstructiveChanges(): void

  commitDestructiveChanges(): void

  processConstructiveChanges(): void

  processDestructiveChanges(): void
}

abstract class AbstractItemInfo<Meta extends GraphMeta, UserObject, Item> {

  protected constructor(
    public readonly key: Meta['key'],
    public readonly userObject: UserObject,
    public readonly createApplier: Optional<CreateApplier<Meta['graph'], Item, UserObject>>,
    public readonly updateApplier: Optional<UpdateApplier<Meta['graph'], Item, UserObject>>,
    public readonly removeApplier: Optional<RemoveApplier<Meta['graph'], Item, UserObject>>,
  ) {}

  applyCreate(
    graph: Meta['graph'],
    item: Item,
  ): void {
    this.createApplier?.(graph, item, this.userObject)
  }

  applyUpdate(
    graph: Meta['graph'],
    item: Item,
    oldUserObject: UserObject,
  ): void {
    this.updateApplier?.(graph, item, this.userObject, oldUserObject)
  }

  applyRemove(
    graph: Meta['graph'],
    item: Item,
  ): void {
    this.removeApplier?.(graph, item, this.userObject)
  }
}

interface Association<ItemInfo, Item> {
  readonly info: ItemInfo,
  readonly item: Item,
}

interface AssociationWithHistory<ItemInfo, Item> {
  readonly newInfo: ItemInfo,
  readonly oldInfo: ItemInfo,
  readonly item: Item,
}

export abstract class AbstractMerger<Meta extends GraphMeta, Item, ItemInfo extends AbstractItemInfo<Meta, unknown, Item>> implements Merger {

  private readonly create: Association<ItemInfo, Item>[] = []
  private readonly update: AssociationWithHistory<ItemInfo, Item>[] = []
  private readonly delete: Association<ItemInfo, Item>[] = []

  private readonly modelInfoIndex: Map<Meta['key'], ItemInfo>

  constructor(
    private readonly _comparator: Comparator<Meta['key']>,
    protected readonly graph: Meta['graph'],
    protected readonly previousGeneration: Map<Meta['key'],
      Association<AbstractItemInfo<Meta, unknown, Meta['node'] | Meta['edge'] | Meta['port'] | Meta['label']>, Meta['node'] | Meta['edge'] | Meta['port'] | Meta['label']>
      | Association<ItemInfo, Item>
    >,
    protected readonly currentGeneration: Map<Meta['key'],
      Association<AbstractItemInfo<Meta, unknown, Meta['node'] | Meta['edge'] | Meta['port'] | Meta['label']>, Meta['node'] | Meta['edge'] | Meta['port'] | Meta['label']>
      | Association<ItemInfo, Item>
    >,
  ) {
    this.modelInfoIndex = new Map<Meta['key'], ItemInfo>()
  }

  commitConstructiveChanges(): void {
    this.forEachInfo((key, currentItemInfo) => {
      let currentItem: Item

      const previousAssociation = this.previousGeneration.get(key)
      if (!isDefine(previousAssociation)) {
        currentItem = this.createItem(currentItemInfo)
        this.create.push({
          item: currentItem,
          info: currentItemInfo,
        })
      } else {
        if (!this.isAssociationCreatedByMe(previousAssociation)) {
          throw new Error('Case when object change it type not supported')
        }
        const previousItemInfo = previousAssociation.info
        const previousItem = previousAssociation.item as typeof currentItem
        currentItem = this.updateItem(currentItemInfo, previousItemInfo, previousItem)
        if (currentItem !== previousItem) {
          this.create.push({
            item: currentItem,
            info: currentItemInfo,
          })
          this.delete.push({
            item: previousItem,
            info: previousItemInfo,
          })
        } else {
          this.update.push({
            item: currentItem,
            oldInfo: previousItemInfo,
            newInfo: currentItemInfo,
          })
        }
      }

      if (this.currentGeneration.has(key)) {
        throw new Error(`Item '${key}' is already registered`)
      }
      this.currentGeneration.set(key, {
        item: currentItem,
        info: currentItemInfo,
      })
    })

    this.previousGeneration
      .forEach((association, key) => {
        if (!this.isAssociationCreatedByMe(association) || this.currentGeneration.has(key)) {
          return
        }

        const item = association.item
        const itemInfo = association.info
        this.delete.push({
          item: item,
          info: itemInfo,
        })
      })
  }

  commitDestructiveChanges(): void {
    this.delete.forEach(association => this.removeItem(association.item))
  }

  processConstructiveChanges(): void {
    this.create.forEach(association => association.info.applyCreate(this.graph, association.item))
    this.update.forEach(association => association.newInfo.applyUpdate(this.graph, association.item, association.oldInfo.userObject))
  }

  processDestructiveChanges(): void {
    this.delete.forEach(association => association.info.applyRemove(this.graph, association.item))
  }

  protected resolveCurrentGenerationAssociation(key: Meta['key']): Optional<Association<AbstractItemInfo<Meta, unknown, Meta['node'] | Meta['edge'] | Meta['port'] | Meta['label']>, Meta['node'] | Meta['edge'] | Meta['port'] | Meta['label']> | Association<ItemInfo, Item>> {
    return this.currentGeneration.get(key)
  }

  protected addInfo(
    key: Meta['key'],
    modelInfo: ItemInfo,
  ): void {
    this.modelInfoIndex.set(key, modelInfo)
  }

  protected abstract createItem(newItemInfo: ItemInfo): Item

  protected abstract updateItem(newItemInfo: ItemInfo, oldItemInfo: ItemInfo, oldItem: Item): Item

  protected abstract removeItem(oldItem: Item): void

  // eslint-disable-next-line @typescript-eslint/ban-types
  protected abstract selfInfoConstructor(): Object['constructor']

  isAssociationCreatedByMe(association: Association<AbstractItemInfo<Meta, unknown, Meta['node'] | Meta['edge'] | Meta['port'] | Meta['label']>, Meta['node'] | Meta['edge'] | Meta['port'] | Meta['label']> | Association<ItemInfo, Item>): association is Association<ItemInfo, Item> {
    return association.info.constructor === this.selfInfoConstructor()
  }

  private forEachInfo(action: (key: Meta['key'], info: ItemInfo) => void): void {
    const itemMap = this.modelInfoIndex;
    [...itemMap.values()]
      .sort((it, that): number => this._comparator(it.key, that.key))
      .forEach(info => action(info.key, info))
  }

}

class NodeMerger<Meta extends GraphMeta> extends AbstractMerger<Meta, Meta['node'], NodeInfo<Meta, unknown>> {
  register(
    key: Meta['key'],
    userObject: unknown,
    createApplier: Optional<CreateApplier<Meta['graph'], Meta['node'], unknown>>,
    updateApplier: Optional<UpdateApplier<Meta['graph'], Meta['node'], unknown>>,
    removeApplier: Optional<RemoveApplier<Meta['graph'], Meta['node'], unknown>>,
  ): void {
    this.addInfo(
      key,
      new NodeInfo<Meta, unknown>(
        key,
        userObject,
        createApplier,
        updateApplier,
        removeApplier,
      ),
    )
  }

  protected selfInfoConstructor(): NodeInfo<Meta, unknown>['constructor'] {
    return NodeInfo
  }

  protected override createItem(
    newItemInfo: NodeInfo<Meta, unknown>,
  ): Meta['node'] {
    return this.graph.createNode(newItemInfo.key, newItemInfo.userObject)
  }

  protected override updateItem(
    newItemInfo: NodeInfo<Meta, unknown>,
    _: NodeInfo<Meta, unknown>,
    oldItem: Meta['node'],
  ): Meta['node'] {
    return this.graph.updateNode(oldItem, newItemInfo.userObject)
  }

  protected override removeItem(oldItem: Meta['node']): void {
    this.graph.removeNode(oldItem)
  }
}

class PortMerger<Meta extends GraphMeta> extends AbstractMerger<Meta, Meta['port'], PortInfo<Meta, unknown>> {

  constructor(
    comparator: Comparator<Meta['key']>,
    graph: Meta['graph'],
    previousGeneration: Map<Meta['key'], Association<AbstractItemInfo<Meta, unknown, Meta['node'] | Meta['edge'] | Meta['port'] | Meta['label']>, Meta['node'] | Meta['edge'] | Meta['port'] | Meta['label']> | Association<PortInfo<Meta, unknown>, Meta['port']>>,
    currentGeneration: Map<Meta['key'], Association<AbstractItemInfo<Meta, unknown, Meta['node'] | Meta['edge'] | Meta['port'] | Meta['label']>, Meta['node'] | Meta['edge'] | Meta['port'] | Meta['label']> | Association<PortInfo<Meta, unknown>, Meta['port']>>,
    private readonly _nodeMerger: NodeMerger<Meta>) {
    super(comparator, graph, previousGeneration, currentGeneration)
  }

  register(
    key: Meta['key'],
    userObject: unknown,
    ownerKey: Meta['key'],
    createApplier: Optional<CreateApplier<Meta['graph'], Meta['port'], unknown>>,
    updateApplier: Optional<UpdateApplier<Meta['graph'], Meta['port'], unknown>>,
    removeApplier: Optional<RemoveApplier<Meta['graph'], Meta['port'], unknown>>,
  ): void {
    this.addInfo(
      key,
      new PortInfo(
        key,
        userObject,
        ownerKey,
        createApplier,
        updateApplier,
        removeApplier,
      ),
    )
  }

  protected selfInfoConstructor(): PortInfo<Meta, unknown>['constructor'] {
    return PortInfo
  }

  protected createItem(newItemInfo: PortInfo<Meta, unknown>): Meta['port'] {
    return this.graph.createPort(newItemInfo.key, this.resolveOwner(newItemInfo.ownerKey), newItemInfo.userObject)
  }

  protected updateItem(newItemInfo: PortInfo<Meta, unknown>, _: PortInfo<Meta, unknown>, oldItem: Meta['node']): Meta['port'] {
    return this.graph.updatePort(oldItem, this.resolveOwner(newItemInfo.ownerKey), newItemInfo.userObject)
  }

  protected removeItem(oldItem: Meta['port']): void {
    this.graph.removePort(oldItem)
  }

  private resolveOwner(key: Meta['key']): Meta['node'] {
    const source = this.resolveCurrentGenerationAssociation(key)
    if (!isDefine(source)) {
      throw new Error(`${key} not found`)
    }
    if (!this._nodeMerger.isAssociationCreatedByMe(source)) {
      throw new Error(`${key} can't be owner for port`)
    }
    return source.item
  }
}

class EdgeMerger<Meta extends GraphMeta> extends AbstractMerger<Meta, Meta['edge'], EdgeInfo<Meta, unknown>> {

  constructor(
    comparator: Comparator<Meta['key']>,
    graph: Meta['graph'],
    previousGeneration: Map<Meta['key'], Association<AbstractItemInfo<Meta, unknown, Meta['node'] | Meta['edge'] | Meta['port'] | Meta['label']>, Meta['node'] | Meta['edge'] | Meta['port'] | Meta['label']> | Association<EdgeInfo<Meta, unknown>, Meta['edge']>>,
    currentGeneration: Map<Meta['key'], Association<AbstractItemInfo<Meta, unknown, Meta['node'] | Meta['edge'] | Meta['port'] | Meta['label']>, Meta['node'] | Meta['edge'] | Meta['port'] | Meta['label']> | Association<EdgeInfo<Meta, unknown>, Meta['edge']>>,
    private readonly _nodeMerger: NodeMerger<Meta>,
    private readonly _portMerger: PortMerger<Meta>) {
    super(comparator, graph, previousGeneration, currentGeneration)
  }

  register(
    key: Meta['key'],
    userObject: unknown,
    sourceKey: Meta['key'],
    targetKey: Meta['key'],
    createApplier: Optional<CreateApplier<Meta['graph'], Meta['edge'], unknown>>,
    updateApplier: Optional<UpdateApplier<Meta['graph'], Meta['edge'], unknown>>,
    removeApplier: Optional<RemoveApplier<Meta['graph'], Meta['edge'], unknown>>,
  ): void {
    this.addInfo(
      key,
      new EdgeInfo(
        key,
        userObject,
        sourceKey,
        targetKey,
        createApplier,
        updateApplier,
        removeApplier,
      ),
    )
  }

  protected selfInfoConstructor(): EdgeInfo<Meta, unknown>['constructor'] {
    return EdgeInfo
  }

  protected createItem(newItemInfo: EdgeInfo<Meta, unknown>): Meta['edge'] {
    const source = this.resolveConnectable(newItemInfo.sourceKey)
    const target = this.resolveConnectable(newItemInfo.targetKey)
    return this.graph.createEdge(newItemInfo.key, source, target, newItemInfo.userObject)
  }

  protected updateItem(newItemInfo: EdgeInfo<Meta, unknown>, _: EdgeInfo<Meta, unknown>, oldItem: Meta['edge']): Meta['edge'] {
    const source = this.resolveConnectable(newItemInfo.sourceKey)
    const target = this.resolveConnectable(newItemInfo.targetKey)
    return this.graph.updateEdge(oldItem, source, target, newItemInfo.userObject)
  }

  protected removeItem(oldItem: Meta['edge']): void {
    this.graph.removeEdge(oldItem)
  }

  private resolveConnectable(key: Meta['key']): Meta['node'] | Meta['port'] {
    const source = this.resolveCurrentGenerationAssociation(key)
    if (!isDefine(source)) {
      throw new Error(`${key} not found`)
    }
    if (!(this._nodeMerger.isAssociationCreatedByMe(source) || this._portMerger.isAssociationCreatedByMe(source))) {
      throw new Error(`${key} not connectable type`)
    }
    return source.item
  }
}

class LabelMerger<Meta extends GraphMeta> extends AbstractMerger<Meta, Meta['label'], LabelInfo<Meta, unknown>> {

  constructor(
    comparator: Comparator<Meta['key']>,
    graph: Meta['graph'],
    previousGeneration: Map<Meta['key'], Association<AbstractItemInfo<Meta, unknown, Meta['node'] | Meta['edge'] | Meta['port'] | Meta['label']>, Meta['node'] | Meta['edge'] | Meta['port'] | Meta['label']> | Association<LabelInfo<Meta, unknown>, Meta['label']>>,
    currentGeneration: Map<Meta['key'], Association<AbstractItemInfo<Meta, unknown, Meta['node'] | Meta['edge'] | Meta['port'] | Meta['label']>, Meta['node'] | Meta['edge'] | Meta['port'] | Meta['label']> | Association<LabelInfo<Meta, unknown>, Meta['label']>>,
    private readonly _nodeMerger: NodeMerger<Meta>,
    private readonly _portMerger: PortMerger<Meta>,
    private readonly _edgeMerger: EdgeMerger<Meta>) {
    super(comparator, graph, previousGeneration, currentGeneration)
  }

  register(
    key: Meta['key'],
    userObject: unknown,
    ownerKey: Meta['key'],
    labelText: string,
    createApplier: Optional<CreateApplier<Meta['graph'], Meta['label'], unknown>>,
    updateApplier: Optional<UpdateApplier<Meta['graph'], Meta['label'], unknown>>,
    removeApplier: Optional<RemoveApplier<Meta['graph'], Meta['label'], unknown>>,
  ): void {
    this.addInfo(
      key,
      new LabelInfo(
        key,
        userObject,
        ownerKey,
        labelText,
        createApplier,
        updateApplier,
        removeApplier,
      ),
    )
  }

  protected selfInfoConstructor(): LabelInfo<Meta, unknown>['constructor'] {
    return LabelInfo
  }

  protected createItem(newItemInfo: LabelInfo<Meta, unknown>): Meta['label'] {
    return this.graph.createLabel(newItemInfo.key, this.resolveOwner(newItemInfo.ownerKey), newItemInfo.labelText, newItemInfo.userObject)
  }

  protected updateItem(newItemInfo: LabelInfo<Meta, unknown>, _: LabelInfo<Meta, unknown>, oldItem: Meta['label']): Meta['label'] {
    return this.graph.updateLabel(oldItem, this.resolveOwner(newItemInfo.ownerKey), newItemInfo.labelText, newItemInfo.userObject)
  }

  protected removeItem(oldItem: Meta['label']): void {
    this.graph.removeLabel(oldItem)
  }

  private resolveOwner(key: Meta['key']): Meta['node'] | Meta['port'] | Meta['edge'] {
    const source = this.resolveCurrentGenerationAssociation(key)
    if (!isDefine(source)) {
      throw new Error(`${key} not found`)
    }
    if (!(this._nodeMerger.isAssociationCreatedByMe(source) || this._portMerger.isAssociationCreatedByMe(source)) || this._edgeMerger.isAssociationCreatedByMe(source)) {
      throw new Error(`${key} can't have labels`)
    }
    return source.item
  }
}

class NodeInfo<Meta extends GraphMeta, UserObject> extends AbstractItemInfo<Meta, UserObject, Meta['node']> {
  constructor(
    key: Meta['key'],
    userObject: UserObject,
    createApplier: Optional<CreateApplier<Meta['graph'], Meta['node'], UserObject>>,
    updateApplier: Optional<UpdateApplier<Meta['graph'], Meta['node'], UserObject>>,
    removeApplier: Optional<RemoveApplier<Meta['graph'], Meta['node'], UserObject>>,
  ) {
    super(
      key,
      userObject,
      createApplier,
      updateApplier,
      removeApplier,
    )
  }
}

class EdgeInfo<Meta extends GraphMeta, UserObject> extends AbstractItemInfo<Meta, UserObject, Meta['edge']> {

  constructor(
    key: Meta['key'],
    userObject: UserObject,
    public readonly sourceKey: Meta['key'],
    public readonly targetKey: Meta['key'],
    createApplier: Optional<CreateApplier<Meta['graph'], Meta['edge'], UserObject>>,
    updateApplier: Optional<UpdateApplier<Meta['graph'], Meta['edge'], UserObject>>,
    removeApplier: Optional<RemoveApplier<Meta['graph'], Meta['edge'], UserObject>>,
  ) {
    super(
      key,
      userObject,
      createApplier,
      updateApplier,
      removeApplier,
    )
  }
}

class PortInfo<Meta extends GraphMeta, UserObject> extends AbstractItemInfo<Meta, UserObject, Meta['port']> {

  constructor(
    key: Meta['key'],
    userObject: UserObject,
    public readonly ownerKey: Meta['key'],
    createApplier: Optional<CreateApplier<Meta['graph'], Meta['port'], UserObject>>,
    updateApplier: Optional<UpdateApplier<Meta['graph'], Meta['port'], UserObject>>,
    removeApplier: Optional<RemoveApplier<Meta['graph'], Meta['port'], UserObject>>,
  ) {
    super(
      key,
      userObject,
      createApplier,
      updateApplier,
      removeApplier,
    )
  }
}

class LabelInfo<Meta extends GraphMeta, UserObject> extends AbstractItemInfo<Meta, UserObject, Meta['label']> {

  constructor(
    key: Meta['key'],
    userObject: UserObject,
    public readonly ownerKey: Meta['key'],
    public readonly labelText: string,
    createApplier: Optional<CreateApplier<Meta['graph'], Meta['label'], UserObject>>,
    updateApplier: Optional<UpdateApplier<Meta['graph'], Meta['label'], UserObject>>,
    removeApplier: Optional<RemoveApplier<Meta['graph'], Meta['label'], UserObject>>,
  ) {
    super(
      key,
      userObject,
      createApplier,
      updateApplier,
      removeApplier,
    )
  }

}