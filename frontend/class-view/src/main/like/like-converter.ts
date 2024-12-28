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

import { ContentObject } from 'main/domain/object/content'
import { ContentLike } from 'main/domain/like/content'
import { Key, Optional } from 'main/domain/base'
import { DomainLike, RelationLike } from 'main/domain/like/all'
import { DomainMeta, PropertyObject, RelationObject } from 'main/domain/object/meta'
import { DomainObject } from 'main/component/class-view-api'
import { ClassObject } from 'main/domain/object/class'
import { LeafPropertyObject } from 'main/domain/object/leaf-property'
import { LeafPropertyLike } from 'main/domain/like/leaf-property'
import { ClassLike } from 'main/domain/like/class'
import {
  LIKE_TYPE_CLASS,
  LIKE_TYPE_INCLUDE_PROPERTIES_GROUP_RELATION,
  LIKE_TYPE_LEAF_PROPERTY,
  LIKE_TYPE_PROPERTY_GROUP,
  LIKE_TYPE_PROPERTY_TO_CLASS_RELATION,
} from 'main/domain/like/type'
import { isDefine } from 'main/core/utils'
import {
  HasIdentity,
  HasPropertyKind,
  HasReferenceKind,
  PROPERTY_TYPE_GROUP,
  PROPERTY_TYPE_LEAF,
  RELATION_TYPE_INCLUDE_PROPERTIES_GROUP,
  RELATION_TYPE_PROPERTY_TO_CLASS_REFERENCE,
} from 'main/domain/object/base'
import { PropertiesGroupObject } from 'main/domain/object/properties-group'
import { IncludePropertiesGroupRelationObject } from 'main/domain/object/include-properties-group-relation'
import { PropertyToClassRelationObject } from 'main/domain/object/property-to-class-reference-relation'
import { PropertiesGroupLike } from 'main/domain/like/properties-group'
import { IncludePropertiesGroupRelationLike } from 'main/domain/like/include-properties-group-relation'
import { PropertyToClassRelationLike } from 'main/domain/like/property-to-class-reference-relation'
import {
  DEFAULT_CLASS_DEPRECATION,
  DEFAULT_CLASS_NAME,
  DEFAULT_CLASS_SHAPE,
  DEFAULT_INCLUDE_PROPERTIES_GROUP_RELATION_PRIMARY,
  DEFAULT_LEAF_PROPERTY_DEPRECATION,
  DEFAULT_LEAF_PROPERTY_NAME,
  DEFAULT_LEAF_PROPERTY_TYPE,
  DEFAULT_LEAF_PROPERTY_TYPE_DEPRECATION,
  DEFAULT_PROPERTIES_GROUP_DEPRECATION,
  DEFAULT_PROPERTIES_GROUP_NAME,
  DEFAULT_PROPERTY_TO_CLASS_RELATION_PRIMARY,
} from 'main/defaults'

type PartlyMutable<T, K extends keyof T> = Pick<T, K> & Partial<Omit<T, K>>;
type OriginalToRemove = { original?: unknown }
type MutableLike<T, K extends keyof T, O> = PartlyMutable<T, K> & { readonly original: O }
type MutableClass<Original> = MutableLike<ClassLike, 'type' | 'key', Original>;
type MutableLeafProperty<Original> = MutableLike<LeafPropertyLike, 'type' | 'key', Original>;
type MutablePropertiesGroup<Original> = MutableLike<PropertiesGroupLike, 'type' | 'key', Original>;
type MutableIncludePropertiesGroupRelation<Original> = MutableLike<IncludePropertiesGroupRelationLike, 'type' | 'key', Original>;
type MutablePropertyToClassRelation<Original> = MutableLike<PropertyToClassRelationLike, 'type' | 'key', Original>;

type InstanceToKey = (instance: HasIdentity) => Key

export function resolveLikes<
  Meta extends DomainMeta
