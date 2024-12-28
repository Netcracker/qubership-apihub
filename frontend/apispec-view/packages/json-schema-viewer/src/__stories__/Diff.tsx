import { Story } from '@storybook/react';
import { JSONSchema4 } from 'json-schema';
import React from 'react';

import { JsonSchemaProps, JsonSchemaViewer } from '../components';

const defaultSchema = require('../__fixtures__/default-schema.json');
const simpleExample = require('../__fixtures__/diff/simple-example.json');
const rootRefExample = require('../__fixtures__/diff/root-ref.json');

export default {
  component: JsonSchemaViewer,
  argTypes: {},
};

const Template: Story<JsonSchemaProps> = ({ schema = defaultSchema as JSONSchema4, ...args }) => (
  <JsonSchemaViewer schema={schema} {...args} />
);

export const SimpleAllOf = Template.bind({});
SimpleAllOf.args = { schema: simpleExample as JSONSchema4 };

export const RootRef = Template.bind({});
RootRef.args = { schema: rootRefExample as JSONSchema4 };
