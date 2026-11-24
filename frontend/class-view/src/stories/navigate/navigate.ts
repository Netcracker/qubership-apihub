import { DEFAULT_ANIMATION_DURATION, DEFAULT_CONTENT_INSETS } from 'main/defaults'
import { Args, ArgTypes } from '@storybook/html-vite'
import { Duration, Insets, Pixel } from 'main/domain'

export const NAVIGATION_OPTION_ARGS_TYPE: ArgTypes = {
  navigateOptionAnimationDuration: {
    name: 'Navigate option. Animation duration',
    control: { type: 'number', min: 0, max: 5000, step: 50 },
  },
  navigateOptionInsets: {
    name: 'Navigate option. Insets',
    control: {
      type: 'radio',
      labels: {
        '0': 'Empty',
        '1': 'Default',
        '2': 'Left: 50',
        '3': 'Top: 150',
        '4': 'Bottom: 200',
        '5': 'Right: 100'
      }
    },
    options: [
      '0',
      '1',
      '2',
      '3',
      '4',
      '5'
    ],
    mapping: [
      { top: 0, bottom: 0, left: 0, right: 0 } as Insets<Pixel>,
      DEFAULT_CONTENT_INSETS,
      { top: 0, bottom: 0, left: 50, right: 0 } as Insets<Pixel>,
      { top: 150, bottom: 0, left: 0, right: 0 } as Insets<Pixel>,
      { top: 0, bottom: 200, left: 0, right: 0 } as Insets<Pixel>,
      { top: 0, bottom: 0, left: 0, right: 100 } as Insets<Pixel>
    ],
  },
}

export const NAVIGATION_OPTION_ARGS: Args = {
  navigateOptionAnimationDuration: DEFAULT_ANIMATION_DURATION,
  navigateOptionInsets: '1'

}

export type NavigationOptionConfiguration = {
  navigateOptionAnimationDuration: Duration;
  navigateOptionInsets: Insets<Pixel>;
}
