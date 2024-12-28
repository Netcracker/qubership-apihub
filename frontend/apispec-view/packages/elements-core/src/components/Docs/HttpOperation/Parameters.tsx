import { JsonSchemaViewer } from '@netcracker/qubership-apihub-api-doc-viewer';
import { useOperationSchemaOptionsMode } from '@stoplight/elements';
import { HttpParamStyles, IHttpContent, IHttpParam } from '@stoplight/types';
import type { JSONSchema7Object } from 'json-schema';
import { JsonSchemaViewer as OldJsonSchemaViewer } from 'json-schema-viewer';
import { isObject, sortBy } from 'lodash';
import * as React from 'react';

import { isNodeExample } from '../../../utils/http-spec/examples';
import {useMemo} from "react";

type ParameterKey = string
type ParameterMediaType = string
type ParametersMediaTypeMap = Record<ParameterKey, ParameterMediaType> | undefined

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
  // FIXME 18.06.24 // Get rid of "parametersMediaTypes" when future wonderful AMT+ADV are ready!
  const [schema, parametersMediaTypes] = useMemo(
    () => httpOperationParamsToSchema({ parameters, parameterType }),
    [parameters, parameterType],
  );
  const { schemaViewMode, defaultSchemaDepth, oldRenderer } = useOperationSchemaOptionsMode();

  if (!schema) return null;

  return oldRenderer ? (
    <OldJsonSchemaViewer
      schema={schema}
      schemaViewMode={schemaViewMode}
      defaultExpandedDepth={defaultSchemaDepth}
      disableCrumbs
    />
  ) : (
    <JsonSchemaViewer
      schema={schema}
      displayMode={schemaViewMode}
      expandedDepth={defaultSchemaDepth}
      overriddenKind="parameters"
      topLevelPropsMediaTypes={parametersMediaTypes}
    />
  );
};
Parameters.displayName = 'HttpOperation.Parameters';

const httpOperationParamsToSchema = (
  { parameters, parameterType }: ParametersProps
): [JSONSchema7Object | null, ParametersMediaTypeMap] => {
  if (!parameters || !parameters.length) {
    return [null, undefined];
  }

  const schema = {
    type: 'object',
    properties: {},
    required: [],
  };
  let parametersMediaTypesMap: ParametersMediaTypeMap = undefined

  const sortedParams = sortBy(parameters, ['required', 'name']);

  for (const p of sortedParams) {
    if (!p.schema && !p.content) continue;

    const { name, description, required, deprecated, examples, style } = p;

    const paramContent = p.schema ?? p.content;
    let paramSchema = p.schema;
    if (isObject(paramContent) && paramContent !== paramSchema) {
      const paramContentKeys = Object.keys(paramContent);
      if (paramContentKeys.length > 0) {
        const mediaType = paramContentKeys[0]
        paramSchema = paramContent[mediaType].schema
        parametersMediaTypesMap ??= {}
        parametersMediaTypesMap[p.name] = mediaType
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

  return [schema, parametersMediaTypesMap];
};
