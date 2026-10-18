import '../index';

import {
  dropdownsCheck,
  guardianApiYaml,
  streetlightKafkaAsyncApi
} from '@netcracker/qubership-apihub-apispec-view-samples';
import { parse } from '@stoplight/yaml';
import React from 'react';

import { zoomApiYaml } from '../../__fixtures__/api-descriptions/zoomApiYaml';

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'apispec-view': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
    }
  }
}

const Template = (props: any) => <apispec-view {...props} />;

export default {
  title: 'web-components/API',
  argTypes: {
    apiDescriptionUrl: {
      control: 'text',
    },
    apiDescriptionDocument: { control: 'text' },
    layout: {
      control: { type: 'inline-radio', options: ['sidebar', 'stacked', 'partial'] },
      defaultValue: 'sidebar',
    },
    router: {
      control: { type: 'inline-radio', options: ['history', 'memory', 'hash', 'static'] },
      defaultValue: 'history',
    },
    selectedNodeUri: { control: 'text', defaultValue: '/' },
    searchPhrase: { control: 'text' },
    schemaViewMode: {
      control: { type: 'inline-radio', options: ['simple', 'detailed'] },
      defaultValue: undefined,
    },
  },
};

export const APIWithYamlProvidedDirectly: any = Template.bind({});
APIWithYamlProvidedDirectly.args = {
  apiDescriptionDocument: zoomApiYaml,
};
APIWithYamlProvidedDirectly.storyName = 'API With Yaml Provided Directly';

export const APIWithJSONProvidedDirectly: any = Template.bind({});
APIWithJSONProvidedDirectly.args = {
  apiDescriptionDocument: JSON.stringify(parse(zoomApiYaml), null, '  '),
};
APIWithJSONProvidedDirectly.storyName = 'API With JSON Provided Directly';

export const GuardianAPI: any = Template.bind({});
GuardianAPI.args = {
  apiDescriptionDocument: guardianApiYaml,
};
GuardianAPI.storyName = 'Guardian API';

export const DropdownsCheck: any = Template.bind({});
DropdownsCheck.args = {
  apiDescriptionDocument: dropdownsCheck,
};
DropdownsCheck.storyName = 'Dropdowns Check';

export const StreetlightKafkaApi: any = Template.bind({});
StreetlightKafkaApi.args = {
  apiDescriptionDocument: streetlightKafkaAsyncApi,
};
StreetlightKafkaApi.storyName = 'Streetlight Kafka Api';
