import { Meta, StoryFn } from '@storybook/html-vite'
import {
  ClassObject,
  ContentObject,
  DefaultDomainMeta,
  LeafPropertyObject,
  PropertiesGroupObject,
  PropertyObject
} from 'main/domain'
import { storyArgsFunc } from 'stories/common'

const PROPERTY_ONE: LeafPropertyObject = {
  key: 'property1',
  kind: 'property',
  name: 'property1',
  propertyType: 'number',
}

const PROPERTY_TWO: LeafPropertyObject = {
  key: 'property2',
  kind: 'property',
  name: 'property2',
  propertyType: 'number',
}

const GROUP: PropertiesGroupObject<LeafPropertyObject> = {
  key: 'group',
  kind: 'group',
  name: 'group',
  properties: [
    PROPERTY_TWO,
  ]
}

const CLASS_ONE: ClassObject<PropertyObject<DefaultDomainMeta>> = {
  key: 'class1',
  name: 'class1',
  properties: [
    PROPERTY_ONE,
    GROUP,
  ]
}

const CLASS_TWO: ClassObject<PropertyObject<DefaultDomainMeta>> = {
  key: 'class2',
  name: 'class2',
  properties: [
    PROPERTY_ONE,
    GROUP,
  ]
}

const CONTENT_ONE = {
  classes: [CLASS_ONE]
} satisfies ContentObject

const CONTENT_TWO = {
  classes: [CLASS_TWO]
} satisfies ContentObject

enum ReplaceStage {
  FIRST,
  SECOND,
}

export default {
  title: 'Synthetic/Content',
  argTypes: {
    replaceDevice: {
      name: 'Replace class',
      control: {
        type: 'radio',
        labels: {
          [ReplaceStage.FIRST]: 'Class 1',
          [ReplaceStage.SECOND]: 'Class 2'
        }
      },
      options: [
        ReplaceStage.FIRST, ReplaceStage.SECOND
      ],
      defaultValue: ReplaceStage.FIRST
    }
  }
} satisfies Meta<StoryArgs>

type StoryArgs = {
  replaceDevice: ReplaceStage;
}

export const ReplaceClass: StoryFn<StoryArgs> = storyArgsFunc((args, component) => {
  switch (args.replaceDevice) {
    case ReplaceStage.FIRST: {
      component.content = CONTENT_ONE
      break
    }
    case ReplaceStage.SECOND: {
      component.content = CONTENT_TWO
      break
    }
  }
}, baseContext => {
  baseContext.component.content = CONTENT_ONE
  return baseContext
})
