import { Meta, StoryFn } from '@storybook/html-vite'
import { SHAPE_RECTANGLE, SHAPE_ROUND_RECTANGLE } from 'main/domain'
import { CLASS_SUFFIX, generateClassObject, generateContent, storyArgsFunc } from 'stories/common'

enum ShapeStage {
  RECTANGLE,
  ROUND_RECTANGLE,
}

export default {
  title: 'Synthetic/Styling',
  argTypes: {
    changeShape: {
      name: 'Change shape',
      control: {
        type: 'radio',
        labels: {
          [ShapeStage.RECTANGLE]: 'Rectangle',
          [ShapeStage.ROUND_RECTANGLE]: 'Round rectangle',
        }
      },
      options: [
        ShapeStage.RECTANGLE, ShapeStage.ROUND_RECTANGLE
      ],
    }
  },
  args: {
    changeShape: ShapeStage.RECTANGLE
  }
} satisfies Meta<StoryArgs>

type StoryArgs = {
  changeShape: ShapeStage;
}
const CONTENT = generateContent({
  classes: [
    generateClassObject(CLASS_SUFFIX)
  ]
})

export const ClassStyle: StoryFn<StoryArgs> = storyArgsFunc((args, component) => {
  switch (args.changeShape) {
    case ShapeStage.RECTANGLE: {
      component.classShapeFunction = () => SHAPE_RECTANGLE
      break
    }
    case ShapeStage.ROUND_RECTANGLE: {
      component.classShapeFunction = () => SHAPE_ROUND_RECTANGLE
      break
    }
  }
}, baseContext => {
  baseContext.component.content = CONTENT
  baseContext.component.classShapeFunction = () => SHAPE_RECTANGLE
  return baseContext
})