>(cr: ConvertResult<Meta>, objects: DomainObject<Meta>[]): DomainLike[] {
  return objects.flatMap(object => {
    const resolveLike = cr.resolveLike(object)
    return isDefine(resolveLike) ? [resolveLike] : []
  })
}

export function resolveObjects<
  Meta extends DomainMeta
>(cr: ConvertResult<Meta>, likes: DomainLike[]): DomainObject<Meta>[] {
  return likes.flatMap(object => {
    const resolveObject = cr.resolveObject(object)
    return isDefine(resolveObject) ? [resolveObject] : []
  })
}

export interface ConvertResult<
  Meta extends DomainMeta
> {
  readonly content: ContentLike;

  resolveObject(like: DomainLike): Optional<DomainObject<Meta>>;

  resolveLike(object: DomainObject<Meta>): Optional<DomainLike>;

  objects: DomainObject<Meta>[];
  likes: DomainLike[];
}

export class LikeConverter<Meta extends DomainMeta> {

  private _classRectangleCornerRadiusFunction: (cl: Meta['class']) => ClassObject<PropertyObject<Meta>>['shape'] = cl => this.castToDefaultClassObject(cl).shape

  private _dirty = false

  constructor(private readonly _markDirtyFunction: () => void) {
  }

  private castToDefaultClassObject(classObj: Meta['class']): ClassObject<PropertyObject<Meta>> { return classObj as ClassObject<PropertyObject<Meta>>}

  private castToDefaultLeafPropertyObject(leafPropObj: Meta['leafProperty']): LeafPropertyObject { return leafPropObj as LeafPropertyObject}

  private castToDefaultPropertiesGroupObject(groupObj: Meta['propertiesGroup']): PropertiesGroupObject<Meta['leafProperty']> { return groupObj as PropertiesGroupObject<Meta['leafProperty']>}

  private castToDefaultIncludePropertiesGroupRelationObject(includeObj: Meta['includeGroupFromClassRelation']): IncludePropertiesGroupRelationObject { return includeObj as IncludePropertiesGroupRelationObject}

  private castToDefaultPropertyToClassRelationObject(refObj: Meta['propertyToClassRelation']): PropertyToClassRelationObject { return refObj as PropertyToClassRelationObject}

  private invalidate(): void {
    this._dirty = true
    this._markDirtyFunction()
  }

  get dirty(): boolean {
    return this._dirty
  }

  public valueApplied() {
    this._dirty = false
  }

  get classRectangleCornerRadiusFunction(): (cl: Meta['class']) => ClassObject<PropertyObject<Meta>>['shape'] {
    return this._classRectangleCornerRadiusFunction
  }

  set classRectangleCornerRadiusFunction(f: (cl: Meta['class']) => ClassObject<PropertyObject<Meta>>['shape']) {
    this._classRectangleCornerRadiusFunction = f
    this.invalidate()
  }

  private convertToMutableClassDraft(
    classObj: Meta['class'],
    instanceToKey: InstanceToKey,
  ): MutableClass<Meta['class']> {
    const object = this.castToDefaultClassObject(classObj) //custom function in future
    return {
      key: instanceToKey(object),
      type: LIKE_TYPE_CLASS,
      original: classObj,
    }
  }

  private convertToMutableLeafPropertyDraft(
    propObj: Meta['leafProperty'],
    instanceToKey: InstanceToKey,
  ): MutableLeafProperty<Meta['leafProperty']> {
    const object = this.castToDefaultLeafPropertyObject(propObj) //custom function in future
    return {
      key: instanceToKey(object),
      type: LIKE_TYPE_LEAF_PROPERTY,
      original: propObj,
    }
  }

  private convertToMutablePropertiesGroupDraft(
    groupObj: Meta['propertiesGroup'],
    instanceToKey: InstanceToKey,
  ): MutablePropertiesGroup<Meta['propertiesGroup']> {
    const object = this.castToDefaultPropertiesGroupObject(groupObj) //custom function in future
    return {
      key: instanceToKey(object),
      type: LIKE_TYPE_PROPERTY_GROUP,
      original: groupObj,
    }
  }

