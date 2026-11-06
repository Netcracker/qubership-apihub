import { useOperationSchemaOptionsMode } from '../../../index';
import { HttpParamStyles, IHttpContent, IHttpParam } from '@stoplight/types';
import type { JSONSchema7Object } from 'json-schema';
import { JsonSchemaViewer } from '@netcracker/qubership-apihub-apispec-view-json-schema-viewer';
import { isObject, sortBy } from 'lodash';
import * as React from 'react';

import { isNodeExample } from '../../../utils/http-spec/examples';
import {useMemo} from "react";

type ParameterType = 'query' | 'header' | 'path' | 'cookie';

type IExtendedHttpParam = IHttpParam & {
  content: Record<string, IHttpContent>;
};

interface ParametersProps {
  parameterType: ParameterType;
  parameters?: IExtendedHttpParam[];
}

const readableStyles = {
  [HttpParamStyles.PipeDelimited]: 'Pipe separated values',
  [HttpParamStyles.SpaceDelimited]: 'Space separated values',
  [HttpParamStyles.CommaDelimited]: 'Comma separated values',
  [HttpParamStyles.Simple]: 'Comma separated values',
  [HttpParamStyles.Matrix]: 'Path style values',
  [HttpParamStyles.Label]: 'Label style values',
  [HttpParamStyles.Form]: 'Form style values',
} as const;

const defaultStyle = {
  query: HttpParamStyles.Form,
  header: HttpParamStyles.Simple,
  path: HttpParamStyles.Simple,
  cookie: HttpParamStyles.Form,
} as const;

export const Parameters: React.FunctionComponent<ParametersProps> = ({ parameters, parameterType }) => {
  const schema = useMemo(
    () => httpOperationParamsToSchema({ parameters, parameterType }),
    [parameters, parameterType],
  );
  const { schemaViewMode, defaultSchemaDepth } = useOperationSchemaOptionsMode();

  if (!schema) return null;

  return (
    <JsonSchemaViewer
      schema={schema}
      schemaViewMode={schemaViewMode}
      defaultExpandedDepth={defaultSchemaDepth}
      disableCrumbs
    />
  );
};
Parameters.displayName = 'HttpOperation.Parameters';

const httpOperationParamsToSchema = (
  { parameters, parameterType }: ParametersProps
): JSONSchema7Object | null => {
  if (!parameters || !parameters.length) {
    return null;
  }

  const schema = {
    type: 'object',
    properties: {},
    required: [],
  };

  const sortedParams = sortBy(parameters, ['required', 'name']);

  for (const p of sortedParams) {
    if (!p.schema && !p.content) continue;

    const { name, description, required, deprecated, examples, style } = p;

    const paramContent = p.schema ?? p.content;
    let paramSchema = p.schema;
    if (isObject(paramContent) && paramContent !== paramSchema) {
      const paramContentKeys = Object.keys(paramContent);
      if (paramContentKeys.length > 0) {
        paramSchema = paramContent[paramContentKeys[0]].schema
      }
    }

    const paramExamples =
      examples?.map(example => {
        if (isNodeExample(example)) {
          return example.value;
        }

        return example.externalValue;
      }) || [];
    const schemaExamples = paramSchema?.examples;
    const schemaExamplesArray = Array.isArray(schemaExamples) ? schemaExamples : [];

    // TODO (CL): This can be removed when http operations are fixed https://github.com/stoplightio/http-spec/issues/26
    const paramDescription = description || paramSchema?.description;

    const paramDeprecated = deprecated || (paramSchema as any)?.deprecated;
    const paramStyle = style && defaultStyle[parameterType] !== style ? readableStyles[style] || style : undefined;

    schema.properties![p.name] = {
      ...paramSchema,
      description: paramDescription,
      examples: [...paramExamples, ...schemaExamplesArray],
      deprecated: paramDeprecated,
      style: paramStyle,
    };

    if (required) {
      // @ts-expect-error
      schema.required!.push(name);
    }
  }

  return schema;
};
