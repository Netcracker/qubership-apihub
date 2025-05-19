import '../index'
import * as React from 'react'
import test from '../samples/test.yaml'

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'rest-examples': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
    }
  }
}

const Template = (props: any) => <rest-examples {...props} />

export default {
  title: 'web-components/Examples',
}

export const RestExamples: any = Template.bind({})
RestExamples.args = {
  document: test,
}
RestExamples.storyName = 'Examples'