  private convertToMutableIncludePropertiesGroupRelationDraft(
    includeObj: Meta['includeGroupFromClassRelation'],
    instanceToKey: InstanceToKey,
  ): MutableIncludePropertiesGroupRelation<Meta['includeGroupFromClassRelation']> {
    const object = this.castToDefaultIncludePropertiesGroupRelationObject(includeObj) //custom function in future
    return {
      key: instanceToKey(object),
      type: LIKE_TYPE_INCLUDE_PROPERTIES_GROUP_RELATION,
      original: includeObj,
    }
  }

  private convertToMutablePropertyToClassRelationDraft(
    refObj: Meta['propertyToClassRelation'],
    instanceToKey: InstanceToKey,
  ): MutablePropertyToClassRelation<Meta['propertyToClassRelation']> {
    const object = this.castToDefaultPropertyToClassRelationObject(refObj) //custom function in future
    return {
      key: instanceToKey(object),
      type: LIKE_TYPE_PROPERTY_TO_CLASS_RELATION,
      original: refObj,
    }
  }

  private propertySeparator<Result>(
    propObj: PropertyObject<Meta>,
    leafTransform: (leaf: Meta['leafProperty']) => Result,
    groupTransform: (group: Meta['propertiesGroup']) => Result,
  ): Result {
    const propertyWithKind = propObj as HasPropertyKind //custom function in future
    switch (propertyWithKind.kind) {
      case PROPERTY_TYPE_GROUP: {
        return groupTransform(propObj)
      }
      default:
      case PROPERTY_TYPE_LEAF: {
        return leafTransform(propObj)
      }
    }
  }

  private relationSeparator<Result>(
    relObj: RelationObject<Meta>,
    includeGroupTransform: (leaf: Meta['includeGroupFromClassRelation']) => Result,
    refToClassTransform: (group: Meta['propertyToClassRelation']) => Result,
  ): Result {
    const propertyWithKind = relObj as HasReferenceKind //custom function in future
    switch (propertyWithKind.kind) {
      case RELATION_TYPE_INCLUDE_PROPERTIES_GROUP: {
        return includeGroupTransform(relObj)
      }
      default:
      case RELATION_TYPE_PROPERTY_TO_CLASS_REFERENCE: {
        return refToClassTransform(relObj)
      }
    }
  }

  private fillClass(
    classLikeDraft: MutableClass<Meta['class']>,
    instanceToKey: InstanceToKey,
    leafPropertyIndex: Map<Key, MutableLeafProperty<Meta['leafProperty']>>,
    propertiesGroupIndex: Map<Key, MutablePropertiesGroup<Meta['propertiesGroup']>>,
  ): Optional<ClassLike> {
    const defaultClass = this.castToDefaultClassObject(classLikeDraft.original)
    const like: ClassLike & OriginalToRemove = Object.assign(classLikeDraft, {
      name: defaultClass.name ?? DEFAULT_CLASS_NAME,
      shape: this._classRectangleCornerRadiusFunction(defaultClass) || DEFAULT_CLASS_SHAPE,
      deprecated: defaultClass.deprecated ?? DEFAULT_CLASS_DEPRECATION,
      properties: (defaultClass.properties || [])
        .flatMap(propertyObj =>
          this.propertySeparator<(MutableLeafProperty<Meta['leafProperty']> | MutablePropertiesGroup<Meta['propertiesGroup']>)[]>(
            propertyObj,
            leaf => {
              const res = leafPropertyIndex.get(instanceToKey(this.castToDefaultLeafPropertyObject(leaf)))
              return isDefine(res) ? [res] : []
            },
            group => {
              const res = propertiesGroupIndex.get(instanceToKey(this.castToDefaultPropertiesGroupObject(group)))
              return isDefine(res) ? [res] : []
            },
          )),
    })
    delete like.original
    return like
  }

  private fillLeafProperty(
    property: MutableLeafProperty<Meta['leafProperty']>,
  ): Optional<LeafPropertyLike> {
    const defaultProperty = this.castToDefaultLeafPropertyObject(property.original)
    const like: LeafPropertyLike & OriginalToRemove = Object.assign(property, {
      name: defaultProperty.name ?? DEFAULT_LEAF_PROPERTY_NAME,
      required: defaultProperty.required ?? DEFAULT_LEAF_PROPERTY_DEPRECATION,
      deprecated: defaultProperty.deprecated ?? DEFAULT_CLASS_DEPRECATION,
      propertyTypeDeprecated: defaultProperty.propertyTypeDeprecated ?? DEFAULT_LEAF_PROPERTY_TYPE_DEPRECATION,
      propertyType: defaultProperty.propertyType ?? DEFAULT_LEAF_PROPERTY_TYPE,

    })
    delete like.original
    return like
  }

  private fillPropertiesGroup(
    property: MutablePropertiesGroup<Meta['propertiesGroup']>,
    instanceToKey: InstanceToKey,
    leafPropertyIndex: Map<Key, MutableLeafProperty<Meta['leafProperty']>>,
  ): Optional<PropertiesGroupLike> {
    const defaultProperty = this.castToDefaultPropertiesGroupObject(property.original)
    const like: PropertiesGroupLike & OriginalToRemove = Object.assign(property, {
      name: defaultProperty.name ?? DEFAULT_PROPERTIES_GROUP_NAME,
      deprecated: defaultProperty.deprecated ?? DEFAULT_PROPERTIES_GROUP_DEPRECATION,
      properties: (defaultProperty.properties || [])
        .flatMap(propertyObj => {
          const res = leafPropertyIndex.get(instanceToKey(this.castToDefaultLeafPropertyObject(propertyObj)))
          return isDefine(res) ? [res] : []
        }),
    })
    delete like.original
    return like
  }

  private fillIncludePropertiesGroupRelation(
    property: MutableIncludePropertiesGroupRelation<Meta['includeGroupFromClassRelation']>,
    groupPropertyIndex: Map<Key, MutablePropertiesGroup<Meta['propertiesGroup']>>,
    classIndex: Map<Key, MutableClass<Meta['class']>>,
  ): Optional<IncludePropertiesGroupRelationLike> {
    const defaultRelation = this.castToDefaultIncludePropertiesGroupRelationObject(property.original)
    const classKey = defaultRelation.includedClassKey
    const groupKey = defaultRelation.propertyGroupKey
    if (!isDefine(classKey) || !isDefine(groupKey)) {
      return undefined
    }
    const classLike = classIndex.get(classKey)
    const groupLike = groupPropertyIndex.get(groupKey)
    if (!isDefine(classLike) || !isDefine(groupLike)) {
      return undefined
    }
    const like: IncludePropertiesGroupRelationLike & OriginalToRemove = Object.assign(property, {
      primary: defaultRelation.primary ?? DEFAULT_INCLUDE_PROPERTIES_GROUP_RELATION_PRIMARY,
      includedClass: classLike,
      propertyGroup: groupLike,
    })
    delete like.original
    return like
  }

  private fillPropertyToClassRelation(
    property: MutablePropertyToClassRelation<Meta['propertyToClassRelation']>,
    leafPropertyIndex: Map<Key, MutableLeafProperty<Meta['leafProperty']>>,
    classIndex: Map<Key, MutableClass<Meta['class']>>,
  ): Optional<PropertyToClassRelationLike> {
    const defaultRelation = this.castToDefaultPropertyToClassRelationObject(property.original)
    const classKey = defaultRelation.referenceClassKey
    const propertyKey = defaultRelation.leafPropertyKey
    if (!isDefine(classKey) || !isDefine(propertyKey)) {
      return undefined
    }
    const classLike = classIndex.get(classKey)
    const leafLike = leafPropertyIndex.get(propertyKey)
    if (!isDefine(classLike) || !isDefine(leafLike)) {
      return undefined
    }
    const like: PropertyToClassRelationLike & OriginalToRemove = Object.assign(property, {
      primary: defaultRelation.primary ?? DEFAULT_PROPERTY_TO_CLASS_RELATION_PRIMARY,
      leafProperty: leafLike,
      referenceClass: classLike,
    })
    delete like.original
    return like
  }

  public convert(object: ContentObject<Meta>): ConvertResult<Meta> {
    const instanceToKey = this.createInstanceToKeyFunction()
    const classes = object.classes || []
    const relations = object.relations || []
    const properties = classes
      .flatMap(classObj => (this.castToDefaultClassObject(classObj).properties || []))
      .flatMap(propsObj => this.propertySeparator(
        propsObj,
        leaf => [leaf],
        group => [group, ...this.castToDefaultPropertiesGroupObject(group).properties || []],
      ))
    const keyToMutableClassIndex: Map<Key, MutableClass<Meta['class']>> = this.toMap(
      classes
        .map(classObj => this.convertToMutableClassDraft(classObj, instanceToKey))
        .map(classLikeDraft => [classLikeDraft.key, classLikeDraft]),
    )
    const keyToMutableLeafPropertiesIndex: Map<Key, MutableLeafProperty<Meta['leafProperty']>> = this.toMap(
      properties
        .flatMap(propsObj => {
          return this.propertySeparator(
            propsObj,
            leaf => [this.convertToMutableLeafPropertyDraft(leaf, instanceToKey)],
            () => [],
          )
        })
        .map(propsLikeDraft => [propsLikeDraft.key, propsLikeDraft]),
    )
    const keyToMutablePropertiesGroupIndex: Map<Key, MutablePropertiesGroup<Meta['propertiesGroup']>> = this.toMap(
      properties
        .flatMap(propsObj => {
          return this.propertySeparator(
            propsObj,
            () => [],
            (group) => [this.convertToMutablePropertiesGroupDraft(group, instanceToKey)],
          )
        })
        .map(propsLikeDraft => [propsLikeDraft.key, propsLikeDraft]),
    )

    const keyToMutableIncludePropertiesGroupRelationIndex: Map<Key, MutableIncludePropertiesGroupRelation<Meta['includeGroupFromClassRelation']>> = this.toMap(
      relations
        .flatMap(relObj => {
          return this.relationSeparator(
            relObj,
            (include) => [this.convertToMutableIncludePropertiesGroupRelationDraft(include, instanceToKey)],
            () => [],
          )
        })
        .map(relLikeDraft => [relLikeDraft.key, relLikeDraft]),
    )
    const keyToMutablePropertyToClassRelationIndex: Map<Key, MutablePropertyToClassRelation<Meta['propertyToClassRelation']>> = this.toMap(
      relations
        .flatMap(relObj => {
          return this.relationSeparator(
            relObj,
            () => [],
            (ref) => [this.convertToMutablePropertyToClassRelationDraft(ref, instanceToKey)],
          )
        })
        .map(relLikeDraft => [relLikeDraft.key, relLikeDraft]),
    )

    const objectToClassIndex = new Map([...keyToMutableClassIndex.values()]
      .flatMap(draft => {
        const original = draft.original
        const like = this.fillClass(draft, instanceToKey, keyToMutableLeafPropertiesIndex, keyToMutablePropertiesGroupIndex)
        return isDefine(like) ? [[original, like]] : []
      }))

    const objectToLeafPropertiesIndex = new Map([...keyToMutableLeafPropertiesIndex.values()]
      .flatMap(draft => {
        const original = draft.original
        const like = this.fillLeafProperty(draft)
        return isDefine(like) ? [[original, like]] : []
      }))

    const objectToPropertiesGroupIndex = new Map([...keyToMutablePropertiesGroupIndex.values()]
      .flatMap(draft => {
        const original = draft.original
        const like = this.fillPropertiesGroup(draft, instanceToKey, keyToMutableLeafPropertiesIndex)
        return isDefine(like) ? [[original, like]] : []
      }))

    const objectToIncludePropertiesGroupRelationIndex = new Map([...keyToMutableIncludePropertiesGroupRelationIndex.values()]
      .flatMap(draft => {
        const original = draft.original
        const like = this.fillIncludePropertiesGroupRelation(draft, keyToMutablePropertiesGroupIndex, keyToMutableClassIndex)
        return isDefine(like) ? [[original, like]] : []
      }))

    const objectToPropertyToClassRelationIndex = new Map([...keyToMutablePropertyToClassRelationIndex.values()]
      .flatMap(draft => {
        const original = draft.original
        const like = this.fillPropertyToClassRelation(draft, keyToMutableLeafPropertiesIndex, keyToMutableClassIndex)
        return isDefine(like) ? [[original, like]] : []
      }))

    const allAssociations = [
      ...[...objectToClassIndex.entries()],
      ...[...objectToLeafPropertiesIndex.entries()],
      ...[...objectToPropertiesGroupIndex.entries()],
      ...[...objectToIncludePropertiesGroupRelationIndex.entries()],
      ...[...objectToPropertyToClassRelationIndex.entries()],
    ]
    const objectIndex: Map<DomainObject<Meta>, DomainLike> = new Map(allAssociations.map(([original, like]) => [original, like]))
    const likeIndex: Map<DomainLike, DomainObject<Meta>> = new Map(allAssociations.map(([original, like]) => [like, original]))

    return {
      content: {
        classes: classes.flatMap(classObj => {
          const like = objectToClassIndex.get(classObj)
          return isDefine(like) ? [like] : []
        }),
        relations: relations.flatMap(relObj =>
          this.relationSeparator<RelationLike[]>(
            relObj,
            include => {
              const like = objectToIncludePropertiesGroupRelationIndex.get(include)
              return isDefine(like) ? [like] : []
            },
            refToClass => {
              const like = objectToPropertyToClassRelationIndex.get(refToClass)
              return isDefine(like) ? [like] : []
            },
          )),
      },
      resolveObject(like: DomainLike): Optional<DomainObject<Meta>> {
        return likeIndex.get(like)
      },
      resolveLike(object: DomainObject<Meta>): Optional<DomainLike> {
        return objectIndex.get(object)
      },
      get likes(): DomainLike[] {
        return [...likeIndex.keys()]
      },
      get objects(): DomainObject<Meta>[] {
        return [...objectIndex.keys()]
      },
    }
  }

  private createInstanceToKeyFunction() {
    let counter = 0
    const instanceIndex: Map<unknown, Key> = new Map()
    const instanceToKey: InstanceToKey = (instance) => {
      if (isDefine(instance.key)) {
        return instance.key
      }
      let key = instanceIndex.get(instance)
      if (isDefine(key)) {
        return key
      }
      key = `generated_${counter++}`
      instanceIndex.set(instance, key)
      return key
    }
    return instanceToKey
  }

  private toMap<Tuple extends [Key, Entity], Entity extends OriginalToRemove>(tuples: Tuple[]): Map<Key, Entity> {
    const map: Map<Key, Entity> = new Map()
    return tuples.reduce((result, tuple) => {
      const duplicate = result.get(tuple[0])
      if (isDefine(duplicate)) {
        console.warn(`Duplicate key '${tuple[0]}' found`, tuple[0], tuple[1].original, duplicate)
      } else {
        result.set(tuple[0], tuple[1])
      }
      return result
    }, map)
  }
}